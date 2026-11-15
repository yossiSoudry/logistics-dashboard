// הפונקציה ב-Vercel: מחזיקה את הטוקן של Airtable, קוראת ממנו ומחזירה לאתר רק את הנתונים.
// SPEC.md, "גמור": נתונים מ-Airtable. הטוקן לא מגיע לדפדפן.
//
// משתני סביבה ב-Vercel: AIRTABLE_BASE_ID, AIRTABLE_READ_TOKEN (קריאה בלבד, לבסיס אחד).

import { AirtableError, loadDashboard } from "../src/lib/airtable-client.js";

/** האתר ב-GitHub Pages, ופיתוח מקומי. כל מקור אחר מקבל 403. */
export const ALLOWED_ORIGINS = ["https://yossisoudry.github.io"];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(origin) {
  return Boolean(origin) && (ALLOWED_ORIGINS.includes(origin) || LOCAL.test(origin));
}

function headers(origin, extra = {}) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    // בלי מטמון: רענון בלוח צריך לראות שינוי ב-Airtable מיד
    "Cache-Control": "no-store",
    Vary: "Origin",
    ...(isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    ...extra,
  };
}

const json = (status, body, origin, extra) => new Response(JSON.stringify(body), { status, headers: headers(origin, extra) });

/**
 * התשובה נשמרת עשר שניות בשרת של Vercel, לא בדפדפן (SPEC.md, נתונים / קצב):
 * הרבה צופים יחד לא עוברים את המגבלה של Airtable, 5 בקשות בשנייה לבסיס.
 */
export const CDN_CACHE_SECONDS = 10;

/** סוג שגיאה של Airtable -> קוד HTTP של הפונקציה. config = הגדרה חסרה אצלנו. */
const STATUS_FOR_KIND = { config: 500, data: 502 };

/**
 * מטפל בבקשה. env ו-fetchImpl מוזרקים כדי שאפשר לבדוק בלי רשת (test/api-dashboard.test.js).
 */
export async function handleDashboard(request, env = process.env, fetchImpl = fetch) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return json(403, { error: { kind: "origin", message: "המקור הזה לא מורשה לקרוא את נתוני הלוח." } }, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headers(origin, { "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "600" }),
    });
  }
  if (request.method !== "GET") {
    return json(405, { error: { kind: "method", message: "רק קריאה (GET)." } }, origin, { Allow: "GET, OPTIONS" });
  }
  try {
    const result = await loadDashboard({ baseId: env.AIRTABLE_BASE_ID, token: env.AIRTABLE_READ_TOKEN, fetchImpl });
    return json(200, result, origin, { "Vercel-CDN-Cache-Control": `max-age=${CDN_CACHE_SECONDS}` });
  } catch (e) {
    const kind = e instanceof AirtableError ? e.kind : "server";
    // לא מחזירים את detail: הוא עלול לכלול פרטים פנימיים של Airtable
    return json(STATUS_FOR_KIND[kind] ?? 502, { error: { kind, message: e instanceof AirtableError ? e.message : "שגיאה בשרת הנתונים." } }, origin);
  }
}

export function GET(request) {
  return handleDashboard(request);
}

export function OPTIONS(request) {
  return handleDashboard(request);
}
