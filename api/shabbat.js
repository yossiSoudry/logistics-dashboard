// הפונקציה ב-Vercel למקור החיצוני: זמני שבת וחג מ-Hebcal (SPEC.md, גמור / עד כניסת שבת).
// הדפדפן לא פונה ל-Hebcal. הפונקציה בודקת את הקלט, קוראת מ-Hebcal, בודקת את התשובה,
// ומחזירה חוזה קצר משלנו: { location, week, stops, source }.
// הכתובת תלויה רק בעיר ובשבוע, לא בשעה, ולכן המטמון עובד גם כש"עכשיו" מתקדם עם השעון.

import { headers, isAllowedOrigin, json } from "./dashboard.js";
import { addDays, weekdayOf } from "../src/lib/dates.js";
import { hebcalUrl, isHebcalPayload, stopsOf } from "../src/lib/hebcal.js";

/** זמני שבוע מסוים לא משתנים: שש שעות בשרת של Vercel, לפי עיר ושבוע (SPEC.md, נתונים / קצב). */
export const SHABBAT_CACHE_SECONDS = 6 * 60 * 60;
const HEBCAL_TIMEOUT_MS = 5000;

const GEONAMEID = /^[1-9]\d{0,8}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const bad = (origin, message) => json(400, { error: { kind: "input", message } }, origin);
const external = (origin) =>
  json(502, { error: { kind: "external", message: "זמני השבת מ-Hebcal לא זמינים כרגע." } }, origin);

const isRealDate = (d) => DATE.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;

export async function handleShabbat(request, fetchImpl = fetch) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return json(403, { error: { kind: "origin", message: "המקור הזה לא מורשה." } }, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin, { "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "600" }) });
  }
  if (request.method !== "GET") {
    return json(405, { error: { kind: "method", message: "רק קריאה (GET)." } }, origin, { Allow: "GET, OPTIONS" });
  }

  // החוזה, שקף 23: בקשה ששוברת כלל נדחית בדלת, ו-Hebcal לא שומע עליה.
  // week חייב להיות יום ראשון: כתובת אחת לכל שבוע, כדי שהמטמון לא יתפצל.
  const params = new URL(request.url).searchParams;
  const geonameid = params.get("geonameid") ?? "";
  const week = params.get("week") ?? "";
  if (!GEONAMEID.test(geonameid)) return bad(origin, "geonameid צריך להיות מספר שלם חיובי.");
  if (!isRealDate(week)) return bad(origin, "week צריך להיות תאריך, למשל 2026-11-08.");
  if (weekdayOf(week) !== 0) return bad(origin, "week צריך להיות יום ראשון, שפותח את השבוע.");

  try {
    // השבוע והשבוע שאחריו: תמיד יש בהם הדלקת נרות אחרי כל רגע בשבוע הזה
    const res = await fetchImpl(hebcalUrl(geonameid, week, addDays(week, 13)), { signal: AbortSignal.timeout(HEBCAL_TIMEOUT_MS) });
    if (!res.ok) return external(origin);
    const payload = await res.json().catch(() => null);
    if (!isHebcalPayload(payload)) return external(origin);
    const stops = stopsOf(payload);
    if (stops.length === 0) return external(origin);
    return json(
      200,
      {
        location: { geonameid: Number(geonameid), title: payload.location.title ?? payload.location.city ?? "" },
        week,
        stops,
        source: "Hebcal.com",
      },
      origin,
      { "Vercel-CDN-Cache-Control": `max-age=${SHABBAT_CACHE_SECONDS}` },
    );
  } catch {
    // רשת, timeout או JSON שבור: רק הכרטיס הזה מושפע
    return external(origin);
  }
}

export function GET(request) {
  return handleShabbat(request);
}

export function OPTIONS(request) {
  return handleShabbat(request);
}
