// הפונקציה ב-Vercel למקור החיצוני: זמני שבת וחג מ-Hebcal (SPEC.md, גמור / עד כניסת שבת).
// הדפדפן לא פונה ל-Hebcal. הפונקציה בודקת את הקלט, קוראת מ-Hebcal, בודקת את התשובה,
// ומחזירה חוזה קצר משלנו: { location, stop, source }.

import { headers, isAllowedOrigin, json } from "./dashboard.js";
import { addDays, hebcalUrl, isHebcalPayload, nextStop } from "../src/lib/hebcal.js";

/** זמני שבוע מסוים לא משתנים: שש שעות בשרת של Vercel (SPEC.md, נתונים / קצב). */
export const SHABBAT_CACHE_SECONDS = 6 * 60 * 60;
const HEBCAL_TIMEOUT_MS = 5000;

const GEONAMEID = /^[1-9]\d{0,8}$/;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const bad = (origin, message) => json(400, { error: { kind: "input", message } }, origin);
const external = (origin) =>
  json(502, { error: { kind: "external", message: "זמני השבת מ-Hebcal לא זמינים כרגע." } }, origin);

/** קריאה אחת ל-Hebcal. מחזיר את התשובה אם היא בפורמט הצפוי, אחרת null. */
async function readWeek(geonameid, date, fetchImpl) {
  const res = await fetchImpl(hebcalUrl(geonameid, date), { signal: AbortSignal.timeout(HEBCAL_TIMEOUT_MS) });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return isHebcalPayload(body) ? body : null;
}

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

  // החוזה, שקף 23: בקשה ששוברת כלל נדחית בדלת, ו-Hebcal לא שומע עליה
  const params = new URL(request.url).searchParams;
  const geonameid = params.get("geonameid") ?? "";
  const from = params.get("from") ?? "";
  if (!GEONAMEID.test(geonameid)) return bad(origin, "geonameid צריך להיות מספר שלם חיובי.");
  if (!LOCAL_DATETIME.test(from) || Number.isNaN(Date.parse(`${from}Z`))) return bad(origin, "from צריך להיות תאריך ושעה, למשל 2026-11-08T18:00:00.");
  const fromLocal = from.length === 16 ? `${from}:00` : from;

  try {
    const date = fromLocal.slice(0, 10);
    let week = await readWeek(geonameid, date, fetchImpl);
    if (!week) return external(origin);
    let stop = nextStop(week, fromLocal);
    if (!stop) {
      // אחרי הדלקת הנרות של השבוע: לוקחים את השבוע שאחריו
      week = await readWeek(geonameid, addDays(date, 7), fetchImpl);
      if (!week) return external(origin);
      stop = nextStop(week, fromLocal);
    }
    if (!stop) return external(origin);
    return json(
      200,
      {
        location: { geonameid: Number(geonameid), title: week.location.title ?? week.location.city ?? "" },
        stop,
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
