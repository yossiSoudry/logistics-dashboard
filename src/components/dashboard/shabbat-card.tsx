import { Flame, MapPinOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatTimeLeft, shabbatRows, timeOf } from "@/logic.js"
import { cardHover, enter } from "@/components/dashboard/motion"
import type { ShabbatEntry } from "@/hooks/use-shabbat"
import type { Shipment, Warehouse } from "@/types"

const dayLabel = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" })

type Row = ReturnType<typeof shabbatRows>[number] & {
  stop?: { kind: string; title: string; shabbat: boolean; candles: string; havdalah: string | null }
  minutesLeft?: number
}

/**
 * עד כניסת שבת (SPEC.md, גמור / עד כניסת שבת). מקור חיצוני: Hebcal, דרך /api/shabbat.
 * אם Hebcal לא זמין, רק הכרטיס הזה אומר זאת; שאר הלוח ממשיך.
 */
export function ShabbatCard({
  warehouses,
  stops,
  shipments,
  now,
  warehouseId,
  onRetry,
  className,
  index = 0,
}: {
  warehouses: Warehouse[]
  stops: Record<string, ShabbatEntry>
  shipments: Shipment[]
  now: string
  warehouseId: string
  onRetry: () => void
  className?: string
  index?: number
}) {
  const rows = shabbatRows(warehouses, stops, shipments, now, warehouseId) as Row[]
  const failed = rows.some((r) => r.state === "error")

  return (
    <Card className={cn(cardHover, enter(index).className, className)} style={enter(index).style} data-testid="shabbat-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Flame className="size-4 text-primary" aria-hidden />
          עד כניסת שבת
        </CardTitle>
        <CardDescription className="text-xs">{`הדלקת הנרות הקרובה בעיר של כל מחסן, נכון ל-${timeOf(now)}, ומשלוחים שעוד פתוחים`}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3" data-shabbat-row={r.id} data-state={r.state}>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                {r.name.slice(0, 1)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {r.name}
                    {r.city && <span className="font-normal text-muted-foreground">{` · ${r.city}`}</span>}
                  </span>
                  {r.state === "ready" && r.minutesLeft !== undefined && (
                    <span className="shrink-0 text-sm font-semibold text-primary tabular-nums" data-time-left>
                      {formatTimeLeft(r.minutesLeft)}
                    </span>
                  )}
                </div>
                {r.state === "ready" && r.stop && (
                  <>
                    <span className="text-xs text-foreground/80" data-stop-title>
                      {`${r.stop.kind === "yomtov" ? "ערב חג" : "ערב שבת"} · ${r.stop.title}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {`${dayLabel(r.stop.candles)} · נרות `}
                      <span className="tabular-nums" data-candles>{timeOf(r.stop.candles)}</span>
                      {r.stop.havdalah && (
                        <>
                          {" · הבדלה "}
                          <span className="tabular-nums">{timeOf(r.stop.havdalah)}</span>
                        </>
                      )}
                    </span>
                  </>
                )}
                {r.state === "loading" && <Skeleton className="mt-1 h-3 w-40" />}
                {r.state === "noLocation" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPinOff className="size-3" aria-hidden />
                    אין מיקום למחסן ב-Airtable
                  </span>
                )}
                {r.state === "error" && <span className="text-xs text-destructive">זמני השבת לא זמינים כרגע</span>}
                <span className="text-xs text-muted-foreground tabular-nums" data-open={r.open}>
                  {r.open === 0 ? "אין משלוחים פתוחים" : `${r.open} משלוחים פתוחים לפני העצירה`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {"זמנים: "}
          <a href="https://www.hebcal.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground" data-testid="hebcal-credit">
            Hebcal.com
          </a>
          {" (CC BY 4.0)"}
        </span>
        {failed && (
          <Button variant="ghost" size="sm" onClick={onRetry} data-testid="shabbat-retry">
            <RefreshCw data-icon="inline-start" />
            נסה שוב
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
