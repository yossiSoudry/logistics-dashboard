// SPEC.md, "גמור": נתונים מ-Airtable (דפדוף, שגיאות, בלי נפילה שקטה)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData, fakeAirtable } from "./helpers.js";
import { listAll, loadDashboard, classifyStatus, AirtableError, ERROR_MESSAGES } from "../src/lib/airtable-client.js";

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
      loadDashboard({ baseId: "appX", token: "t", fetchImpl: async () => json(status, { error: { type: "X" } }) }),
      (e) => e instanceof AirtableError && e.kind === kind && e.message === ERROR_MESSAGES[kind],
    );
  }
});

test("בלי רשת ובלי פרטי חיבור: הודעות משלהן", async () => {
  await assert.rejects(
    loadDashboard({ baseId: "appX", token: "t", fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "network",
  );
  await assert.rejects(loadDashboard({ baseId: "", token: "t" }), (e) => e.kind === "config");
  await assert.rejects(loadDashboard({ baseId: "appX", token: undefined }), (e) => e.kind === "config");
});

test("כל ההודעות בעברית", () => {
  for (const m of Object.values(ERROR_MESSAGES)) assert.match(m, /[֐-׿]/);
});
