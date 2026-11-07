import { Monitor, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEME_LABELS, THEME_PREFERENCES } from "@/lib/theme.js"
import type { ThemePreference } from "@/hooks/use-theme"

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

export function ThemeToggle({
  preference,
  onChange,
}: {
  preference: ThemePreference
  onChange: (value: string) => void
}) {
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`מצב תצוגה: ${THEME_LABELS[preference]}`}
          data-testid="theme-toggle"
        >
          <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>מצב תצוגה</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={preference} onValueChange={onChange}>
          {(THEME_PREFERENCES as ThemePreference[]).map((p) => {
            const Icon = ICONS[p]
            return (
              <DropdownMenuRadioItem key={p} value={p} data-theme-option={p}>
                <Icon className="size-4 text-muted-foreground" />
                {THEME_LABELS[p]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
