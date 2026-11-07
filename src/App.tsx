import { useMemo, useState } from "react"
import { Boxes } from "lucide-react"
import rawData from "../data/mock-data.json"
import { applyFilters } from "@/logic.js"
import { useTheme } from "@/hooks/use-theme"
import { DashboardFilters } from "@/components/dashboard/filters"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { StatusCards } from "@/components/dashboard/status-cards"
import { ContractorsCard } from "@/components/dashboard/contractors-card"
import { InventoryCard } from "@/components/dashboard/inventory-card"
import type { DashboardData, Filters } from "@/types"

const data = rawData as DashboardData

const dateLabel = new Date(data.date).toLocaleDateString("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

export default function App() {
  const [filters, setFilters] = useState<Filters>({ warehouseId: "all", contractorId: "all" })
  const { preference, setPreference } = useTheme()
  const view = useMemo(() => applyFilters(data, filters) as DashboardData, [filters])

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                aria-hidden
              >
                <Boxes className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold sm:text-lg">לוח בקרה למלאי ולוגיסטיקה</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">{dateLabel}</p>
              </div>
            </div>
            <div className="lg:hidden">
              <ThemeToggle preference={preference} onChange={setPreference} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 lg:flex-none">
              <DashboardFilters
                filters={filters}
                warehouses={data.warehouses}
                contractors={data.contractors}
                onChange={setFilters}
              />
            </div>
            <div className="max-lg:hidden">
              <ThemeToggle preference={preference} onChange={setPreference} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <section aria-labelledby="summary-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="summary-title" className="text-sm font-semibold text-muted-foreground">
              משלוחי היום לפי סטטוס
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">{`${view.shipments.length} משלוחים`}</span>
          </div>
          <StatusCards shipments={view.shipments} inventory={view.inventory} />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section aria-label="ביצועי קבלנים" className="min-w-0 lg:col-span-2">
            <ContractorsCard shipments={view.shipments} contractors={data.contractors} />
          </section>
          <section aria-label="מלאי" className="min-w-0 lg:col-span-3">
            <InventoryCard inventory={view.inventory} warehouses={data.warehouses} />
          </section>
        </div>
      </main>
    </div>
  )
}
