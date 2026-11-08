import { ArrowLeft, CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { STATUS_LABELS, STUCK_THRESHOLD_MINUTES, formatDuration } from "@/logic.js"
import { hrefFor } from "@/lib/routes.js"
import { cn } from "@/lib/utils"
import { CountUp, PulseDot, cardHover, enter } from "@/components/dashboard/motion"
import type { Contractor, Shipment } from "@/types"

const PREVIEW = 5

export function StuckPreviewCard({
  stuck,
  contractors,
  className,
  index = 0,
}: {
  stuck: (Shipment & { waitedMinutes: number })[]
  contractors: Contractor[]
  className?: string
  index?: number
}) {
  const names = new Map(contractors.map((c) => [c.id, c.name]))
  return (
    <Card className={cn(cardHover, enter(index).className, className)} style={enter(index).style} data-testid="stuck-preview">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {stuck.length > 0 && <PulseDot />}
          <span>
            תקועים
            {stuck.length > 0 && (
              <span className="tabular-nums" data-stuck-title>
                {" ("}
                <CountUp value={stuck.length} />
                {")"}
              </span>
            )}
          </span>
        </CardTitle>
        <CardDescription className="text-xs">{`ממתינים יותר מ-${formatDuration(STUCK_THRESHOLD_MINUTES)}, הוותיקים קודם`}</CardDescription>
        {stuck.length > 0 && (
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <a href={hrefFor("stuck")} data-testid="stuck-preview-link">
                לכולם
                <ArrowLeft data-icon="inline-end" />
              </a>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {stuck.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-primary" />
            כל המשלוחים הפתוחים בזמן
          </div>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {stuck.slice(0, PREVIEW).map((s) => (
              <li key={s.id} className="flex items-center gap-3" data-stuck-preview={s.id}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                  {s.customer.slice(0, 1)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{s.customer}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    <span dir="ltr">{s.id}</span>
                    {` · ${STATUS_LABELS[s.status]} · ${names.get(s.contractorId) ?? ""}`}
                  </span>
                </div>
                <span className="shrink-0 rounded-full border border-destructive/40 px-2 py-0.5 text-xs font-medium text-destructive tabular-nums">
                  {formatDuration(s.waitedMinutes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
