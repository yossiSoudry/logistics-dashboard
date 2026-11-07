import { cn } from "@/lib/utils"
import { STATUS_LABELS } from "@/logic.js"
import type { ShipmentStatus } from "@/types"

// גוונים של הכחול המוביל; אדום רק לנכשל (SPEC.md, שפה חזותית)
export const STATUS_COLOR: Record<ShipmentStatus, string> = {
  pending: "var(--status-pending)",
  in_transit: "var(--status-in-transit)",
  delivered: "var(--status-delivered)",
  failed: "var(--status-failed)",
}

export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem]",
        status === "failed" ? "font-medium text-destructive" : "text-foreground",
        className,
      )}
      data-status={status}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}
