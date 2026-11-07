import { StatusCards } from "@/components/dashboard/status-cards"
import { ContractorsCard } from "@/components/dashboard/contractors-card"
import { InventoryCard } from "@/components/dashboard/inventory-card"
import type { DashboardData } from "@/types"

export function OverviewPage({ view, data }: { view: DashboardData; data: DashboardData }) {
  return (
    <>
      <section aria-labelledby="summary-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="summary-title" className="text-sm font-semibold text-muted-foreground">
            משלוחי היום לפי סטטוס
          </h2>
          <span className="text-sm text-muted-foreground tabular-nums">{`${view.shipments.length} משלוחים`}</span>
        </div>
        <StatusCards shipments={view.shipments} inventory={view.inventory} />
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <section aria-label="ביצועי קבלנים" className="min-w-0 xl:col-span-2">
          <ContractorsCard shipments={view.shipments} contractors={data.contractors} />
        </section>
        <section aria-label="מלאי" className="min-w-0 xl:col-span-3">
          <InventoryCard inventory={view.inventory} warehouses={data.warehouses} />
        </section>
      </div>
    </>
  )
}
