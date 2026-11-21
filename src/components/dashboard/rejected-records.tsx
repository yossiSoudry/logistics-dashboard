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
import { groupRejected } from "@/logic.js"

type Group = { table: string; reason: string; keys: string[]; label: string }

/**
 * רשומות ששברו כלל ולכן לא נכנסו ללוח (SPEC.md, נתונים / הכללים).
 * לא נעלמות בשקט: התג בכותרת מראה כמה, והרשימה מראה איזו ולמה, כדי שאפשר לתקן ב-Airtable.
 * רשומות עם אותה סיבה בשורה אחת: שינוי אחד שמפיל הרבה רשומות נראה כבעיה אחת.
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
          {(groupRejected(rejected) as Group[]).map((g) => (
            <li key={`${g.table}-${g.reason}`} className="rounded-md px-2 py-1.5 text-sm" data-rejected-group={g.table} data-count={g.keys.length}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{g.label}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{g.table}</span>
              </div>
              <div className="text-xs text-destructive">{g.reason}</div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                {g.keys.map((k, i) => (
                  <span key={`${k}-${i}`} dir="ltr" className="rounded bg-muted px-1.5 py-0.5 tabular-nums" data-rejected={`${g.table}:${k}`}>
                    {k}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
