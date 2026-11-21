// קריאה מ-Airtable: דפדוף, וסיווג שגיאות להודעות בעברית.
// fetch מוזרק, כדי שאפשר לבדוק בלי רשת (test/airtable-client.test.js).
// SPEC.md, "גמור": נתונים מ-Airtable.

import { SCHEMA, TABLES, TIME_ZONE, fromAirtable } from "./airtable.js";

export const API_URL = "https://api.airtable.com/v0";

export const ERROR_MESSAGES = {
  config: "חסרים פרטי החיבור לנתונים (כתובת שרת הנתונים, מזהה בסיס או טוקן).",
  now: "הגדרת הזמן בשרת (DEMO_NOW) לא תקינה: צריך תאריך ושעה, למשל 2026-11-08T18:00:00.",
  auth: "הטוקן של Airtable חסר, לא תקף או שפג תוקפו.",
  forbidden: "לטוקן אין הרשאה לבסיס או לטבלה, או שהבסיס לא קיים.",
  not_found: "הבסיס או אחת הטבלאות לא נמצאו ב-Airtable.",
  rate: "יותר מדי בקשות ל-Airtable. נסו שוב בעוד חצי דקה.",
  server: "Airtable לא זמין כרגע.",
  network: "אין חיבור ל-Airtable. בדקו את החיבור לרשת.",
  data: "הנתונים ב-Airtable לא שלמים.",
  api: "שרת הנתונים של הלוח לא זמין כרגע.",
  origin: "האתר הזה לא מורשה לקרוא את נתוני הלוח.",
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** מתחת למגבלה של Airtable (5 בקשות בשנייה לבסיס), עם מקום לסקריפט הטעינה (SPEC.md, נתונים / קצב). */
export const MAX_REQUESTS_PER_SECOND = 4;
/** אחרי 429, Airtable דורש לחכות 30 שניות לפני הבקשה הבאה. */
export const RATE_LIMIT_WAIT_MS = 30_000;

/**
 * קצב: לכל היותר max בקשות בכל חלון של windowMs. כל הבקשות של קריאה אחת של הלוח עוברות דרכו.
 * now ו-wait מוזרקים, כדי לבדוק בלי לחכות באמת.
 */
export function createPacer({ max = MAX_REQUESTS_PER_SECOND, windowMs = 1000, now = Date.now, wait = sleep } = {}) {
  const starts = [];
  let queue = Promise.resolve();
  return function pace() {
    const turn = queue.then(async () => {
      for (;;) {
        while (starts.length && now() - starts[0] >= windowMs) starts.shift();
        if (starts.length < max) break;
        await wait(starts[0] + windowMs - now());
      }
      starts.push(now());
    });
    queue = turn;
    return turn;
  };
}

/** משלוחי היום של "עכשיו" בשעון ישראל, ומשלוחים בלי Created At (כדי שיידחו עם סיבה). */
export function shipmentsOfDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AirtableError("now", date);
  return `OR({Created At} = BLANK(), DATETIME_FORMAT(SET_TIMEZONE({Created At}, '${TIME_ZONE}'), 'YYYY-MM-DD') = '${date}')`;
}

/**
 * כל הרשומות של טבלה, עם דפדוף: Airtable מחזיר עד 100 רשומות לעמוד ו-offset להמשך.
 * fields: רק השדות האלה. filterByFormula: רק הרשומות שעונות על הנוסחה, מסוננות ב-Airtable.
 * pace: הקצב המשותף. 429: מחכים 30 שניות ומנסים פעם אחת נוספת (קריאה, ולכן בטוח לחזור).
 */
export async function listAll({ baseId, token, table, fields, filterByFormula, fetchImpl = fetch, pace = async () => {}, wait = sleep }) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    for (const f of fields ?? []) params.append("fields[]", f);
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (offset) params.set("offset", offset);
    const url = `${API_URL}/${baseId}/${encodeURIComponent(table)}?${params}`;
    let res;
    for (let attempt = 1; ; attempt++) {
      await pace();
      try {
        res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
      } catch (e) {
        throw new AirtableError("network", String(e?.message ?? e));
      }
      if (res.status !== 429 || attempt === 2) break;
      await wait(RATE_LIMIT_WAIT_MS);
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

/** השדות שהלוח קורא מכל טבלה: אלה שבספק (SCHEMA), ולא שדות נוספים שמישהו הוסיף ב-Airtable. */
const FIELDS = Object.fromEntries(SCHEMA.map((t) => [t.name, t.fields.map((f) => f.name)]));

/**
 * קורא את ארבע הטבלאות וממיר למבנה של הלוח, לפי "עכשיו" שמגיע מהשרת.
 * רק השדות שבספק, ובמשלוחים רק משלוחי היום. הטבלאות במקביל, אבל דרך קצב משותף (SPEC.md, נתונים / קצב).
 */
export async function loadDashboard({ baseId, token, now, fetchImpl = fetch, wait = sleep, clock = Date.now }) {
  if (!baseId || !token) throw new AirtableError("config");
  const pace = createPacer({ now: clock, wait });
  const filters = { [TABLES.shipments]: shipmentsOfDay(String(now ?? "").slice(0, 10)) };
  const names = Object.entries(TABLES);
  const lists = await Promise.all(
    names.map(([, table]) => listAll({ baseId, token, table, fields: FIELDS[table], filterByFormula: filters[table], fetchImpl, pace, wait })),
  );
  const raw = Object.fromEntries(names.map(([key], i) => [key, lists[i]]));
  try {
    return fromAirtable(raw, now);
  } catch (e) {
    throw new AirtableError("data", String(e?.message ?? e));
  }
}
