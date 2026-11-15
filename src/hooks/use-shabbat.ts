import { useCallback, useEffect, useState } from "react"
import { DEFAULT_API_URL } from "@/lib/dashboard-api.js"
import { fetchShabbat } from "@/lib/shabbat-api.js"
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

/**
 * זמני השבת לכל מחסן עם מיקום, מ-/api/shabbat (SPEC.md, גמור / עד כניסת שבת).
 * נקרא מחדש כשהנתונים מתרעננים (refreshKey). כישלון של מחסן אחד לא משפיע על האחרים או על הלוח.
 */
export function useShabbat(warehouses: Warehouse[], now: string, refreshKey: unknown) {
  const [stops, setStops] = useState<Record<string, ShabbatEntry>>({})
  const [attempt, setAttempt] = useState(0)
  const located = warehouses.filter((w) => w.geonameId)
  const key = located.map((w) => `${w.id}:${w.geonameId}`).join(",")

  useEffect(() => {
    let alive = true
    setStops({})
    for (const w of located) {
      fetchShabbat({ apiUrl: API_URL, geonameid: w.geonameId, from: now })
        .then(({ stop }) => alive && setStops((s) => ({ ...s, [w.id]: { stop: stop as ShabbatStop } })))
        .catch(() => alive && setStops((s) => ({ ...s, [w.id]: { error: true } })))
    }
    return () => {
      alive = false
    }
    // located נגזר מ-key; refreshKey ו-attempt מבקשים קריאה חוזרת
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, now, refreshKey, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { stops, retry }
}
