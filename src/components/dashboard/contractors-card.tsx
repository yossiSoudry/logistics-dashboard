import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { contractorPerformance } from "@/logic.js"
import type { Contractor, Shipment } from "@/types"

export function ContractorsCard({
  shipments,
  contractors,
  className,
}: {
  shipments: Shipment[]
  contractors: Contractor[]
  className?: string
}) {
  const rows = contractorPerformance(shipments, contractors).sort((a, b) => b.total - a.total)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">ביצועי קבלנים היום</CardTitle>
        <CardDescription className="text-xs">אחוז המסירה מתוך המשלוחים של כל קבלן</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">אין משלוחים לקבלנים בסינון הזה</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((r) => (
              <li key={r.id} data-contractor={r.id} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                  {r.name.slice(0, 1)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    <span className="text-sm font-semibold tabular-nums">{`${r.rate}%`}</span>
                  </div>
                  <Progress value={r.rate} className="h-1.5 bg-foreground/10" aria-label={`אחוז מסירה ${r.rate}%`} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {`${r.delivered} נמסרו מתוך ${r.total} משלוחים`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
