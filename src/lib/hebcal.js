// מקור חיצוני: Hebcal (https://www.hebcal.com), זמני שבת וחגים. חינמי, בלי מפתח, CC BY 4.0.
// החלק הטהור: בניית הבקשה, בדיקת התשובה, ומציאת "העצירה הבאה". נבדק מול תשובות אמיתיות ב-test/fixtures/.
// SPEC.md, גמור / עד כניסת שבת.

import { toLocalIso } from "./airtable.js";

export const HEBCAL_SHABBAT_API = "https://www.hebcal.com/shabbat";

/** "2026-11-08" + 7 -> "2026-11-15" */
export function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** הבקשה ל-Hebcal: השבוע של התאריך, בעיר לפי מזהה GeoNames, בעברית, בלי קריאה בתורה. */
export function hebcalUrl(geonameid, date) {
  const [gy, gm, gd] = date.split("-").map(Number);
  const q = new URLSearchParams({ cfg: "json", geonameid: String(geonameid), M: "on", lg: "he", leyning: "off", gy: String(gy), gm: String(gm), gd: String(gd) });
  return `${HEBCAL_SHABBAT_API}?${q}`;
}

/** האם התשובה בפורמט שאנחנו מצפים לו (החוזה של Hebcal, שקף 23). */
export function isHebcalPayload(x) {
  return Boolean(x && typeof x === "object" && Array.isArray(x.items) && x.location && typeof x.location === "object");
}

/** "סֻכּוֹת א׳" -> "סוכות א׳": בלי ניקוד, לתצוגה קומפקטית. */
export const stripNiqqud = (s) => String(s ?? "").replace(/[֑-ׇ]/g, "").trim();

const dayOf = (localIso) => localIso.slice(0, 10);

/**
 * העצירה הבאה: הדלקת הנרות הראשונה אחרי from (שעון ישראל, בלי אזור זמן).
 * ערב חג אם למחרת יום טוב (yomtov), אחרת ערב שבת. null אם אין הדלקת נרות אחרי from בתשובה.
 */
export function nextStop(payload, from) {
  const items = payload.items;
  const candles = items
    .filter((i) => i.category === "candles" && i.date)
    .map((i) => ({ local: toLocalIso(i.date) }))
    .filter((c) => c.local > from)
    .sort((a, b) => a.local.localeCompare(b.local))[0];
  if (!candles) return null;

  const nextDay = addDays(dayOf(candles.local), 1);
  const yomtov = items.find((i) => i.category === "holiday" && i.yomtov === true && String(i.date).slice(0, 10) === nextDay);
  const parasha = items.find((i) => i.category === "parashat" && String(i.date).slice(0, 10) === nextDay);
  const havdalah = items
    .filter((i) => i.category === "havdalah" && i.date)
    .map((i) => toLocalIso(i.date))
    .filter((h) => h > candles.local)
    .sort()[0];
  const isShabbat = new Date(`${dayOf(candles.local)}T12:00:00Z`).getUTCDay() === 5; // הדלקת נרות ביום שישי

  return {
    kind: yomtov ? "yomtov" : "shabbat",
    title: yomtov ? stripNiqqud(yomtov.hebrew ?? yomtov.title) : stripNiqqud(parasha?.hebrew ?? parasha?.title ?? "שבת"),
    shabbat: isShabbat,
    candles: candles.local,
    havdalah: havdalah ?? null,
  };
}
