// קריאה מ-Airtable: דפדוף, וסיווג שגיאות להודעות בעברית.
// fetch מוזרק, כדי שאפשר לבדוק בלי רשת (test/airtable-client.test.js).
// SPEC.md, "גמור": נתונים מ-Airtable.

import { TABLES, fromAirtable } from "./airtable.js";

export const API_URL = "https://api.airtable.com/v0";

export const ERROR_MESSAGES = {
  config: "חסרים פרטי החיבור ל-Airtable (מזהה בסיס או טוקן).",
  auth: "הטוקן של Airtable חסר, לא תקף או שפג תוקפו.",
  forbidden: "לטוקן אין הרשאה לבסיס או לטבלה, או שהבסיס לא קיים.",
  not_found: "הבסיס או אחת הטבלאות לא נמצאו ב-Airtable.",
  rate: "יותר מדי בקשות ל-Airtable. נסו שוב בעוד כמה שניות.",
  server: "Airtable לא זמין כרגע.",
  network: "אין חיבור ל-Airtable. בדקו את החיבור לרשת.",
  data: "הנתונים ב-Airtable לא שלמים.",
};

export class AirtableError extends Error {
  constructor(kind, detail = "") {
    super(ERROR_MESSAGES[kind] ?? ERROR_MESSAGES.server);
    this.name = "AirtableError";
    this.kind = kind;
    this.detail = detail;
  }
}

/** קוד HTTP -> סוג שגיאה. 403 ו-404 של Airtable שניהם לרוב "אין הרשאה לבסיס". */
export function classifyStatus(status) {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate";
  return "server";
}

/** כל הרשומות של טבלה, עם דפדוף: Airtable מחזיר עד 100 רשומות לעמוד ו-offset להמשך. */
export async function listAll({ baseId, token, table, fetchImpl = fetch }) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const url = `${API_URL}/${baseId}/${encodeURIComponent(table)}?${params}`;
    let res;
    try {
      res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      throw new AirtableError("network", String(e?.message ?? e));
    }
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify((await res.json())?.error ?? "");
      } catch {
        // גוף לא-JSON: אין פירוט
      }
      throw new AirtableError(classifyStatus(res.status), `${table}: HTTP ${res.status} ${detail}`);
    }
    const body = await res.json();
    records.push(...(body.records ?? []));
    offset = body.offset;
  } while (offset);
  return records;
}

/** קורא את חמש הטבלאות במקביל וממיר למבנה של הלוח. */
export async function loadDashboard({ baseId, token, fetchImpl = fetch }) {
  if (!baseId || !token) throw new AirtableError("config");
  const names = Object.entries(TABLES);
  const lists = await Promise.all(names.map(([, table]) => listAll({ baseId, token, table, fetchImpl })));
  const raw = Object.fromEntries(names.map(([key], i) => [key, lists[i]]));
  try {
    return fromAirtable(raw);
  } catch (e) {
    throw new AirtableError("data", String(e?.message ?? e));
  }
}
