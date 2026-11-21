// האתר פונה ל-/api/shabbat שלנו, לא ל-Hebcal (SPEC.md, גמור / עד כניסת שבת). נבדק ב-test/shabbat-api.test.js.
// הבקשה לפי עיר ושבוע, כדי שהמטמון בשרת יעבוד; הבחירה של העצירה הבאה לפי "עכשיו" נעשית כאן.

/** מחזיר { location, stops } לעיר של מחסן ולשבוע (יום ראשון). שגיאה = Error עם kind (external, input, network). */
export async function fetchShabbat({ apiUrl, geonameid, week, fetchImpl = fetch }) {
  const q = new URLSearchParams({ geonameid: String(geonameid), week });
  let res;
  try {
    res = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/api/shabbat?${q}`, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw Object.assign(new Error("אין חיבור לשרת הנתונים."), { kind: "network", cause: e });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body?.stops) || body.stops.length === 0) {
    throw Object.assign(new Error(body?.error?.message ?? "זמני השבת לא זמינים כרגע."), { kind: body?.error?.kind ?? "external" });
  }
  return { location: body.location, stops: body.stops };
}

/** העצירה הבאה: הדלקת הנרות הראשונה אחרי now (שעון ישראל). null אם אין. */
export function nextStop(stops, now) {
  return stops.filter((s) => s.candles > now).sort((a, b) => a.candles.localeCompare(b.candles))[0] ?? null;
}
