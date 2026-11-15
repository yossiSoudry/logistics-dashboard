// האתר פונה ל-/api/shabbat שלנו, לא ל-Hebcal (SPEC.md, גמור / עד כניסת שבת). נבדק ב-test/shabbat-api.test.js.

/** מחזיר { location, stop } לעיר של מחסן. שגיאה = Error עם kind (external, input, network). */
export async function fetchShabbat({ apiUrl, geonameid, from, fetchImpl = fetch }) {
  const q = new URLSearchParams({ geonameid: String(geonameid), from });
  let res;
  try {
    res = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/api/shabbat?${q}`, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw Object.assign(new Error("אין חיבור לשרת הנתונים."), { kind: "network", cause: e });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.stop?.candles) {
    throw Object.assign(new Error(body?.error?.message ?? "זמני השבת לא זמינים כרגע."), { kind: body?.error?.kind ?? "external" });
  }
  return { location: body.location, stop: body.stop };
}
