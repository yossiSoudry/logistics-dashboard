import { Suspense, lazy } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCards } from "@/components/dashboard/status-cards"
import { InventoryCard } from "@/components/dashboard/inventory-card"
import { StuckPreviewCard } from "@/components/dashboard/stuck-preview-card"
import type { DashboardData, Shipment } from "@/types"

// הגרפים (Recharts) נטענים בעצלות, כך שכרטיסי הסטטוס, התקועים והמלאי מצוירים מיד
const charts = () => import("@/components/dashboard/overview-charts")
const HourlyMiniCard = lazy(() => charts().then((m) => ({ default: m.HourlyMiniCard })))
const ContractorsChartCard = lazy(() => charts().then((m) => ({ default: m.ContractorsChartCard })))
const StockBalanceCard = lazy(() => charts().then((m) => ({ default: m.StockBalanceCard })))

function ChartSkeleton({ className, height }: { className?: string; height: number }) {
  return <Skeleton className={className} style={{ height }} />
}

/**
 * רשת ווידג'טים (SPEC.md, סקירה). בטלפון ובטאבלט: עמודה אחת, התקועים קודם.
 * ממסך רחב: עמודה צרה מימין (תקועים, קבלנים, מלאי מול מינימום) ועמודה רחבה משמאל (שעות, טבלת מלאי).
 */
export function OverviewPage({
  view,
  data,
  stuck,
}: {
  view: DashboardData
  data: DashboardData
  stuck: (Shipment & { waitedMinutes: number })[]
}) {
  return (
    <>
      <section aria-label="משלוחי היום לפי סטטוס">
        <StatusCards shipments={view.shipments} inventory={view.inventory} />
      </section>

      {/* שתי עמודות עצמאיות (מייסונרי), בלי שורות גריד משותפות שיוצרות חורים */}
      <div className="grid items-start gap-3 md:gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <StuckPreviewCard stuck={stuck} contractors={data.contractors} />
          <Suspense fallback={<ChartSkeleton className="rounded-xl" height={290} />}>
            <ContractorsChartCard shipments={view.shipments} contractors={data.contractors} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton className="rounded-xl" height={330} />}>
            <StockBalanceCard inventory={view.inventory} warehouses={data.warehouses} />
          </Suspense>
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:gap-4 xl:col-span-2">
          <Suspense fallback={<ChartSkeleton className="rounded-xl" height={360} />}>
            <HourlyMiniCard shipments={view.shipments} now={data.now} />
          </Suspense>
          <InventoryCard inventory={view.inventory} warehouses={data.warehouses} />
        </div>
      </div>
    </>
  )
}
