import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkline } from "@/components/dashboard/sparkline"
import { hourlyCounts, timeOf } from "@/logic.js"
import { hrefFor } from "@/lib/routes.js"
import type { Shipment } from "@/types"

const PAD_X = 14

export function HourlyMiniCard({
  shipments,
  now,
  className,
}: {
  shipments: Shipment[]
  now: string
  className?: string
}) {
  const rows = hourlyCounts(shipments)
  return (
    <Card className={className} data-testid="hourly-mini">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">משלוחים לפי שעה</CardTitle>
        <CardDescription className="text-xs">{`סך המשלוחים שנוצרו בכל שעה, עד ${timeOf(now)}`}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <a href={hrefFor("hourly")}>
              לגרף המלא
              <ArrowLeft data-icon="inline-end" />
            </a>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-2">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">אין משלוחים בסינון הזה</p>
        ) : (
          <>
            <Sparkline
              values={rows.map((r) => r.total)}
              labels={rows.map((r) => r.label)}
              dots
              padX={PAD_X}
              height={150}
              label={`משלוחים לפי שעה: ${rows.map((r) => `${r.label} ${r.total}`).join(", ")}`}
            />
            {/* תוויות השעות: המוקדמת מימין, באותו ריווח של הנקודות */}
            <div className="flex justify-between text-[0.6875rem] text-muted-foreground tabular-nums" style={{ paddingInline: PAD_X - 14 }} aria-hidden>
              {rows.map((r, i) => (
                <span key={r.hour} className={i % 2 === 1 ? "w-7 text-center max-sm:invisible" : "w-7 text-center"}>
                  {r.label.slice(0, 2)}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
