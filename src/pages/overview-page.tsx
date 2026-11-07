import { StatusCards } from "@/components/dashboard/status-cards"
import { ContractorsCard } from "@/components/dashboard/contractors-card"
import { InventoryCard } from "@/components/dashboard/inventory-card"
import { StuckPreviewCard } from "@/components/dashboard/stuck-preview-card"
import { HourlyMiniCard } from "@/components/dashboard/hourly-mini-card"
import type { DashboardData, Shipment } from "@/types"

/**
 * רשת ווידג'טים (SPEC.md, סקירה). בטלפון ובטאבלט: עמודה אחת, התקועים קודם.
 * ממסך רחב: שלוש עמודות; הצרה מימין (תקועים, קבלנים), הרחבה משמאל (שעות, מלאי).
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

      <div className="grid gap-3 md:gap-4 xl:grid-cols-3">
        <StuckPreviewCard stuck={stuck} contractors={data.contractors} className="min-w-0 xl:col-start-1 xl:row-start-1" />
        <HourlyMiniCard shipments={view.shipments} now={data.now} className="min-w-0 xl:col-span-2 xl:col-start-2 xl:row-start-1" />
        <ContractorsCard
          shipments={view.shipments}
          contractors={data.contractors}
          className="min-w-0 xl:col-start-1 xl:row-start-2 xl:self-start"
        />
        <InventoryCard inventory={view.inventory} warehouses={data.warehouses} className="min-w-0 xl:col-span-2 xl:col-start-2 xl:row-start-2" />
      </div>
    </>
  )
}
