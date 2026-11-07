import { Clock, PackageCheck, PackageX, TriangleAlert, Truck } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { STATUSES, STATUS_LABELS, summarizeByStatus, lowStockItems } from "@/logic.js"
import type { InventoryItem, Shipment, ShipmentStatus } from "@/types"

const STYLE: Record<ShipmentStatus, { icon: LucideIcon; tone: string }> = {
  pending: { icon: Clock, tone: "text-chart-3 bg-chart-3/15" },
  in_transit: { icon: Truck, tone: "text-primary bg-primary/12" },
  delivered: { icon: PackageCheck, tone: "text-chart-2 bg-chart-2/15" },
  failed: { icon: PackageX, tone: "text-destructive bg-destructive/12" },
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  countKey,
  hint,
  className,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone: string
  countKey: string
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", tone)} aria-hidden>
          <Icon className="size-4.5" />
        </span>
      </CardHeader>
      <CardContent className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums" data-count={countKey}>
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>}
      </CardContent>
    </Card>
  )
}

export function StatusCards({
  shipments,
  inventory,
}: {
  shipments: Shipment[]
  inventory: InventoryItem[]
}) {
  const summary = summarizeByStatus(shipments)
  const low = lowStockItems(inventory).length
  const total = shipments.length
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4 xl:grid-cols-5">
      {(STATUSES as ShipmentStatus[]).map((st, i) => (
        <StatCard
          key={st}
          // טאבלט: שלושה בשורה הראשונה, שניים רחבים בשנייה, בלי חור
          className={i < 3 ? "sm:col-span-2 xl:col-span-1" : "sm:col-span-3 xl:col-span-1"}
          label={STATUS_LABELS[st]}
          value={summary[st]}
          icon={STYLE[st].icon}
          tone={STYLE[st].tone}
          countKey={st}
          hint={total ? `${Math.round((summary[st] / total) * 100)}%` : undefined}
        />
      ))}
      <StatCard
        label="פריטים מתחת למינימום"
        value={low}
        icon={TriangleAlert}
        tone="text-destructive bg-destructive/12"
        countKey="low-stock"
        className={cn("col-span-2 sm:col-span-3 xl:col-span-1", low > 0 && "ring-destructive/40")}
      />
    </div>
  )
}
