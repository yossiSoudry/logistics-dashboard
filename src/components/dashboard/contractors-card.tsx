import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { contractorPerformance } from "@/logic.js"
import type { Contractor, Shipment } from "@/types"

export function ContractorsCard({
  shipments,
  contractors,
}: {
  shipments: Shipment[]
  contractors: Contractor[]
}) {
  const rows = contractorPerformance(shipments, contractors).sort((a, b) => b.total - a.total)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">ביצועי קבלנים היום</CardTitle>
        <CardDescription>משלוחים ומסירות לכל קבלן שעובד היום</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-(--card-spacing)">קבלן</TableHead>
              <TableHead className="text-center">משלוחים</TableHead>
              <TableHead className="text-center">נמסרו</TableHead>
              <TableHead className="pe-(--card-spacing)">אחוז מסירה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  אין משלוחים לקבלנים בסינון הזה
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} data-contractor={r.id}>
                  <TableCell className="ps-(--card-spacing) font-medium">{r.name}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.total}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.delivered}</TableCell>
                  <TableCell className="pe-(--card-spacing)">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={r.rate}
                        className="h-1.5 w-16 bg-foreground/10 sm:w-24 *:bg-chart-2"
                        aria-label={`אחוז מסירה ${r.rate}%`}
                      />
                      <span className="w-10 text-xs text-muted-foreground tabular-nums">{r.rate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
