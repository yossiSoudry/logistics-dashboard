import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { COUNT_MS, ENTER_MS, staggerDelay, tweenValue } from "@/lib/motion.js"

/**
 * מספר שרץ מהערך הקודם לחדש (SPEC.md, אנימציה: מספרים סופרים).
 * בטעינה רץ מ-0. בהפחתת תנועה מוצג מיד הערך הסופי.
 */
export function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)
  const shownRef = useRef(shown)
  shownRef.current = shown

  useEffect(() => {
    if (reduced) {
      setShown(value)
      return
    }
    const from = shownRef.current
    if (from === value) return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const next = tweenValue(from, value, now - start, COUNT_MS)
      setShown(next)
      if (next !== value) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])

  return <>{shown}</>
}

/**
 * כניסה מדורגת של כרטיס (SPEC.md, אנימציה). רק במעבר עמוד: הקומפוננטה נטענת מחדש,
 * ושינוי סינון לא מפעיל אותה שוב. motion-safe = כבוי בהפחתת תנועה.
 */
export function enter(index: number): { className: string; style: CSSProperties } {
  return {
    className: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 fill-mode-backwards",
    style: { animationDuration: `${ENTER_MS}ms`, animationDelay: `${staggerDelay(index)}ms` },
  }
}

/** מיקרו-אינטראקציה לכרטיסי הסקירה: מסגרת כחולה עדינה ועלייה קלה במעבר עכבר. */
export const cardHover =
  "transition-[translate,box-shadow] duration-200 hover:ring-primary/35 motion-safe:hover:-translate-y-0.5"

/** נקודה אדומה פועמת: לולאה עדינה, החריג היחיד לכלל ה-600ms בספק. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex size-1.5 shrink-0 ${className ?? ""}`} aria-hidden>
      <span className="absolute inline-flex size-full rounded-full bg-destructive opacity-70 motion-safe:animate-ping" />
      <span className="relative inline-flex size-1.5 rounded-full bg-destructive" />
    </span>
  )
}
