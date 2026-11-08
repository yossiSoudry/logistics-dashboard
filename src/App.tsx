import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import rawData from "../data/mock-data.json"
import { applyFilters, stuckShipments } from "@/logic.js"
import { breadcrumbFor, hrefFor } from "@/lib/routes.js"
import { useTheme } from "@/hooks/use-theme"
import { useRoute, type RouteId } from "@/hooks/use-route"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { OverviewPage } from "@/pages/overview-page"
import { ShipmentsPage } from "@/pages/shipments-page"
import { StuckPage, type StuckShipment } from "@/pages/stuck-page"
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

const nameOf = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id

export default function App() {
  // הסינון חי כאן, מעל העמודים, ולכן מעבר בין עמודים לא מאפס אותו
  const [filters, setFilters] = useState<Filters>({ warehouseId: "all", contractorId: "all" })
  const { preference, setPreference } = useTheme()
  const route = useRoute()
  const view = useMemo(() => applyFilters(data, filters) as DashboardData, [filters])
  const stuck = useMemo(() => stuckShipments(view.shipments, data.now) as StuckShipment[], [view])
  const crumbs = breadcrumbFor(route) as string[]
  const pageLabel = crumbs[crumbs.length - 1]

  useEffect(() => {
    document.title = `${pageLabel} · לוח בקרה למלאי ולוגיסטיקה`
    window.scrollTo(0, 0)
  }, [route, pageLabel])

  return (
    <SidebarProvider defaultOpen={startOpen}>
      <AppSidebar
        data={data}
        route={route}
        stuckCount={stuck.length}
        filters={filters}
        onFiltersChange={setFilters}
        preference={preference}
        onPreferenceChange={setPreference}
        dataLabel={`נתוני דמה · ${shortDate}`}
      />
      <SidebarInset className="min-w-0">
        {/* הכותרת של sidebar-07: כפתור הסרגל, קו מפריד ופירורי לחם */}
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/85 px-4 py-2 backdrop-blur transition-[min-height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ms-1" aria-label="פתיחה וסגירה של סרגל הצד" />
            <Separator orientation="vertical" className="me-2 data-vertical:h-4 data-vertical:self-auto" />
            <h1 className="sr-only" data-page={route}>{`${pageLabel} · לוח בקרה למלאי ולוגיסטיקה`}</h1>
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.length > 1 && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href={hrefFor("shipments")}>{crumbs[0]}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium" data-testid="breadcrumb-page">{pageLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {filters.warehouseId !== "all" && (
              <FilterChip
                label={`מחסן: ${nameOf(data.warehouses, filters.warehouseId)}`}
                onRemove={() => setFilters({ ...filters, warehouseId: "all" })}
                testId="chip-warehouse"
              />
            )}
            {filters.contractorId !== "all" && (
              <FilterChip
                label={`קבלן: ${nameOf(data.contractors, filters.contractorId)}`}
                onRemove={() => setFilters({ ...filters, contractorId: "all" })}
                testId="chip-contractor"
              />
            )}
            <span className="hidden text-xs text-muted-foreground lg:inline">{dateLabel}</span>
          </div>
        </header>

        {/* SidebarInset הוא כבר <main>, ולכן כאן div ולא main נוסף.
            בלי max-width: התוכן ממלא את כל הרוחב שליד הסרגל בכל מסך (SPEC.md, תצוגה ו-RTL) */}
        <div id="content" className="flex w-full flex-col gap-3 px-3 py-4 sm:px-6 md:gap-4 md:py-6">
          <Page route={route} view={view} stuck={stuck} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** סינון פעיל בכותרת, כדי שגם בטלפון יהיה ברור מה מסונן (SPEC.md, סינון). */
function FilterChip({ label, onRemove, testId }: { label: string; onRemove: () => void; testId: string }) {
  return (
    <span
      className="inline-flex h-7 items-center gap-1 rounded-full border bg-primary/10 ps-3 pe-1 text-xs font-medium text-primary"
      data-testid={testId}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-5 place-items-center rounded-full hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`הסר סינון ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
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
