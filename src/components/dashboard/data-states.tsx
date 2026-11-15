import { CloudOff, Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { AirtableError } from "@/lib/airtable-client.js"

/** טעינה ראשונה: שלד של הלוח (SPEC.md, נתונים מ-Airtable). */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh bg-background" data-testid="loading">
      <div className="hidden w-64 shrink-0 p-2 md:block">
        <Skeleton className="h-full rounded-lg" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Database className="size-4" />
          טוען נתונים מ-Airtable…
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={cn("h-36 rounded-xl", i === 4 && "col-span-2 sm:col-span-1")} />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
        </div>
      </div>
    </div>
  )
}

/** הקריאה נכשלה ואין נתונים להציג: הסיבה בעברית וכפתור "נסה שוב". בלי נפילה שקטה לקובץ. */
export function ErrorScreen({ error, onRetry, retrying }: { error: AirtableError; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-4" data-testid="load-error" data-error-kind={error.kind}>
      <Card className="w-full max-w-md">
        <CardHeader className="gap-2">
          <span className="grid size-10 place-items-center rounded-full bg-destructive/12 text-destructive" aria-hidden>
            <CloudOff className="size-5" />
          </span>
          <CardTitle className="text-base font-semibold">לא הצלחנו לטעון את הנתונים מ-Airtable</CardTitle>
          <CardDescription className="text-sm" role="alert">
            {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          הלוח קורא את הנתונים ישירות מבסיס הנתונים ב-Airtable, ואין לו עותק מקומי להציג במקומם.
        </CardContent>
        <CardFooter>
          <Button onClick={onRetry} disabled={retrying} data-testid="retry">
            <RefreshCw data-icon="inline-start" className={cn(retrying && "motion-safe:animate-spin")} />
            נסה שוב
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/** בכותרת: מקור הנתונים, שעת העדכון וכפתור רענון. ברענון שנכשל: הודעה קצרה ליד. */
export function DataSource({
  updatedAt,
  loading,
  error,
  onRefresh,
}: {
  updatedAt: Date | null
  loading: boolean
  error: AirtableError | null
  onRefresh: () => void
}) {
  const time = updatedAt?.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
  return (
    <div className="flex items-center gap-1.5" data-testid="data-source">
      {error ? (
        <span className="text-xs font-medium text-destructive" role="alert" data-testid="refresh-error">
          {`הרענון נכשל: ${error.message}`}
        </span>
      ) : (
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          <Database className="size-3.5" aria-hidden />
          <span>Airtable</span>
          {time && <span data-testid="updated-at">{`· עודכן ב-${time}`}</span>}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRefresh}
        disabled={loading}
        aria-label="רענון הנתונים מ-Airtable"
        title="רענון הנתונים מ-Airtable"
        data-testid="refresh"
      >
        <RefreshCw className={cn(loading && "motion-safe:animate-spin")} />
      </Button>
    </div>
  )
}
