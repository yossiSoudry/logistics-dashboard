import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"
import { WarehouseSwitcher } from "@/components/dashboard/warehouse-switcher"
import { NavMain } from "@/components/dashboard/nav-main"
import { NavContractors } from "@/components/dashboard/nav-contractors"
import { NavDisplay } from "@/components/dashboard/nav-display"
import type { RouteId } from "@/hooks/use-route"
import type { ThemePreference } from "@/hooks/use-theme"
import type { DashboardData, Filters } from "@/types"

/**
 * בלוק sidebar-07 של shadcn, ממופה ללוח הבקרה (SPEC.md, ניווט):
 * TeamSwitcher -> מחליף מחסן, NavMain -> סקירה + קבוצת משלוחים,
 * NavProjects -> קבלנים, NavUser -> מתג תצוגה.
 * RTL: הסרגל בצד ימין, והתפריטים והטולטיפים נפתחים שמאלה לתוך העמוד.
 * כל התפריטים כאן modal={false}: תפריט ניווט לא נועל את העמוד ולא מסתיר את פס הגלילה (Issue #1).
 */
export function AppSidebar({
  data,
  route,
  stuckCount,
  filters,
  onFiltersChange,
  preference,
  onPreferenceChange,
  dataLabel,
}: {
  data: DashboardData
  route: RouteId
  stuckCount: number
  filters: Filters
  onFiltersChange: (next: Filters) => void
  preference: ThemePreference
  onPreferenceChange: (value: string) => void
  dataLabel: string
}) {
  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader>
        <WarehouseSwitcher
          warehouses={data.warehouses}
          inventory={data.inventory}
          value={filters.warehouseId}
          onChange={(warehouseId) => onFiltersChange({ ...filters, warehouseId })}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain route={route} stuckCount={stuckCount} />
        <NavContractors
          contractors={data.contractors}
          value={filters.contractorId}
          onChange={(contractorId) => onFiltersChange({ ...filters, contractorId })}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavDisplay preference={preference} onChange={onPreferenceChange} dataLabel={dataLabel} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
