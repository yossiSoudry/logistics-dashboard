import { useSyncExternalStore } from "react"
import { parseRoute } from "@/lib/routes.js"

export type RouteId = "overview" | "shipments" | "stuck" | "hourly"

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

/** העמוד הנוכחי לפי הכתובת (#/...). ניווט בלי ספריית ניתוב, ראה Practice.md. */
export function useRoute(): RouteId {
  return useSyncExternalStore(subscribe, () => parseRoute(window.location.hash) as RouteId)
}
