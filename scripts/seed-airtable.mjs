// יוצר את הטבלאות ב-Airtable וטוען את נתוני הדמה. SPEC.md, נתונים / כתיבה.
//
//   pnpm seed                    יוצר טבלאות ורשומות חסרות. בטוח להרצה חוזרת; לא דורס עריכה ב-Airtable.
//   pnpm seed -- --dry-run       חזרה גנרלית: מחשב וסופר מה ייכתב, בלי לכתוב כלום.
//   pnpm seed -- --base appXXX   מריץ על בסיס אחר, למשל עותק של הבסיס, לחזרה על נתונים אמיתיים.
//   pnpm seed -- --restore       מחזיר לערכים שבקובץ רשומות ששונו ב-Airtable (רק כשרוצים לאפס את הדמו).
//
// משתנים (.env): AIRTABLE_BASE_ID, AIRTABLE_WRITE_TOKEN
// טוקן הכתיבה צריך: data.records:read, data.records:write, schema.bases:read, schema.bases:write

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SCHEMA } from "../src/lib/airtable.js";
import { API_URL, loadDashboard } from "../src/lib/airtable-client.js";
import { KEY_FIELD, WRITE_ORDER, countsAddUp, desiredFromFile, planTable, resolveLinks, toKeyForm } from "../src/lib/seed-plan.js";

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * בקשה ל-Airtable. 220ms בין בקשות (5 בקשות בשנייה לבסיס).
 * בטוח לנסות שוב: 429 (הבקשה נדחתה, כלום לא נכתב) - מחכים 30 שניות ומנסים שוב.
 * לא בטוח: בקשה שנפלה ברשת אולי כן נקלטה, אז לא שולחים אותה שוב. מריצים את הסקריפט מחדש,
 * והוא משלים רק את מה שחסר.
 */
export function airtableApi(token, { fetchImpl = fetch, wait = sleep } = {}) {
  return async function api(method, path, body) {
    for (let attempt = 1; ; attempt++) {
      await wait(220);
      const res = await fetchImpl(`${API_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 429 && attempt < 4) {
        await wait(30_000);
        continue;
      }
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
  };
}

async function listRecords(api, baseId, table) {
  const out = [];
  let offset;
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (offset) q.set("offset", offset);
    const body = await api("GET", `/${baseId}/${encodeURIComponent(table)}?${q}`);
    out.push(...(body.records ?? []));
    offset = body.offset;
  } while (offset);
  return out;
}

/** הטבלאות והשדות לפי SCHEMA. ב-dry-run רק מדווח מה חסר. */
async function ensureSchema(api, baseId, { dryRun, log }) {
  const existing = new Map((await api("GET", `/meta/bases/${baseId}/tables`)).tables.map((t) => [t.name, t]));
  const missing = [];
  const tableIds = {};
  for (const table of SCHEMA) {
    const fieldDef = (f) =>
      f.link
        ? { name: f.name, type: "multipleRecordLinks", options: { linkedTableId: tableIds[f.link] } }
        : { name: f.name, type: f.type, ...(f.options ? { options: f.options } : {}), ...(f.description ? { description: f.description } : {}) };
    const found = existing.get(table.name);
    if (!found) {
      missing.push(table.name);
      if (dryRun) {
        log(`· הטבלה ${table.name} חסרה: תיווצר`);
        continue;
      }
      const created = await api("POST", `/meta/bases/${baseId}/tables`, { name: table.name, fields: table.fields.map(fieldDef) });
      tableIds[table.name] = created.id;
      log(`✓ נוצרה הטבלה ${table.name}`);
      continue;
    }
    tableIds[table.name] = found.id;
    if (found.fields[0]?.name !== table.fields[0].name) {
      throw new Error(`בטבלה ${table.name} השדה הראשי הוא "${found.fields[0]?.name}" ולא "${table.fields[0].name}". מחקו אותה ב-Airtable והריצו שוב.`);
    }
    const have = new Set(found.fields.map((f) => f.name));
    for (const f of table.fields.slice(1)) {
      if (have.has(f.name)) continue;
      if (dryRun) {
        log(`· השדה ${table.name}.${f.name} חסר: ייווסף`);
        continue;
      }
      await api("POST", `/meta/bases/${baseId}/tables/${found.id}/fields`, fieldDef(f));
      log(`✓ נוסף השדה ${table.name}.${f.name}`);
    }
  }
  return { missing, hasTableOne: existing.has("Table 1") };
}

/**
 * הטעינה כולה. api מוזרק, כדי שאפשר לבדוק בלי רשת (test/seed.test.js).
 * מחזיר דוח: לכל טבלה כמה בקובץ, נדחו בכניסה, נוצרו, כבר היו, שונות (נשארו או שוחזרו), מיותרות, ובסוף.
 */
export async function runSeed({ api, baseId, data, dryRun = false, restore = false, log = () => {} }) {
  const { desired, rejected } = desiredFromFile(data);
  for (const r of rejected) log(`✖ נדחתה בכניסה: ${r.table} ${r.key}: ${r.reason}`);

  const schema = await ensureSchema(api, baseId, { dryRun, log });

  const keyOfId = {};
  const idOfKey = {};
  const report = [];
  for (const table of WRITE_ORDER) {
    const keyField = KEY_FIELD[table];
    const records = schema.missing.includes(table) ? [] : await listRecords(api, baseId, table);
    const existing = records.map((r) => ({ id: r.id, fields: toKeyForm(r.fields, keyOfId) }));
    const plan = planTable(table, desired[table], existing);
    const rejectedHere = rejected.filter((r) => r.table === table).length;
    const inFile = desired[table].length + rejectedHere;
    if (!countsAddUp(inFile, plan, rejectedHere)) throw new Error(`הספירה ב-${table} לא מסתכמת. עוצרים לפני שכותבים.`);

    keyOfId[table] = new Map(records.map((r) => [r.id, String(r.fields[keyField] ?? "").trim()]));
    idOfKey[table] = new Map(records.map((r) => [String(r.fields[keyField] ?? "").trim(), r.id]));

    let created = 0;
    let restored = 0;
    let filled = 0;
    if (!dryRun) {
      for (const batch of chunks(plan.create, 10)) {
        const res = await api("POST", `/${baseId}/${encodeURIComponent(table)}`, { records: batch.map((f) => ({ fields: resolveLinks(f, idOfKey) })) });
        for (const r of res.records) {
          const key = String(r.fields[keyField]).trim();
          keyOfId[table].set(r.id, key);
          idOfKey[table].set(key, r.id);
        }
        created += res.records.length;
      }
      if (restore) {
        for (const batch of chunks(plan.differs, 10)) {
          await api("PATCH", `/${baseId}/${encodeURIComponent(table)}`, { records: batch.map((d) => ({ id: d.id, fields: resolveLinks(d.fields, idOfKey) })) });
          restored += batch.length;
        }
      }
      // שדות ריקים: ממלאים רק אותם, בלי לגעת בשדה שנערך (ב---restore הרשומות השונות כבר עודכנו במלואן)
      const toFill = [...plan.fill, ...(restore ? [] : plan.differs.filter((d) => d.filled.length > 0))];
      for (const batch of chunks(toFill, 10)) {
        await api("PATCH", `/${baseId}/${encodeURIComponent(table)}`, { records: batch.map((d) => ({ id: d.id, fields: resolveLinks(d.blanks, idOfKey) })) });
        filled += batch.length;
      }
    } else {
      // ב-dry-run אין מזהים חדשים; קישורים לרשומות שהיו נוצרות מסומנים במפתח עצמו
      for (const f of plan.create) idOfKey[table].set(String(f[keyField]).trim(), `(new)${f[keyField]}`);
    }

    const row = {
      table,
      inFile,
      rejectedAtDoor: rejectedHere,
      toCreate: plan.create.length,
      created,
      alreadyThere: plan.same.length,
      toFill: plan.fill.length,
      filled,
      differs: plan.differs.length,
      restored,
      extraInAirtable: plan.extra.length,
      differsDetail: plan.differs.map((d) => `${d.key}: ${d.changed.join(", ")}`),
      extraDetail: plan.extra,
    };
    report.push(row);
    log(
      `${dryRun ? "·" : "✓"} ${table}: בקובץ ${inFile} = ${dryRun ? "ייווצרו" : "נוצרו"} ${dryRun ? plan.create.length : created}` +
        ` + כבר היו ${plan.same.length} + מולאו שדות ריקים ${plan.fill.length} + שונות ${plan.differs.length}${restore && !dryRun ? ` (שוחזרו ${restored})` : " (נשארו, Airtable הבעלים)"}` +
        ` + נדחו ${rejectedHere}` + (plan.extra.length ? ` · מיותרות ב-Airtable: ${plan.extra.length} (לא נמחקו)` : ""),
    );
    for (const d of row.differsDetail) log(`    שונה: ${d}`);
    for (const f of plan.fill) log(`    ${dryRun ? "יתמלא" : "מולא"}: ${f.key}: ${f.filled.join(", ")}`);
  }

  // ספירה יוצאת: מה שיש עכשיו ב-Airtable
  let countOut = null;
  if (!dryRun) {
    countOut = {};
    for (const table of WRITE_ORDER) {
      const records = await listRecords(api, baseId, table);
      const keys = records.map((r) => String(r.fields[KEY_FIELD[table]] ?? "").trim());
      const wanted = desired[table].map((f) => String(f[KEY_FIELD[table]]).trim());
      const missingKeys = wanted.filter((k) => !keys.includes(k));
      const duplicates = keys.filter((k, i) => k && keys.indexOf(k) !== i);
      countOut[table] = { records: records.length, missing: missingKeys.length, duplicates: duplicates.length };
      if (missingKeys.length || duplicates.length) {
        throw new Error(`ספירה יוצאת ב-${table}: חסרות ${missingKeys.length}, כפולות ${duplicates.length}`);
      }
    }
  }
  return { dryRun, restore, rejected, report, countOut, hasTableOne: schema.hasTableOne };
}

// ---------------------------------------------------------------------------
// הרצה מהטרמינל

async function main() {
  const args = process.argv.slice(2);
  const arg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const baseId = arg("--base") ?? process.env.AIRTABLE_BASE_ID;
  const token = process.env.AIRTABLE_WRITE_TOKEN;
  const dryRun = args.includes("--dry-run");
  const restore = args.includes("--restore");
  if (!baseId || !token) throw new Error("חסרים AIRTABLE_BASE_ID או AIRTABLE_WRITE_TOKEN ב-.env (ראו .env.example).");

  const data = JSON.parse(readFileSync(new URL("../data/mock-data.json", import.meta.url), "utf8"));
  console.log(`בסיס: ${baseId}${dryRun ? " · חזרה גנרלית, בלי לכתוב" : ""}${restore ? " · שחזור נתוני הדמה" : ""}\n`);
  const started = new Date();
  const result = await runSeed({ api: airtableApi(token), baseId, data, dryRun, restore, log: (l) => console.log(l) });

  if (!dryRun) {
    // אותה קריאה שהפונקציה עושה: אם אין שונות ואין מיותרות, הלוח צריך לראות בדיוק את הקובץ
    const { data: back, rejected } = await loadDashboard({ baseId, token, now: data.now });
    const clean = result.report.every((r) => r.differs === r.restored && r.extraInAirtable === 0);
    console.log(`\nקריאה חוזרת דרך אותו קוד של הלוח: ${rejected.length} רשומות לא תקינות` +
      (clean ? `, ${JSON.stringify(back) === JSON.stringify(data) ? "זהה לקובץ ✓" : "לא זהה לקובץ ✖"}` : " (יש שינויים ב-Airtable, ולכן לא משווים לקובץ)"));
  }

  mkdirSync(new URL("../logs/", import.meta.url), { recursive: true });
  const file = new URL(`../logs/seed-${started.toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify({ when: started.toISOString(), base: baseId, source: "data/mock-data.json", by: "pnpm seed (token dashboard-seed)", ...result }, null, 2) + "\n");
  console.log(`\nנרשם ב-${fileURLToPath(file)}`);
  if (result.hasTableOne) console.log('אפשר למחוק ב-Airtable את הטבלה "Table 1" שנוצרה עם הבסיס. היא לא בשימוש.');
  if (!dryRun) console.log("סיימתם לטעון? אפשר למחוק את טוקן הכתיבה. הלוח צריך רק את טוקן הקריאה, שב-Vercel.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`\n✖ ${e.message}\n`);
    process.exit(1);
  });
}
