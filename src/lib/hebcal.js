// מקור חיצוני: Hebcal (https://www.hebcal.com), זמני שבת וחגים. חינמי, בלי מפתח, CC BY 4.0.
// החלק הטהור: בניית הבקשה, בדיקת התשובה, והפיכתה לרשימת עצירות. נבדק מול תשובות אמיתיות ב-test/fixtures/.
// SPEC.md, גמור / עד כניסת שבת.

import { toLocalIso } from "./airtable.js";
import { addDays, weekdayOf } from "./dates.js";

export { addDays };

/** לוח השנה של Hebcal לפי טווח תאריכים מפורש (start..end). ה-API של /shabbat מחזיר טווח שמשתנה לפי היום. */
export const HEBCAL_CALENDAR_API = "https://www.hebcal.com/hebcal";

/** הבקשה ל-Hebcal: מ-start עד end כולל, בעיר לפי מזהה GeoNames, בעברית. נרות, הבדלה, פרשה וחגים. */
export function hebcalUrl(geonameid, start, end) {
  const q = new URLSearchParams({
    v: "1", cfg: "json", geonameid: String(geonameid),
    c: "on", s: "on", maj: "on", min: "on", mod: "on", nx: "on",
    M: "on", lg: "he", leyning: "off", start, end,
  });
  return `${HEBCAL_CALENDAR_API}?${q}`;
}

/** האם התשובה בפורמט שאנחנו מצפים לו (החוזה של Hebcal, שקף 23). */
export function isHebcalPayload(x) {
  return Boolean(x && typeof x === "object" && Array.isArray(x.items) && x.location && typeof x.location === "object");
}

/** "סֻכּוֹת א׳" -> "סוכות א׳": בלי ניקוד, לתצוגה קומפקטית. */
export const stripNiqqud = (s) => String(s ?? "").replace(/[֑-ׇ]/g, "").trim();

const dayOf = (localIso) => localIso.slice(0, 10);

/**
 * כל העצירות בתשובה, לפי הסדר: לכל הדלקת נרות, ערב חג אם למחרת יום טוב (yomtov), אחרת ערב שבת.
 * בשעון ישראל, בלי אזור זמן. ההבדלה היא הראשונה אחרי הדלקת הנרות, או null אם היא מחוץ לטווח.
 */
export function stopsOf(payload) {
  const items = payload.items;
  const on = (category, day) => items.find((i) => i.category === category && String(i.date).slice(0, 10) === day);
  const havdalot = items.filter((i) => i.category === "havdalah" && i.date).map((i) => toLocalIso(i.date)).sort();
  return items
    .filter((i) => i.category === "candles" && i.date)
    .map((i) => toLocalIso(i.date))
    .sort()
    .map((candles) => {
      const nextDay = addDays(dayOf(candles), 1);
      const yomtov = items.find((i) => i.category === "holiday" && i.yomtov === true && String(i.date).slice(0, 10) === nextDay);
      const parasha = on("parashat", nextDay);
      return {
        kind: yomtov ? "yomtov" : "shabbat",
        title: yomtov ? stripNiqqud(yomtov.hebrew ?? yomtov.title) : stripNiqqud(parasha?.hebrew ?? parasha?.title ?? "שבת"),
        shabbat: weekdayOf(dayOf(candles)) === 5, // הדלקת נרות ביום שישי
        candles,
        havdalah: havdalot.find((h) => h > candles) ?? null,
      };
    });
}
