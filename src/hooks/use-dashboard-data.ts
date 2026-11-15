import { useCallback, useEffect, useRef, useState } from "react"
import { AirtableError, loadDashboard } from "@/lib/airtable-client.js"
import type { DashboardData } from "@/types"

// טוקן קריאה בלבד לבסיס אחד (SPEC.md, נתונים מ-Airtable). מגיע מ-.env.local או מ-GitHub Secrets בבנייה.
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID as string | undefined
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN as string | undefined

export interface DashboardDataState {
  data: DashboardData | null
  error: AirtableError | null
  loading: boolean
  updatedAt: Date | null
  reload: () => void
}

/**
 * טוען את הנתונים מ-Airtable בכל כניסה, ומרענן לפי בקשה בלי לטעון את העמוד מחדש.
 * ברענון שנכשל הנתונים הקודמים נשארים מוצגים, והשגיאה מוצגת לידם. אין נפילה לקובץ.
 */
export function useDashboardData(): DashboardDataState {
  const [state, setState] = useState<Omit<DashboardDataState, "reload">>({
    data: null,
    error: null,
    loading: true,
    updatedAt: null,
  })
  const request = useRef(0)

  const reload = useCallback(async () => {
    const id = ++request.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data } = await loadDashboard({ baseId: BASE_ID, token: TOKEN })
      if (id !== request.current) return // תשובה ישנה: בקשה חדשה יותר כבר יצאה
      setState({ data: data as DashboardData, error: null, loading: false, updatedAt: new Date() })
    } catch (e) {
      if (id !== request.current) return
      const error = e instanceof AirtableError ? e : new AirtableError("server", String(e))
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...state, reload }
}
