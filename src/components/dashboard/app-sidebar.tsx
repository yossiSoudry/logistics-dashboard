import { Boxes, ChartColumn, Hourglass, LayoutDashboard, Package } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { ROUTES, hrefFor } from "@/lib/routes.js"
import type { RouteId } from "@/hooks/use-route"

const ICONS: Record<RouteId, LucideIcon> = {
  overview: LayoutDashboard,
  shipments: Package,
  stuck: Hourglass,
  hourly: ChartColumn,
}

export function AppSidebar({
  route,
  stuckCount,
  dateLabel,
}: {
  route: RouteId
  stuckCount: number
  dateLabel: string
}) {
  const { setOpenMobile } = useSidebar()
  return (
    // RTL: הסרגל בצד ימין, והטולטיפים במצב מכווץ נפתחים שמאלה לתוך העמוד
    <Sidebar side="right" collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={{ children: "לוח בקרה", side: "left" }}>
              <a href={hrefFor("overview")} onClick={() => setOpenMobile(false)}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Boxes className="size-4" />
                </span>
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-bold">לוח בקרה</span>
                  <span className="truncate text-xs text-muted-foreground">מלאי ולוגיסטיקה</span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>עמודים</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(ROUTES as { id: RouteId; label: string }[]).map((r) => {
                const Icon = ICONS[r.id]
                return (
                  <SidebarMenuItem key={r.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={route === r.id}
                      tooltip={{ children: r.label, side: "left" }}
                    >
                      <a
                        href={hrefFor(r.id)}
                        data-nav={r.id}
                        aria-current={route === r.id ? "page" : undefined}
                        onClick={() => setOpenMobile(false)}
                      >
                        <Icon />
                        <span>{r.label}</span>
                      </a>
                    </SidebarMenuButton>
                    {r.id === "stuck" && stuckCount > 0 && (
                      <SidebarMenuBadge
                        className="bg-destructive/12 text-destructive peer-data-active/menu-button:text-destructive"
                        data-stuck-count={stuckCount}
                        aria-label={`${stuckCount} משלוחים תקועים`}
                      >
                        {stuckCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {`נתוני דמה · ${dateLabel}`}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
