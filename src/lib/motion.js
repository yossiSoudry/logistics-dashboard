// זמנים וחישובים טהורים לאנימציה. בלי DOM. נבדק ב-test/motion.test.js.
// SPEC.md, "גמור": אנימציה. כל אנימציית מעבר עד 600ms כולל ההשהיה.

export const MAX_TRANSITION_MS = 600;
export const ENTER_MS = 400; // כניסת כרטיס
export const STAGGER_STEP_MS = 40; // ההפרש בין כרטיס לכרטיס
export const COUNT_MS = 550; // מספר סופר
export const CHART_MS = 600; // עמודות צומחות, קו נמתח
export const BAR_GROW_MS = 400; // פסים קטנים (רצועת המלאי, זמני המתנה)
export const BAR_STAGGER_MS = 10;

/** השהיית הכניסה של כרטיס לפי מיקומו. נחתכת כך שהכניסה מסתיימת תוך 600ms. */
export function staggerDelay(index, step = STAGGER_STEP_MS, duration = ENTER_MS) {
  return Math.max(0, Math.min(index * step, MAX_TRANSITION_MS - duration));
}

/** האטה בסוף: מהיר בהתחלה, נעצר בעדינות. 0 -> 0, 1 -> 1. */
export function easeOutCubic(t) {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/** הערך שמוצג אחרי elapsed מילישניות. מספר שלם, ונעצר בדיוק על to. */
export function tweenValue(from, to, elapsed, duration = COUNT_MS) {
  if (elapsed >= duration || from === to) return to;
  return Math.round(from + (to - from) * easeOutCubic(elapsed / duration));
}
