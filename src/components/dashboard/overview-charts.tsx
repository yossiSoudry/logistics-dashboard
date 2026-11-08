// שלושת הגרפים של הסקירה, בסגנון ה-Bar Charts של shadcn (SPEC.md, סקירה).
// המודול נטען בעצלות מעמוד הסקירה, כדי ש-Recharts לא יעכב את הציור הראשון.
import { ArrowLeft } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { contractorPerformance, hourlyCounts, peakHour, stockBalance, timeOf } from "@/logic.js"
import { hrefFor } from "@/lib/routes.js"
import { cn } from "@/lib/utils"
import type { Contractor, InventoryItem, Shipment, Warehouse } from "@/types"

// ---------------------------------------------------------------------------
// משלוחים לפי שעה (Bar Chart - Label)

const hourlyConfig = { total: { label: "משלוחים", color: "var(--primary)" } } satisfies ChartConfig

export function HourlyMiniCard({ shipments, now, className }: { shipments: Shipment[]; now: string; className?: string }) {
  const rows = hourlyCounts(shipments) as { hour: number; label: string; total: number }[]
  const peak = peakHour(rows) as { label: string; total: number; ties: number } | null
  return (
    <Card className={className} data-testid="hourly-mini">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">משלוחים לפי שעה</CardTitle>
        <CardDescription className="text-xs">{`סך המשלוחים שנוצרו בכל שעה, עד ${timeOf(now)}`}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <a href={hrefFor("hourly")}>
              לגרף המלא
              <ArrowLeft data-icon="inline-end" />
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">אין משלוחים בסינון הזה</p>
        ) : (
          <ChartContainer config={hourlyConfig} className="aspect-auto h-52 w-full" data-testid="hourly-mini-chart">
            <BarChart accessibilityLayer data={rows} margin={{ top: 24, left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              {/* RTL: השעה המוקדמת מימין */}
              <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => v.slice(0, 2)} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={8} isAnimationActive={false}>
                <LabelList position="top" offset={8} className="fill-foreground" fontSize={12} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {peak && (
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium" data-testid="peak-hour">
            {`השעה העמוסה ביותר: ${peak.label} · ${peak.total} משלוחים`}
          </div>
          <div className="text-xs text-muted-foreground">
            {peak.ties > 1 ? `ועוד ${peak.ties - 1} שעות באותו עומס` : "שעה אחת בשיא"}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ביצועי קבלנים (Bar Chart - Custom Label)

type LabelProps = { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: number | string }

/**
 * תווית לעמודה אופקית ב-RTL. עם ציר הפוך Recharts מחליף את המשמעות של insideRight/left
 * ושובר טקסט לשורות, ולכן המיקום מחושב מהגאומטריה של העמודה עצמה.
 * start = בתוך העמודה, בצד שבו היא מתחילה (ימין). end = מחוץ לעמודה, בקצה שלה (שמאל).
 */
function RtlBarLabel({ place, className, ...props }: LabelProps & { place: "start" | "end"; className?: string }) {
  const x = Number(props.x)
  const w = Number(props.width)
  const left = Math.min(x, x + w)
  const right = Math.max(x, x + w)
  const cy = Number(props.y) + Number(props.height) / 2
  return (
    <text
      x={place === "start" ? right - 10 : left - 8}
      y={cy}
      textAnchor="end"
      dominantBaseline="central"
      fontSize={12}
      className={className}
    >
      {props.value}
    </text>
  )
}

const contractorsConfig = {
  rate: { label: "אחוז מסירה", color: "var(--primary)" },
  label: { color: "var(--primary-foreground)" },
} satisfies ChartConfig

export function ContractorsChartCard({
  shipments,
  contractors,
  className,
}: {
  shipments: Shipment[]
  contractors: Contractor[]
  className?: string
}) {
  const rows = (contractorPerformance(shipments, contractors) as { id: string; name: string; total: number; delivered: number; rate: number }[])
    .sort((a, b) => b.total - a.total)
    .map((r) => ({ ...r, end: `${r.rate}% · ${r.delivered}/${r.total}` }))
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">ביצועי קבלנים היום</CardTitle>
        <CardDescription className="text-xs">אחוז המסירה, ונמסרו מתוך סך המשלוחים של כל קבלן</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">אין משלוחים לקבלנים בסינון הזה</p>
        ) : (
          <>
            <ChartContainer config={contractorsConfig} className="aspect-auto w-full" style={{ height: rows.length * 46 + 4 }} data-testid="contractors-chart">
              <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 76, right: 0, top: 2, bottom: 2 }}>
                <YAxis dataKey="name" type="category" hide />
                {/* RTL: ציר הפוך, העמודות מתחילות מימין */}
                <XAxis dataKey="rate" type="number" hide reversed domain={[0, "dataMax"]} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="rate" fill="var(--color-rate)" radius={6} barSize={34} isAnimationActive={false}>
                  <LabelList dataKey="name" content={<RtlBarLabel place="start" className="fill-(--color-label) font-medium" />} />
                  <LabelList dataKey="end" content={<RtlBarLabel place="end" className="fill-foreground tabular-nums" />} />
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="sr-only">
              {rows.map((r) => (
                <li key={r.id} data-contractor={r.id}>{`${r.name}: ${r.delivered} נמסרו מתוך ${r.total}, ${r.rate}%`}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// מלאי מול מינימום (Bar Chart - Negative)

type Balance = { sku: string; name: string; warehouseId: string; quantity: number; minimum: number; diff: number }

const stockConfig = { diff: { label: "הפרש מהמינימום", color: "var(--primary)" } } satisfies ChartConfig

function StockTooltip({ active, payload, names }: { active?: boolean; payload?: { payload: Balance }[]; names: Map<string, string> }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const short = r.diff < 0
  return (
    <div className="grid min-w-36 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{r.name}</div>
      <div className="text-muted-foreground">{names.get(r.warehouseId)}</div>
      <div className="flex justify-between gap-4 tabular-nums">
        <span className="text-muted-foreground">כמות / מינימום</span>
        <span>{`${r.quantity} / ${r.minimum}`}</span>
      </div>
      <div className={cn("flex justify-between gap-4 font-medium tabular-nums", short ? "text-destructive" : "text-primary")}>
        <span>{short ? "חוסר" : "עודף"}</span>
        <span dir="ltr">{r.diff > 0 ? `+${r.diff}` : r.diff}</span>
      </div>
    </div>
  )
}

/** תווית מתחת לעמודות החוסר בלבד, כדי ש-20 עמודות לא יהיו עמוסות מספרים. */
function ShortageLabel(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: number | string }) {
  const value = Number(props.value)
  if (!(value < 0)) return null
  const x = Number(props.x) + Number(props.width) / 2
  const bottom = Math.max(Number(props.y), Number(props.y) + Number(props.height))
  return (
    <text x={x} y={bottom + 13} textAnchor="middle" fontSize={11} className="fill-destructive font-medium" direction="ltr">
      {value}
    </text>
  )
}

export function StockBalanceCard({
  inventory,
  warehouses,
  className,
}: {
  inventory: InventoryItem[]
  warehouses: Warehouse[]
  className?: string
}) {
  const rows = stockBalance(inventory) as Balance[]
  const names = new Map(warehouses.map((w) => [w.id, w.name]))
  const short = rows.filter((r) => r.diff < 0).length
  return (
    <Card className={className} data-testid="stock-balance">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">מלאי מול מינימום</CardTitle>
        <CardDescription className="text-xs">
          עודף מעל הקו בכחול, חוסר מתחתיו באדום. החוסרים הגדולים מימין.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">אין פריטים להצגה</p>
        ) : (
          <>
            <ChartContainer config={stockConfig} className="aspect-auto h-52 w-full" data-testid="stock-balance-chart">
              <BarChart accessibilityLayer data={rows} margin={{ top: 8, bottom: 18, left: 4, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" hide reversed />
                <ReferenceLine y={0} stroke="var(--border)" />
                <ChartTooltip cursor={false} content={<StockTooltip names={names} />} />
                <Bar dataKey="diff" radius={4} isAnimationActive={false}>
                  <LabelList dataKey="diff" content={<ShortageLabel />} />
                  {rows.map((r) => (
                    <Cell key={r.sku} fill={r.diff < 0 ? "var(--destructive)" : "var(--primary)"} data-balance={r.diff} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="sr-only" data-testid="stock-balance-list">
              {rows.map((r) => (
                <li key={r.sku} data-balance={r.diff}>{`${r.name}: ${r.quantity} מול מינימום ${r.minimum}`}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <span className={short > 0 ? "font-medium text-destructive" : undefined}>{`${short} פריטים בחוסר`}</span>
        <span>{` · ${rows.length - short} בגובה המינימום או מעליו`}</span>
      </CardFooter>
    </Card>
  )
}
