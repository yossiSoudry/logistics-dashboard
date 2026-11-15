// האתר פונה לפונקציה ב-Vercel (/api/dashboard). בלי טוקן ובלי פנייה ישירה ל-Airtable.
// SPEC.md, "גמור": נתונים מ-Airtable. נבדק ב-test/dashboard-api.test.js.

import { AirtableError } from "./airtable-client.js";

/**
 * מחזיר { data, skipped } מהפונקציה. שגיאה = AirtableError עם הודעה בעברית,
 * לפי הסוג שהפונקציה החזירה (auth, forbidden, rate...), או network / api.
 */
export async function fetchDashboard({ apiUrl, fetchImpl = fetch }) {
  if (!apiUrl) throw new AirtableError("config");
  let res;
  try {
    res = await fetchImpl(`${apiUrl.replace(/\/$/, "")}/api/dashboard`, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new AirtableError("network", String(e?.message ?? e));
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // לא JSON: הפונקציה לא זמינה
  }
  if (!res.ok || !body?.data) {
    throw new AirtableError(body?.error?.kind ?? "api", `HTTP ${res.status}`);
  }
  return body;
}
