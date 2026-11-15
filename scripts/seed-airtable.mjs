// יוצר את הטבלאות ב-Airtable וטוען את נתוני הדמה. SPEC.md, "נתונים".
//
//   pnpm seed            טוען לבסיס ריק (עוצר אם כבר יש רשומות)
//   pnpm seed --reset    מוחק את הרשומות בטבלאות של הלוח וטוען מחדש
//
// משתנים (.env): AIRTABLE_BASE_ID, AIRTABLE_WRITE_TOKEN
// טוקן הכתיבה צריך: data.records:read, data.records:write, schema.bases:read, schema.bases:write

import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { SCHEMA, TABLES, toAirtableFields } from "../src/lib/airtable.js";
import { API_URL, listAll, loadDashboard } from "../src/lib/airtable-client.js";

const baseId = process.env.AIRTABLE_BASE_ID;
const token = process.env.AIRTABLE_WRITE_TOKEN;
const reset = process.argv.includes("--reset");

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!baseId || !token) {
  fail("חסרים AIRTABLE_BASE_ID או AIRTABLE_WRITE_TOKEN ב-.env (ראו .env.example).");
}

const data = JSON.parse(readFileSync(new URL("../data/mock-data.json", import.meta.url), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** בקשה ל-Airtable. 220ms בין בקשות: המגבלה היא 5 בקשות בשנייה לבסיס. */
async function api(method, path, body) {
  await sleep(220);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint =
      res.status === 401 ? " (הטוקן לא תקף)" :
      res.status === 403 ? " (לטוקן אין scope מתאים או גישה לבסיס הזה)" :
      res.status === 404 ? " (הבסיס לא נמצא, או שאין לטוקן גישה אליו)" : "";
    throw new Error(`${method} ${path}: HTTP ${res.status}${hint} ${JSON.stringify(json.error ?? json)}`);
  }
  return json;
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

async function main() {
  console.log(`בסיס: ${baseId}`);

  // 1. הטבלאות והשדות
  const existing = new Map((await api("GET", `/meta/bases/${baseId}/tables`)).tables.map((t) => [t.name, t]));
  const tableIds = {};
  for (const table of SCHEMA) {
    const fieldDef = (f) =>
      f.link
        ? { name: f.name, type: "multipleRecordLinks", options: { linkedTableId: tableIds[f.link] } }
        : { name: f.name, type: f.type, ...(f.options ? { options: f.options } : {}) };
    const found = existing.get(table.name);
    if (!found) {
      const created = await api("POST", `/meta/bases/${baseId}/tables`, { name: table.name, fields: table.fields.map(fieldDef) });
      tableIds[table.name] = created.id;
      console.log(`✓ נוצרה הטבלה ${table.name}`);
      continue;
    }
    tableIds[table.name] = found.id;
    const have = new Set(found.fields.map((f) => f.name));
    if (found.fields[0]?.name !== table.fields[0].name) {
      fail(`בטבלה הקיימת ${table.name} השדה הראשי הוא "${found.fields[0]?.name}" ולא "${table.fields[0].name}". מחקו אותה ב-Airtable והריצו שוב.`);
    }
    for (const f of table.fields.slice(1)) {
      if (have.has(f.name)) continue;
      await api("POST", `/meta/bases/${baseId}/tables/${found.id}/fields`, fieldDef(f));
      console.log(`✓ נוסף השדה ${table.name}.${f.name}`);
    }
    console.log(`✓ הטבלה ${table.name} קיימת`);
  }

  // 2. בלי כפילויות: אם יש כבר רשומות, עוצרים (או מוחקים עם --reset)
  for (const table of Object.values(TABLES)) {
    const records = await listAll({ baseId, token, table });
    if (records.length === 0) continue;
    if (!reset) fail(`בטבלה ${table} כבר יש ${records.length} רשומות. כדי למחוק ולטעון מחדש: pnpm seed --reset`);
    for (const batch of chunks(records.map((r) => r.id), 10)) {
      await api("DELETE", `/${baseId}/${encodeURIComponent(table)}?${batch.map((id) => `records[]=${id}`).join("&")}`);
    }
    console.log(`✓ נמחקו ${records.length} רשומות מ-${table}`);
  }

  // 3. הרשומות, לפי הסדר: קודם מה שמקשרים אליו
  const create = async (table, list) => {
    const out = [];
    for (const batch of chunks(list, 10)) {
      const res = await api("POST", `/${baseId}/${encodeURIComponent(table)}`, { records: batch.map((fields) => ({ fields })) });
      out.push(...res.records);
    }
    console.log(`✓ ${out.length} רשומות ב-${table}`);
    return out;
  };
  const plain = toAirtableFields(data);
  const warehouses = await create(TABLES.warehouses, plain.warehouses);
  const contractors = await create(TABLES.contractors, plain.contractors);
  const ids = {
    warehouses: new Map(warehouses.map((r) => [r.fields.Key, r.id])),
    contractors: new Map(contractors.map((r) => [r.fields.Key, r.id])),
  };
  const linked = toAirtableFields(data, ids);
  await create(TABLES.inventory, linked.inventory);
  await create(TABLES.shipments, linked.shipments);
  await create(TABLES.settings, linked.settings);

  // 4. אימות: קוראים בחזרה דרך אותו קוד שהאתר משתמש בו
  const { data: back, rejected } = await loadDashboard({ baseId, token });
  if (rejected.length > 0 || !isDeepStrictEqual(back, data)) {
    fail(`הנתונים שנקראו מ-Airtable לא זהים לקובץ הדמה (רשומות לא תקינות: ${rejected.length}).`);
  }
  console.log("\n✓ הנתונים ב-Airtable זהים לקובץ הדמה.");
  if (existing.has("Table 1")) {
    console.log('  אפשר למחוק ב-Airtable את הטבלה "Table 1" שנוצרה עם הבסיס. היא לא בשימוש.');
  }
  console.log("  עכשיו אפשר למחוק את טוקן הכתיבה. האתר צריך רק את טוקן הקריאה.\n");
}

main().catch((e) => fail(e.message));
