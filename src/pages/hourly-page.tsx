import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartColumn } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { STATUSES, STATUS_LABELS, hourlyCounts } from "@/logic.js"
import type { DashboardData, ShipmentStatus } from "@/types"

const chartConfig = {
  pending: { label: STATUS_LABELS.pending, color: "var(--chart-3)" },
  in_transit: { label: STATUS_LABELS.in_transit, color: "var(--chart-1)" },
  delivered: { label: STATUS_LABELS.delivered, color: "var(--chart-2)" },
  failed: { label: STATUS_LABELS.failed, color: "var(--destructive)" },
} satisfies ChartConfig

export function HourlyPage({ view }: { view: DashboardData }) {
  const rows = hourlyCounts(view.shipments)
  const statuses = STATUSES as ShipmentStatus[]

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">משלוחים לפי שעה</CardTitle>
        <CardDescription>
          {`${view.shipments.length} משלוחים לפי שעת יצירה, מפוצלים לפי סטטוס. השעה המוקדמת בצד ימין.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" data-testid="empty-hourly">
            <ChartColumn className="size-8 text-muted-foreground" />
            <p className="font-medium">אין משלוחים בסינון הזה</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full sm:h-96" data-testid="hourly-chart">
            <BarChart data={rows} margin={{ top: 8, left: 0, right: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} />
              {/* RTL: הציר הפוך, כך שהשעה המוקדמת מימין */}
              <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tickMargin={8} minTickGap={4} />
              <YAxis orientation="right" allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent />} />
              {/* Recharts ממיין את המקרא לפי שם; כאן הוא בסדר הסטטוסים: ממתין, בדרך, נמסר, נכשל */}
              <ChartLegend
                content={<ChartLegendContent />}
                itemSorter={(item) => statuses.indexOf(item.dataKey as ShipmentStatus)}
              />
              {statuses.map((st, i) => (
                <Bar
                  key={st}
                  dataKey={st}
                  stackId="status"
                  fill={`var(--color-${st})`}
                  radius={i === statuses.length - 1 ? [6, 6, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
