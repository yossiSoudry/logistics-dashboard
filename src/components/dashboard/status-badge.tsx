import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS } from "@/logic.js"
import type { ShipmentStatus } from "@/types"

const TONE: Record<ShipmentStatus, string> = {
  pending: "bg-chart-3/15 text-amber-700 dark:text-chart-3",
  in_transit: "bg-primary/12 text-primary",
  delivered: "bg-chart-2/15 text-emerald-700 dark:text-chart-2",
  failed: "bg-destructive/12 text-destructive",
}

export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(TONE[status], className)} data-status={status}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
