import { useCallback, useEffect, useRef, useState } from "react"
import { AirtableError } from "@/lib/airtable-client.js"
import { AUTO_REFRESH_MS, DEFAULT_API_URL, fetchDashboard } from "@/lib/dashboard-api.js"
import type { DashboardData } from "@/types"

// כתובת הפונקציה ב-Vercel שמחזיקה את הטוקן (SPEC.md, נתונים מ-Airtable). ערך ציבורי.
// VITE_API_URL מאפשר לכוון לפונקציה אחרת בבדיקות. לאתר אין טוקן בכלל.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL

export interface RejectedRecord {
  table: string
  key: string
  reason: string
}

export interface DashboardDataState {
  data: DashboardData | null
  rejected: RejectedRecord[]
  error: AirtableError | null
  loading: boolean
  updatedAt: Date | null
  reload: () => void
}

/**
 * טוען את הנתונים מ-Airtable (דרך הפונקציה) בכל כניסה, ומרענן לפי בקשה בלי לטעון את העמוד מחדש.
 * ברענון שנכשל הנתונים הקודמים נשארים מוצגים, והשגיאה מוצגת לידם. אין נפילה לקובץ.
 */
export function useDashboardData(): DashboardDataState {
  const [state, setState] = useState<Omit<DashboardDataState, "reload">>({
    data: null,
    rejected: [],
    error: null,
    loading: true,
    updatedAt: null,
  })
  const request = useRef(0)

  const reload = useCallback(async () => {
    const id = ++request.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data, rejected } = await fetchDashboard({ apiUrl: API_URL })
      if (id !== request.current) return // תשובה ישנה: בקשה חדשה יותר כבר יצאה
      setState({ data: data as DashboardData, rejected: rejected as RejectedRecord[], error: null, loading: false, updatedAt: new Date() })
    } catch (e) {
      if (id !== request.current) return
      const error = e instanceof AirtableError ? e : new AirtableError("server", String(e))
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // קצב (SPEC.md, נתונים): כל חמש דקות כשהעמוד נראה. ברקע לא קוראים; כשחוזרים אחרי יותר מחמש דקות, קוראים מיד.
  const lastLoad = useRef(Date.now())
  useEffect(() => {
    if (state.updatedAt) lastLoad.current = state.updatedAt.getTime()
  }, [state.updatedAt])
  useEffect(() => {
    const visible = () => document.visibilityState === "visible"
    const timer = window.setInterval(() => {
      if (visible()) void reload()
    }, AUTO_REFRESH_MS)
    const onVisible = () => {
      if (visible() && Date.now() - lastLoad.current >= AUTO_REFRESH_MS) void reload()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [reload])

  return { ...state, reload }
}
