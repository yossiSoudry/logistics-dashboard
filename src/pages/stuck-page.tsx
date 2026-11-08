import { CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { STUCK_THRESHOLD_MINUTES, formatDuration, timeOf } from "@/logic.js"
import type { DashboardData, Shipment } from "@/types"
import { CountUp, enter } from "@/components/dashboard/motion"

export type StuckShipment = Shipment & { waitedMinutes: number }

export function StuckPage({ stuck, data }: { stuck: StuckShipment[]; data: DashboardData }) {
  const warehouse = new Map(data.warehouses.map((w) => [w.id, w.name]))
  const contractor = new Map(data.contractors.map((c) => [c.id, c.name]))
  const longest = stuck[0]?.waitedMinutes ?? 0

  return (
    <Card className={cn("min-w-0", enter(0).className)} style={enter(0).style}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          {stuck.length > 0 ? (
            <>
              <span className="tabular-nums" data-stuck-title>
                <CountUp value={stuck.length} />
              </span>
              {" משלוחים תקועים"}
            </>
          ) : (
            "אין משלוחים תקועים"
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {`ממתין או בדרך יותר מ-${formatDuration(STUCK_THRESHOLD_MINUTES)}, נכון ל-${timeOf(data.now)}. ממוין מההמתנה הארוכה ביותר.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stuck.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center" data-testid="empty-stuck">
            <CircleCheck className="size-8 text-primary" />
            <p className="font-medium">כל המשלוחים הפתוחים בזמן</p>
            <p className="text-sm text-muted-foreground">אין משלוח שממתין יותר מהסף בסינון הנוכחי.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-3">ממתין</TableHead>
                <TableHead>מספר</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>קבלן</TableHead>
                <TableHead>מחסן</TableHead>
                <TableHead className="pe-3 text-center">נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stuck.map((s) => (
                <TableRow key={s.id} data-stuck={s.id} data-waited={s.waitedMinutes} className="motion-safe:animate-in motion-safe:fade-in duration-300">
                  <TableCell className="ps-3">
                    <div className="flex min-w-24 flex-col gap-1">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          s.waitedMinutes >= longest * 0.75 && "text-destructive",
                        )}
                      >
                        {formatDuration(s.waitedMinutes)}
                      </span>
                      <span className="h-1 w-full overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                        <span
                          className="motion-grow-x block h-full rounded-full bg-destructive/70"
                          style={{ width: `${Math.round((s.waitedMinutes / longest) * 100)}%` }}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
                    <span className="block text-start">{s.id}</span>
                  </TableCell>
                  <TableCell className="font-medium">{s.customer}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contractor.get(s.contractorId)}</TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.get(s.warehouseId)}</TableCell>
                  <TableCell className="pe-3 text-center tabular-nums">{timeOf(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
