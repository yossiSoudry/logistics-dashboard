import { useCallback, useEffect, useState } from "react"
import {
  THEME_STORAGE_KEY,
  normalizePreference,
  resolveTheme,
} from "@/lib/theme.js"

export type ThemePreference = "light" | "dark" | "system"

const media = () => window.matchMedia("(prefers-color-scheme: dark)")

function readStored(): ThemePreference {
  try {
    return normalizePreference(localStorage.getItem(THEME_STORAGE_KEY)) as ThemePreference
  } catch {
    return "system"
  }
}

function apply(preference: ThemePreference) {
  const theme = resolveTheme(preference, media().matches)
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored)

  useEffect(() => {
    apply(preference)
    if (preference !== "system") return
    const mq = media()
    const onChange = () => apply("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [preference])

  const setPreference = useCallback((value: string) => {
    const next = normalizePreference(value) as ThemePreference
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // אחסון חסום: המצב עדיין מתחלף, רק לא נשמר
    }
    setPreferenceState(next)
  }, [])

  return { preference, setPreference }
}
