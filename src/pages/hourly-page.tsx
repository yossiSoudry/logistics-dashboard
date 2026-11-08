import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartColumn } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { STATUSES, STATUS_LABELS, hourlyCounts, summarizeByStatus } from "@/logic.js"
import type { DashboardData, ShipmentStatus } from "@/types"

// גוונים של הכחול המוביל, אדום רק לנכשל (SPEC.md, שפה חזותית)
const chartConfig = {
  pending: { label: STATUS_LABELS.pending, color: "var(--status-pending)" },
  in_transit: { label: STATUS_LABELS.in_transit, color: "var(--status-in-transit)" },
  delivered: { label: STATUS_LABELS.delivered, color: "var(--status-delivered)" },
  failed: { label: STATUS_LABELS.failed, color: "var(--status-failed)" },
} satisfies ChartConfig

type Active = "all" | ShipmentStatus

/** Bar Chart - Interactive של shadcn: מריצים עם סכומים בראש הכרטיס (SPEC.md, משלוחים לפי שעה). */
export function HourlyPage({ view }: { view: DashboardData }) {
  const [active, setActive] = useState<Active>("all")
  const rows = hourlyCounts(view.shipments)
  const totals = summarizeByStatus(view.shipments) as Record<ShipmentStatus, number>
  const statuses = STATUSES as ShipmentStatus[]
  const tiles: { key: Active; label: string; value: number; color?: string }[] = [
    { key: "all", label: "הכל", value: view.shipments.length },
    ...statuses.map((st) => ({ key: st as Active, label: STATUS_LABELS[st], value: totals[st], color: chartConfig[st].color })),
  ]
  const shown = active === "all" ? statuses : [active]

  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="flex flex-col items-stretch gap-0 border-b p-0! lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-(--card-spacing) py-4 lg:py-5">
          <CardTitle className="text-sm font-semibold">משלוחים לפי שעה</CardTitle>
          <CardDescription className="text-xs">
            {`לפי שעת יצירה. ${active === "all" ? "מפוצל לפי סטטוס" : `רק ${STATUS_LABELS[active]}`}. השעה המוקדמת בצד ימין.`}
          </CardDescription>
        </div>
        <div className="grid grid-cols-5" role="group" aria-label="בחירת סטטוס לגרף">
          {tiles.map((t) => (
            <button
              key={t.key}
              type="button"
              data-active={active === t.key}
              aria-pressed={active === t.key}
              data-tile={t.key}
              onClick={() => setActive(t.key)}
              className="relative flex min-w-0 flex-col justify-center gap-1 border-t border-s px-2 py-3 text-start transition-colors first:border-s-0 hover:bg-muted/40 data-[active=true]:bg-muted/60 sm:px-4 lg:border-t-0 lg:first:border-s lg:px-5 lg:py-4"
            >
              <span className="flex items-center gap-1.5 truncate text-[0.6875rem] text-muted-foreground sm:text-xs">
                {t.color && <span className="size-2 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />}
                {t.label}
              </span>
              <span className="text-lg leading-none font-bold tabular-nums sm:text-2xl" data-tile-count={t.key}>
                {t.value}
              </span>
              {active === t.key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 py-4 sm:p-(--card-spacing)">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" data-testid="empty-hourly">
            <ChartColumn className="size-8 text-muted-foreground" />
            <p className="font-medium">אין משלוחים בסינון הזה</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full sm:h-96" data-testid="hourly-chart" data-active={active}>
            <BarChart data={rows} margin={{ top: 8, left: 4, right: 4 }} accessibilityLayer>
              <CartesianGrid vertical={false} />
              {/* RTL: הציר הפוך, כך שהשעה המוקדמת מימין */}
              <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />
              <YAxis orientation="right" allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent className="w-40" />} />
              {shown.map((st, i) => (
                <Bar
                  key={st}
                  dataKey={st}
                  stackId="status"
                  fill={`var(--color-${st})`}
                  radius={i === shown.length - 1 ? [4, 4, 0, 0] : 0}
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
