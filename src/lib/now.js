// "עכשיו" של הלוח: הגדרה של השרת, לא נתון ב-Airtable (SPEC.md, נתונים / הכללים).
// DEMO_NOW במשתני הסביבה של Vercel קובע זמן קבוע לדמו. בלעדיו: השעון של השרת, בשעון ישראל.
// נבדק ב-test/now.test.js.

import { LOCAL_DATETIME, toLocalIso } from "./airtable.js";

/** מחזיר { now, source }. source: "demo" (DEMO_NOW) או "clock" (השעון של השרת). null אם DEMO_NOW לא תקין. */
export function resolveNow(env, clock = new Date()) {
  const demo = String(env.DEMO_NOW ?? "").trim();
  if (!demo) return { now: toLocalIso(clock.toISOString()), source: "clock" };
  const full = /T\d{2}:\d{2}$/.test(demo) ? `${demo}:00` : demo;
  // תאריך קיים בלוח השנה (לא 31.2): הלוך-חזור דרך Date מחזיר בדיוק את אותו ערך
  const t = Date.parse(`${full}Z`);
  if (!LOCAL_DATETIME.test(full) || Number.isNaN(t) || new Date(t).toISOString().slice(0, 19) !== full) return null;
  return { now: full, source: "demo" };
}
