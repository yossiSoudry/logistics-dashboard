import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import rawData from "../data/mock-data.json"
import { applyFilters, stuckShipments } from "@/logic.js"
import { ROUTES } from "@/lib/routes.js"
import { useTheme } from "@/hooks/use-theme"
import { useRoute, type RouteId } from "@/hooks/use-route"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { DashboardFilters } from "@/components/dashboard/filters"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { OverviewPage } from "@/pages/overview-page"
import { ShipmentsPage } from "@/pages/shipments-page"
import { StuckPage, type StuckShipment } from "@/pages/stuck-page"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardData, Filters } from "@/types"

const data = rawData as DashboardData

// הגרף (Recharts) נטען רק כשנכנסים לעמוד, כדי שהסקירה תיטען מהר בטלפון
const HourlyPage = lazy(() => import("@/pages/hourly-page").then((m) => ({ default: m.HourlyPage })))

const dateLabel = new Date(data.date).toLocaleDateString("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

const shortDate = new Date(data.date).toLocaleDateString("he-IL", { day: "numeric", month: "long" })

// בטאבלט הסרגל מתחיל מכווץ לאייקונים, כדי להשאיר מקום לתוכן
const startOpen = typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches

export default function App() {
  // הסינון חי כאן, מעל העמודים, ולכן מעבר בין עמודים לא מאפס אותו
  const [filters, setFilters] = useState<Filters>({ warehouseId: "all", contractorId: "all" })
  const { preference, setPreference } = useTheme()
  const route = useRoute()
  const view = useMemo(() => applyFilters(data, filters) as DashboardData, [filters])
  const stuck = useMemo(() => stuckShipments(view.shipments, data.now) as StuckShipment[], [view])
  const label = ROUTES.find((r) => r.id === route)?.label ?? ""

  useEffect(() => {
    document.title = `${label} · לוח בקרה למלאי ולוגיסטיקה`
    window.scrollTo(0, 0)
  }, [route, label])

  return (
    <SidebarProvider defaultOpen={startOpen}>
      <AppSidebar route={route} stuckCount={stuck.length} dateLabel={shortDate} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ms-1" aria-label="פתיחה וסגירה של סרגל הצד" />
                <Separator orientation="vertical" className="me-1 data-[orientation=vertical]:h-6" />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold" data-page={route}>
                    {label}
                  </h1>
                  <p className="text-xs text-muted-foreground">{dateLabel}</p>
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

        {/* SidebarInset הוא כבר <main>, ולכן כאן div ולא main נוסף */}
        <div id="content" className="flex w-full max-w-7xl flex-col gap-3 px-3 py-4 sm:px-6 md:gap-4 md:py-6">
          <Page route={route} view={view} stuck={stuck} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Page({ route, view, stuck }: { route: RouteId; view: DashboardData; stuck: StuckShipment[] }) {
  switch (route) {
    case "shipments":
      return <ShipmentsPage view={view} data={data} />
    case "stuck":
      return <StuckPage stuck={stuck} data={data} />
    case "hourly":
      return (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <HourlyPage view={view} />
        </Suspense>
      )
    default:
      return <OverviewPage view={view} data={data} stuck={stuck} />
  }
}
