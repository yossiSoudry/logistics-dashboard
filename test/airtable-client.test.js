// SPEC.md, "גמור": נתונים מ-Airtable (דפדוף, שגיאות, בלי נפילה שקטה)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData, fakeAirtable } from "./helpers.js";
import { listAll, loadDashboard, classifyStatus, createPacer, shipmentsOfDay, AirtableError, ERROR_MESSAGES, RATE_LIMIT_WAIT_MS } from "../src/lib/airtable-client.js";

const data = loadMockData();
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("דפדוף: טבלה עם יותר מ-100 רשומות נטענת במלואה", async () => {
  const all = Array.from({ length: 250 }, (_, i) => ({ id: `rec${i}`, fields: { n: i } }));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const offset = Number(new URL(url).searchParams.get("offset") ?? 0);
    const page = all.slice(offset, offset + 100);
    return json(200, { records: page, ...(offset + 100 < all.length ? { offset: String(offset + 100) } : {}) });
  };
  const records = await listAll({ baseId: "appX", token: "t", table: "Shipments", fetchImpl });
  assert.equal(records.length, 250);
  assert.equal(calls.length, 3);
  assert.match(calls[0], /^https:\/\/api\.airtable\.com\/v0\/appX\/Shipments\?pageSize=100$/);
});

test("הטוקן נשלח בכותרת Authorization ולא בכתובת", async () => {
  let seen;
  await listAll({ baseId: "appX", token: "patSECRET", table: "Shipments", fetchImpl: async (url, init) => ((seen = { url, init }), json(200, { records: [] })) });
  assert.equal(seen.init.headers.Authorization, "Bearer patSECRET");
  assert.ok(!seen.url.includes("patSECRET"));
});

test("קריאה מלאה של ארבע הטבלאות מחזירה את נתוני הדמה", async () => {
  const raw = fakeAirtable(data);
  const byTable = { Warehouses: raw.warehouses, Contractors: raw.contractors, Inventory: raw.inventory, Shipments: raw.shipments };
  const fetchImpl = async (url) => json(200, { records: byTable[decodeURIComponent(new URL(url).pathname.split("/").pop())] });
  const { data: back } = await loadDashboard({ baseId: "appX", token: "t", now: data.now, fetchImpl });
  assert.deepEqual(back, data);
});

test("קודי HTTP הופכים לסוגי שגיאה", () => {
  assert.equal(classifyStatus(401), "auth");
  assert.equal(classifyStatus(403), "forbidden");
  assert.equal(classifyStatus(404), "not_found");
  assert.equal(classifyStatus(429), "rate");
  assert.equal(classifyStatus(500), "server");
});

test("שגיאה היא AirtableError עם הודעה בעברית, לא נפילה שקטה", async () => {
  for (const [status, kind] of [[401, "auth"], [403, "forbidden"], [429, "rate"]]) {
    await assert.rejects(
      loadDashboard({ baseId: "appX", token: "t", now: data.now, wait: async () => {}, fetchImpl: async () => json(status, { error: { type: "X" } }) }),
      (e) => e instanceof AirtableError && e.kind === kind && e.message === ERROR_MESSAGES[kind],
    );
  }
});

test("בלי רשת ובלי פרטי חיבור: הודעות משלהן", async () => {
  await assert.rejects(
    loadDashboard({ baseId: "appX", token: "t", now: data.now, fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "network",
  );
  await assert.rejects(loadDashboard({ baseId: "", token: "t" }), (e) => e.kind === "config");
  await assert.rejects(loadDashboard({ baseId: "appX", token: undefined }), (e) => e.kind === "config");
});

test("כל ההודעות בעברית", () => {
  for (const m of Object.values(ERROR_MESSAGES)) assert.match(m, /[֐-׿]/);
});

// ---- עומס על Airtable (SPEC.md, נתונים / קצב)

test("רק השדות שבספק, ובמשלוחים רק משלוחי היום, מסוננים ב-Airtable", async () => {
  const raw = fakeAirtable(data);
  const byTable = { Warehouses: raw.warehouses, Contractors: raw.contractors, Inventory: raw.inventory, Shipments: raw.shipments };
  const seen = {};
  const fetchImpl = async (url) => {
    const u = new URL(url);
    const table = decodeURIComponent(u.pathname.split("/").pop());
    seen[table] = { fields: u.searchParams.getAll("fields[]"), filter: u.searchParams.get("filterByFormula") };
    return json(200, { records: byTable[table] });
  };
  await loadDashboard({ baseId: "appX", token: "t", now: data.now, fetchImpl });
  assert.deepEqual(seen.Warehouses.fields, ["Key", "Name", "City", "Geoname ID"]);
  assert.deepEqual(seen.Contractors.fields, ["Key", "Name"]);
  assert.deepEqual(seen.Inventory.fields, ["SKU", "Name", "Warehouse", "Quantity", "Minimum"]);
  assert.deepEqual(seen.Shipments.fields, ["ID", "Customer", "Warehouse", "Contractor", "Status", "Created At"]);
  assert.equal(seen.Shipments.filter, shipmentsOfDay("2026-11-08"));
  for (const t of ["Warehouses", "Contractors", "Inventory"]) assert.equal(seen[t].filter, null, t);
});

test("הנוסחה: היום בשעון ישראל, ומשלוח בלי Created At נשאר כדי שיידחה עם סיבה", () => {
  assert.equal(
    shipmentsOfDay("2026-11-08"),
    "OR({Created At} = BLANK(), DATETIME_FORMAT(SET_TIMEZONE({Created At}, 'Asia/Jerusalem'), 'YYYY-MM-DD') = '2026-11-08')",
  );
  // רק תאריך נכנס לנוסחה, לא טקסט חופשי
  assert.throws(() => shipmentsOfDay("2026-11-08') , TRUE()"), (e) => e.kind === "now");
});

test("קצב: לא יותר מ-4 בקשות בשנייה, גם כשהטבלאות נקראות במקביל", async () => {
  let t = 0;
  const pace = createPacer({ now: () => t, wait: async (ms) => { t += ms; } });
  const starts = [];
  await Promise.all(Array.from({ length: 10 }, () => pace().then(() => starts.push(t))));
  assert.deepEqual(starts, [0, 0, 0, 0, 1000, 1000, 1000, 1000, 2000, 2000]);
  for (const s of starts) assert.ok(starts.filter((x) => x >= s && x < s + 1000).length <= 4);
});

test("429: מחכים 30 שניות ומנסים פעם אחת; 429 שני הוא שגיאת rate", async () => {
  const waits = [];
  const wait = async (ms) => { waits.push(ms); };
  let calls = 0;
  const once = async () => (++calls === 1 ? json(429, {}) : json(200, { records: [{ id: "rec1", fields: {} }] }));
  const records = await listAll({ baseId: "appX", token: "t", table: "Shipments", fetchImpl: once, wait });
  assert.equal(records.length, 1);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [RATE_LIMIT_WAIT_MS]);
  assert.equal(RATE_LIMIT_WAIT_MS, 30000);

  calls = 0;
  waits.length = 0;
  await assert.rejects(listAll({ baseId: "appX", token: "t", table: "Shipments", fetchImpl: async () => (calls++, json(429, {})), wait }), (e) => e.kind === "rate");
  assert.equal(calls, 2);
  assert.deepEqual(waits, [RATE_LIMIT_WAIT_MS]);
});

test("שגיאה אחרת (401, 500) לא נשלחת שוב", async () => {
  for (const status of [401, 500]) {
    let calls = 0;
    await assert.rejects(listAll({ baseId: "appX", token: "t", table: "Shipments", fetchImpl: async () => (calls++, json(status, {})), wait: async () => assert.fail("waited") }));
    assert.equal(calls, 1, String(status));
  }
});
