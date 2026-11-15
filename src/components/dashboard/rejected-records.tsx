import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { RejectedRecord } from "@/hooks/use-dashboard-data"

/**
 * רשומות ששברו כלל ולכן לא נכנסו ללוח (SPEC.md, נתונים / הכללים).
 * לא נעלמות בשקט: התג בכותרת מראה כמה, והרשימה מראה איזו ולמה, כדי שאפשר לתקן ב-Airtable.
 */
export function RejectedRecords({ rejected }: { rejected: RejectedRecord[] }) {
  if (rejected.length === 0) return null
  const label = rejected.length === 1 ? "רשומה לא תקינה" : `${rejected.length} רשומות לא תקינות`
  return (
    <DropdownMenu dir="rtl" modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-testid="rejected-chip"
          aria-label={`${label} לא נכללו בלוח. לחצו לפירוט`}
        >
          <TriangleAlert data-icon="inline-start" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]" data-testid="rejected-list">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          לא נכללו בלוח. מתקנים ב-Airtable, והן חוזרות ברענון הבא.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ul className="max-h-72 overflow-y-auto p-1">
          {rejected.map((r, i) => (
            <li key={`${r.table}-${r.key}-${i}`} className="rounded-md px-2 py-1.5 text-sm" data-rejected={`${r.table}:${r.key}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium" dir="ltr">{r.key}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{r.table}</span>
              </div>
              <div className="text-xs text-destructive">{r.reason}</div>
            </li>
          ))}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
