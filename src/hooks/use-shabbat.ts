import { useCallback, useEffect, useMemo, useState } from "react"
import { DEFAULT_API_URL } from "@/lib/dashboard-api.js"
import { weekOf } from "@/lib/dates.js"
import { fetchShabbat, nextStop } from "@/lib/shabbat-api.js"
import type { Warehouse } from "@/types"

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL

export interface ShabbatStop {
  kind: "shabbat" | "yomtov"
  title: string
  shabbat: boolean
  candles: string
  havdalah: string | null
}
export type ShabbatEntry = { stop: ShabbatStop } | { error: true }

type Loaded = { stops: ShabbatStop[] } | { error: true }

/**
 * זמני השבת לכל מחסן עם מיקום, מ-/api/shabbat (SPEC.md, גמור / עד כניסת שבת).
 * הבקשה לפי עיר ושבוע; העצירה הבאה נבחרת כאן לפי now, כך ש"עכשיו" שמתקדם לא יוצר בקשה חדשה.
 * נקרא מחדש כשהנתונים מתרעננים (refreshKey). כישלון של מחסן אחד לא משפיע על האחרים או על הלוח.
 */
export function useShabbat(warehouses: Warehouse[], now: string, refreshKey: unknown) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({})
  const week = weekOf(now)
  const [attempt, setAttempt] = useState(0)
  const located = warehouses.filter((w) => w.geonameId)
  const key = located.map((w) => `${w.id}:${w.geonameId}`).join(",")

  useEffect(() => {
    let alive = true
    setLoaded({})
    for (const w of located) {
      fetchShabbat({ apiUrl: API_URL, geonameid: w.geonameId, week })
        .then(({ stops }) => alive && setLoaded((s) => ({ ...s, [w.id]: { stops: stops as ShabbatStop[] } })))
        .catch(() => alive && setLoaded((s) => ({ ...s, [w.id]: { error: true } })))
    }
    return () => {
      alive = false
    }
    // located נגזר מ-key; refreshKey ו-attempt מבקשים קריאה חוזרת
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, week, refreshKey, attempt])

  const stops = useMemo(() => {
    const out: Record<string, ShabbatEntry> = {}
    for (const [id, entry] of Object.entries(loaded)) {
      const stop = "stops" in entry ? (nextStop(entry.stops, now) as ShabbatStop | null) : null
      out[id] = stop ? { stop } : { error: true }
    }
    return out
  }, [loaded, now])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { stops, retry }
}
