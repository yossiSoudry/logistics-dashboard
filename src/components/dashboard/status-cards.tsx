import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { Sparkline } from "@/components/dashboard/sparkline"
import { CountUp, cardHover, enter } from "@/components/dashboard/motion"
import { BAR_GROW_MS, BAR_STAGGER_MS, staggerDelay } from "@/lib/motion.js"
import { cumulative } from "@/lib/sparkline.js"
import {
  STATUSES,
  STATUS_LABELS,
  summarizeByStatus,
  lowStockItems,
  hourlyCounts,
  isLowStock,
} from "@/logic.js"
import type { InventoryItem, Shipment, ShipmentStatus } from "@/types"

export function StatusCards({
  shipments,
  inventory,
}: {
  shipments: Shipment[]
  inventory: InventoryItem[]
}) {
  const summary = summarizeByStatus(shipments)
  const hours = hourlyCounts(shipments)
  const low = lowStockItems(inventory).length
  const total = shipments.length

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 md:gap-4 xl:grid-cols-5">
      {(STATUSES as ShipmentStatus[]).map((st, i) => (
        <Card
          key={st}
          // טאבלט: שלושה בשורה הראשונה, שניים רחבים בשנייה, בלי חור
          className={cn("gap-3 pb-0", cardHover, enter(i).className, i < 3 ? "sm:col-span-2 xl:col-span-1" : "sm:col-span-3 xl:col-span-1")}
          style={enter(i).style}
        >
          <CardHeader className="gap-1">
            <CardDescription className="text-xs font-medium">{STATUS_LABELS[st]}</CardDescription>
            <div
              className={cn("text-2xl font-bold tracking-tight tabular-nums", st === "failed" && summary[st] > 0 && "text-destructive")}
              data-count={st}
            >
              <CountUp value={summary[st]} />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {total ? `${Math.round((summary[st] / total) * 100)}% מהמשלוחים` : "אין משלוחים"}
            </p>
          </CardHeader>
          <Sparkline
            // מצטבר: כמה הצטברו עד כל שעה. הקו מסתיים במספר שבכרטיס.
            values={cumulative(hours.map((h) => h[st]))}
            labels={hours.map((h) => h.label)}
            color={st === "failed" ? "var(--destructive)" : "var(--primary)"}
            height={52}
            label={`${STATUS_LABELS[st]}, מצטבר לפי שעה`}
          />
        </Card>
      ))}

      <Card className={cn("col-span-2 gap-3 sm:col-span-3 xl:col-span-1", cardHover, enter(4).className)} style={enter(4).style}>
        <CardHeader className="gap-1">
          <CardDescription className="text-xs font-medium">פריטים מתחת למינימום</CardDescription>
          <div className={cn("text-2xl font-bold tracking-tight tabular-nums", low > 0 && "text-destructive")} data-count="low-stock">
            <CountUp value={low} />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{`מתוך ${inventory.length} פריטים במלאי`}</p>
        </CardHeader>
        {/* פס אחד לכל פריט: אדום = מתחת למינימום */}
        <div key={inventory.map((i) => i.sku).join(",")} className="mt-auto flex h-9 items-end gap-0.5 px-(--card-spacing)" aria-hidden>
          {inventory.map((item, idx) => (
            <span
              key={item.sku}
              style={{ animationDelay: `${staggerDelay(idx, BAR_STAGGER_MS, BAR_GROW_MS)}ms` }}
              className={cn(
                "motion-grow-y flex-1 rounded-sm",
                isLowStock(item) ? "h-full bg-destructive" : "h-1/2 bg-foreground/15",
              )}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
