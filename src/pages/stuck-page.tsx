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

export type StuckShipment = Shipment & { waitedMinutes: number }

export function StuckPage({ stuck, data }: { stuck: StuckShipment[]; data: DashboardData }) {
  const warehouse = new Map(data.warehouses.map((w) => [w.id, w.name]))
  const contractor = new Map(data.contractors.map((c) => [c.id, c.name]))
  const longest = stuck[0]?.waitedMinutes ?? 0

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {stuck.length > 0 ? `${stuck.length} משלוחים תקועים` : "אין משלוחים תקועים"}
        </CardTitle>
        <CardDescription>
          {`ממתין או בדרך יותר מ-${formatDuration(STUCK_THRESHOLD_MINUTES)}, נכון ל-${timeOf(data.now)}. ממוין מההמתנה הארוכה ביותר.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {stuck.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center" data-testid="empty-stuck">
            <CircleCheck className="size-8 text-chart-2" />
            <p className="font-medium">כל המשלוחים הפתוחים בזמן</p>
            <p className="text-sm text-muted-foreground">אין משלוח שממתין יותר מהסף בסינון הנוכחי.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-(--card-spacing)">ממתין</TableHead>
                <TableHead>מספר</TableHead>
                <TableHead>לקוח</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>קבלן</TableHead>
                <TableHead>מחסן</TableHead>
                <TableHead className="pe-(--card-spacing) text-center">נוצר</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stuck.map((s) => (
                <TableRow key={s.id} data-stuck={s.id} data-waited={s.waitedMinutes}>
                  <TableCell className="ps-(--card-spacing)">
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
                          className="block h-full rounded-full bg-destructive/70"
                          style={{ width: `${Math.round((s.waitedMinutes / longest) * 100)}%` }}
                        />
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    <span className="block text-start">{s.id}</span>
                  </TableCell>
                  <TableCell className="font-medium">{s.customer}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contractor.get(s.contractorId)}</TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.get(s.warehouseId)}</TableCell>
                  <TableCell className="pe-(--card-spacing) text-center tabular-nums">{timeOf(s.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
