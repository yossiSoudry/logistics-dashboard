import { ChevronLeft, LayoutDashboard, Package } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { NAV, hrefFor } from "@/lib/routes.js"
import type { RouteId } from "@/hooks/use-route"

type NavLink = { type: "link"; id: RouteId; label: string }
type NavGroup = { type: "group"; label: string; items: { id: RouteId; label: string }[] }

function StuckCount({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      className="ms-auto rounded-full bg-destructive/12 px-1.5 text-[0.6875rem] leading-5 font-semibold text-destructive tabular-nums"
      data-stuck-count={count}
      aria-label={`${count} משלוחים תקועים`}
    >
      {count}
    </span>
  )
}

/** ה-NavMain של sidebar-07: "סקירה" וקבוצה נפתחת "משלוחים" (SPEC.md, ניווט). */
export function NavMain({ route, stuckCount }: { route: RouteId; stuckCount: number }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const close = () => setOpenMobile(false)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>ניווט</SidebarGroupLabel>
      <SidebarMenu>
        {(NAV as (NavLink | NavGroup)[]).map((entry) => {
          if (entry.type === "link") {
            return (
              <SidebarMenuItem key={entry.id}>
                <SidebarMenuButton asChild isActive={route === entry.id} tooltip={{ children: entry.label, side: "left" }}>
                  <a href={hrefFor(entry.id)} data-nav={entry.id} aria-current={route === entry.id ? "page" : undefined} onClick={close}>
                    <LayoutDashboard />
                    <span>{entry.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          const groupActive = entry.items.some((i) => i.id === route)

          // מכווץ לאייקונים: תת-הקישורים מוסתרים, ולכן הקבוצה נפתחת כתפריט לצד (פנימה לעמוד)
          if (collapsed) {
            return (
              <SidebarMenuItem key={entry.label}>
                <DropdownMenu dir="rtl" modal={false}>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton isActive={groupActive} tooltip={{ children: entry.label, side: "left" }} data-nav-group>
                      <Package />
                      <span>{entry.label}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="left"
                    align="start"
                    sideOffset={8}
                    className="min-w-44"
                    data-testid="nav-group-menu"
                    // אחרי מעבר עמוד לא מחזירים פוקוס לכפתור הקבוצה; אחרת הטולטיפים של הסרגל נתקעים
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">{entry.label}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {entry.items.map((item) => (
                      <DropdownMenuItem key={item.id} asChild>
                        <a
                          href={hrefFor(item.id)}
                          data-nav={item.id}
                          aria-current={route === item.id ? "page" : undefined}
                          className={route === item.id ? "font-semibold text-primary" : undefined}
                        >
                          {item.label}
                          {item.id === "stuck" && <StuckCount count={stuckCount} />}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible key={entry.label} asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={{ children: entry.label, side: "left" }} data-nav-group>
                    <Package />
                    <span>{entry.label}</span>
                    {/* RTL: החץ מצביע שמאלה (כיוון הקריאה) ויורד למטה כשהקבוצה פתוחה */}
                    <ChevronLeft className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:-rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {entry.items.map((item) => (
                      <SidebarMenuSubItem key={item.id}>
                        <SidebarMenuSubButton asChild isActive={route === item.id}>
                          <a href={hrefFor(item.id)} data-nav={item.id} aria-current={route === item.id ? "page" : undefined} onClick={close}>
                            <span>{item.label}</span>
                            {item.id === "stuck" && <StuckCount count={stuckCount} />}
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
