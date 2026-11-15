// SPEC.md, נתונים / כתיבה: שש השאלות של שיעור 5, על Airtable מדומה בזיכרון
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData, fakeAirtable } from "./helpers.js";
import { runSeed, airtableApi } from "../scripts/seed-airtable.mjs";
import { desiredFromFile, planTable } from "../src/lib/seed-plan.js";
import { SCHEMA, fromAirtable } from "../src/lib/airtable.js";

const data = loadMockData();
const TOTAL = 3 + 4 + data.inventory.length + data.shipments.length + 1;

/** Airtable בזיכרון: מבנה, רשומות, דפדוף, יצירה ועדכון. failAfter: ליפול אחרי N יצירות. */
function memoryAirtable({ tables = true, failAfter = Infinity } = {}) {
  const net = { failAfter };
  const db = new Map();
  let n = 0;
  let creates = 0;
  const calls = { POST: 0, PATCH: 0, GET: 0, DELETE: 0 };
  if (tables) for (const t of SCHEMA) db.set(t.name, { id: `tbl${t.name}`, fields: t.fields.map((f) => ({ name: f.name })), records: [] });
  const api = async (method, path, body) => {
    calls[method] += 1;
    if (path.startsWith("/meta/bases/")) {
      if (method === "GET") return { tables: [...db.entries()].map(([name, t]) => ({ id: t.id, name, fields: t.fields })) };
      if (path.endsWith("/tables")) {
        db.set(body.name, { id: `tbl${body.name}`, fields: body.fields.map((f) => ({ name: f.name })), records: [] });
        return { id: `tbl${body.name}` };
      }
      return {};
    }
    const url = new URL(`https://x${path}`);
    const table = db.get(decodeURIComponent(url.pathname.split("/")[2]));
    if (method === "GET") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const page = table.records.slice(offset, offset + 100);
      return { records: structuredClone(page), ...(offset + 100 < table.records.length ? { offset: String(offset + 100) } : {}) };
    }
    if (method === "POST") {
      if (creates >= net.failAfter) throw new Error("network down");
      creates += 1;
      const created = body.records.map((r) => ({ id: `rec${++n}`, createdTime: new Date(1e12 + n).toISOString(), fields: structuredClone(r.fields) }));
      table.records.push(...created);
      return { records: structuredClone(created) };
    }
    if (method === "PATCH") {
      for (const r of body.records) Object.assign(table.records.find((x) => x.id === r.id).fields, r.fields);
      return { records: [] };
    }
    throw new Error(`unexpected ${method}`);
  };
  const raw = () => ({
    warehouses: db.get("Warehouses").records, contractors: db.get("Contractors").records, inventory: db.get("Inventory").records,
    shipments: db.get("Shipments").records, settings: db.get("Settings").records,
  });
  return { api, db, calls, raw, net, writes: () => calls.POST + calls.PATCH };
}
const sum = (report, key) => report.reduce((s, r) => s + r[key], 0);
const fresh = () => structuredClone(data);

test("בסיס ריק: נוצר הכל, הספירה מסתכמת, והלוח קורא בדיוק את הקובץ", async () => {
  const m = memoryAirtable({ tables: false });
  const res = await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  assert.equal(sum(res.report, "created"), TOTAL);
  for (const r of res.report) assert.equal(r.inFile, r.created + r.alreadyThere + r.differs + r.rejectedAtDoor);
  assert.deepEqual(fromAirtable(m.raw()).data, data);
  assert.deepEqual(fromAirtable(m.raw()).rejected, []);
});

test("פעמיים: הרצה שנייה לא כותבת כלום ולא מכפילה", async () => {
  const m = memoryAirtable();
  await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  const before = m.writes();
  const res = await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  assert.equal(m.writes(), before);
  assert.equal(sum(res.report, "created"), 0);
  assert.equal(sum(res.report, "alreadyThere"), TOTAL);
  assert.equal(m.db.get("Shipments").records.length, data.shipments.length);
});

test("בעלים: עריכה ב-Airtable לא נדרסת, רק --restore מחזיר אותה לקובץ", async () => {
  const m = memoryAirtable();
  await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  m.db.get("Shipments").records.find((r) => r.fields.ID === "SH-1000").fields.Status = "נמסר";
  const kept = await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  const row = kept.report.find((r) => r.table === "Shipments");
  assert.equal(row.differs, 1);
  assert.deepEqual(row.differsDetail, ["SH-1000: Status"]);
  assert.equal(m.db.get("Shipments").records.find((r) => r.fields.ID === "SH-1000").fields.Status, "נמסר");
  await runSeed({ api: m.api, baseId: "appT", data: fresh(), restore: true });
  assert.equal(m.db.get("Shipments").records.find((r) => r.fields.ID === "SH-1000").fields.Status, "ממתין");
});

test("נכשל באמצע: הרצה חוזרת משלימה רק את מה שחסר, בלי כפולות", async () => {
  const m = memoryAirtable({ failAfter: 5 });
  await assert.rejects(runSeed({ api: m.api, baseId: "appT", data: fresh() }), /network down/);
  const partial = [...m.db.values()].reduce((s, t) => s + t.records.length, 0);
  assert.ok(partial > 0 && partial < TOTAL, `partial ${partial}`);
  m.net.failAfter = Infinity; // הרשת חזרה
  const res = await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  assert.equal(sum(res.report, "created"), TOTAL - partial);
  assert.deepEqual(fromAirtable(m.raw()).data, data);
  assert.deepEqual(fromAirtable(m.raw()).rejected, []);
});

test("חזרה גנרלית: --dry-run לא כותב כלום, וסופר מה ייווצר", async () => {
  const m = memoryAirtable({ tables: false });
  const res = await runSeed({ api: m.api, baseId: "appT", data: fresh(), dryRun: true });
  assert.equal(m.writes(), 0);
  assert.equal(sum(res.report, "toCreate"), TOTAL);
  assert.equal(res.countOut, null);
});

test("נקי בכניסה: רשומה פגומה בקובץ לא נכתבת, נרשמת עם סיבה, והספירה עדיין מסתכמת", async () => {
  const dirty = fresh();
  dirty.shipments[0].status = "lost";
  dirty.inventory[0].quantity = -1;
  const { rejected } = desiredFromFile(dirty);
  assert.equal(rejected.length, 2);
  const m = memoryAirtable();
  const res = await runSeed({ api: m.api, baseId: "appT", data: dirty });
  const ship = res.report.find((r) => r.table === "Shipments");
  assert.equal(ship.rejectedAtDoor, 1);
  assert.equal(ship.created, data.shipments.length - 1);
  assert.equal(ship.inFile, ship.created + ship.alreadyThere + ship.differs + ship.rejectedAtDoor);
  assert.ok(!m.db.get("Inventory").records.some((r) => r.fields.SKU === dirty.inventory[0].sku));
});

test("מיותרות: רשומה שיש רק ב-Airtable מדווחת ולא נמחקת", async () => {
  const m = memoryAirtable();
  await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  m.db.get("Contractors").records.push({ id: "recX", createdTime: "2030-01-01T00:00:00.000Z", fields: { Key: "c9", Name: "חדש" } });
  const res = await runSeed({ api: m.api, baseId: "appT", data: fresh() });
  assert.deepEqual(res.report.find((r) => r.table === "Contractors").extraDetail, ["c9"]);
  assert.equal(m.calls.DELETE, 0);
  assert.ok(m.db.get("Contractors").records.some((r) => r.fields.Key === "c9"));
});

test("תוכנית: השוואה לפי מפתח, קישור לפי מפתח ותאריך לפי רגע", () => {
  const raw = fakeAirtable(data);
  const keyOf = new Map(raw.warehouses.map((r) => [r.id, r.fields.Key]));
  const existing = raw.inventory.map((r) => ({ id: r.id, fields: { ...r.fields, Warehouse: r.fields.Warehouse.map((id) => keyOf.get(id)) } }));
  const plan = planTable("Inventory", desiredFromFile(data).desired.Inventory, existing);
  assert.equal(plan.same.length, data.inventory.length);
  assert.equal(plan.create.length + plan.differs.length + plan.extra.length, 0);
});

test("429: מחכים ומנסים שוב; שגיאה אחרת לא נשלחת שוב", async () => {
  let calls = 0;
  const waits = [];
  const replies = [{ status: 429 }, { status: 200, body: { ok: 1 } }];
  const api = airtableApi("t", { wait: async (ms) => waits.push(ms), fetchImpl: async () => { const r = replies[calls++]; return { ok: r.status === 200, status: r.status, json: async () => r.body ?? {} }; } });
  assert.deepEqual(await api("POST", "/x", {}), { ok: 1 });
  assert.equal(calls, 2);
  assert.ok(waits.includes(30_000));
  let n = 0;
  const failing = airtableApi("t", { wait: async () => {}, fetchImpl: async () => { n++; return { ok: false, status: 500, json: async () => ({}) }; } });
  await assert.rejects(failing("POST", "/x", {}), /HTTP 500/);
  assert.equal(n, 1);
});
