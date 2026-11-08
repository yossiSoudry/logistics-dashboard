import { ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { THEME_LABELS, THEME_PREFERENCES } from "@/lib/theme.js"
import type { ThemePreference } from "@/hooks/use-theme"

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

/**
 * ה-NavUser של sidebar-07 באותו מבנה, אבל כמתג תצוגה:
 * מערכת משתמשים ברשימת "זה לא" של SPEC.md.
 */
export function NavDisplay({
  preference,
  onChange,
  dataLabel,
}: {
  preference: ThemePreference
  onChange: (value: string) => void
  dataLabel: string
}) {
  const { isMobile } = useSidebar()
  const Icon = ICONS[preference]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu dir="rtl" modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={{ children: `מצב תצוגה: ${THEME_LABELS[preference]}`, side: "left", sideOffset: 14 }}
              aria-label={`מצב תצוגה: ${THEME_LABELS[preference]}`}
              data-testid="theme-toggle"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <Icon className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{`מצב תצוגה: ${THEME_LABELS[preference]}`}</span>
                <span className="truncate text-xs text-muted-foreground">{dataLabel}</span>
              </div>
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? "bottom" : "left"} align="end" sideOffset={isMobile ? 4 : 14}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">מצב תצוגה</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={preference} onValueChange={onChange}>
              {(THEME_PREFERENCES as ThemePreference[]).map((p) => {
                const ItemIcon = ICONS[p]
                return (
                  <DropdownMenuRadioItem key={p} value={p} data-theme-option={p}>
                    <ItemIcon className="size-4 text-muted-foreground" />
                    {THEME_LABELS[p]}
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
