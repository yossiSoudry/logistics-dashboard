import { FilterX, Hourglass, MoreHorizontal, Package, Truck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { toggleContractor } from "@/logic.js"
import { hrefFor } from "@/lib/routes.js"
import type { Contractor } from "@/types"

/** ה-NavProjects של sidebar-07, כרשימת קבלנים שמסננת את הלוח (SPEC.md, סינון). */
export function NavContractors({
  contractors,
  value,
  onChange,
}: {
  contractors: Contractor[]
  value: string
  onChange: (contractorId: string) => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  const showPage = (id: string, page: "shipments" | "stuck") => {
    onChange(id)
    window.location.hash = hrefFor(page)
    setOpenMobile(false)
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>קבלנים</SidebarGroupLabel>
      <SidebarMenu>
        {contractors.map((c) => {
          const active = value === c.id
          return (
            <SidebarMenuItem key={c.id}>
              <SidebarMenuButton
                isActive={active}
                aria-pressed={active}
                onClick={() => onChange(toggleContractor(value, c.id))}
                data-contractor-filter={c.id}
              >
                <Truck />
                <span>{c.name}</span>
              </SidebarMenuButton>
              <DropdownMenu dir="rtl" modal={false}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover className="aria-expanded:bg-muted" data-contractor-menu={c.id}>
                    <MoreHorizontal />
                    <span className="sr-only">{`פעולות עבור ${c.name}`}</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-fit"
                  side={isMobile ? "bottom" : "left"}
                  align={isMobile ? "end" : "start"}
                  // הכפתור יושב בתוך הסרגל הצף; המרווח מוציא את התפריט אל מחוץ למסגרת שלו
                  sideOffset={isMobile ? 4 : 16}
                >
                  <DropdownMenuItem onSelect={() => showPage(c.id, "shipments")} data-action="shipments">
                    <Package />
                    <span>הצג משלוחים</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => showPage(c.id, "stuck")} data-action="stuck">
                    <Hourglass />
                    <span>הצג תקועים</span>
                  </DropdownMenuItem>
                  {active && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onChange("all")}>
                        <FilterX />
                        <span>בטל סינון</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
        <SidebarMenuItem>
          <SidebarMenuButton
            className="text-sidebar-foreground/70"
            disabled={value === "all"}
            onClick={() => onChange("all")}
            data-contractor-filter="all"
          >
            <FilterX className="text-sidebar-foreground/70" />
            <span>כל הקבלנים</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
