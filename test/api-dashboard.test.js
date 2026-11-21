// SPEC.md, "גמור": נתונים מ-Airtable (הפונקציה ב-Vercel)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData, fakeAirtable } from "./helpers.js";
import { handleDashboard, isAllowedOrigin } from "../api/dashboard.js";

const data = loadMockData();
const TOKEN = "patTESTTESTTESTTE.0123456789abcdef";
const env = { AIRTABLE_BASE_ID: "appTEST", AIRTABLE_READ_TOKEN: TOKEN, DEMO_NOW: data.now };
const PAGES = "https://yossisoudry.github.io";

const req = (origin, method = "GET") =>
  new Request("https://api.example/api/dashboard", { method, headers: origin ? { origin } : {} });

function airtableOk() {
  const raw = fakeAirtable(data);
  const byTable = { Warehouses: raw.warehouses, Contractors: raw.contractors, Inventory: raw.inventory, Shipments: raw.shipments };
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, auth: init?.headers?.Authorization });
    return { ok: true, status: 200, json: async () => ({ records: byTable[decodeURIComponent(new URL(url).pathname.split("/").pop())] }) };
  };
  return { fetchImpl, seen };
}

test("מהאתר ב-GitHub Pages: 200, הנתונים זהים לקובץ, בלי מטמון, עם CORS לאתר בלבד", async () => {
  const { fetchImpl, seen } = airtableOk();
  const res = await handleDashboard(req(PAGES), env, fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  // קצב: עשר שניות בשרת של Vercel, לא בדפדפן
  assert.equal(res.headers.get("vercel-cdn-cache-control"), "max-age=10");
  assert.equal(res.headers.get("access-control-allow-origin"), PAGES);
  const body = await res.json();
  assert.deepEqual(body.data, { ...data, nowSource: "demo" });
  // הפונקציה היא זו שפונה ל-Airtable, עם הטוקן: ארבע טבלאות, בלי Settings
  assert.equal(seen.length, 4);
  assert.ok(seen.every((s) => s.auth === `Bearer ${TOKEN}` && s.url.startsWith("https://api.airtable.com/")));
});

test("הטוקן לא מופיע בתשובה לדפדפן, גם בשגיאה", async () => {
  const { fetchImpl } = airtableOk();
  const ok = await (await handleDashboard(req(PAGES), env, fetchImpl)).text();
  assert.ok(!ok.includes(TOKEN) && !ok.includes("patTEST"));
  const failing = async () => ({ ok: false, status: 401, json: async () => ({ error: { type: "AUTHENTICATION_REQUIRED", token: TOKEN } }) });
  const err = await (await handleDashboard(req(PAGES), env, failing)).text();
  assert.ok(!err.includes(TOKEN));
});

test("מקור אחר או בלי מקור: 403, בלי לפנות ל-Airtable", async () => {
  for (const origin of ["https://evil.example", "https://yossisoudry.github.io.evil.example", "http://localhost.evil.example", null]) {
    const { fetchImpl, seen } = airtableOk();
    const res = await handleDashboard(req(origin), env, fetchImpl);
    assert.equal(res.status, 403, String(origin));
    assert.equal(res.headers.get("access-control-allow-origin"), null);
    assert.equal(seen.length, 0);
  }
});

test("פיתוח מקומי מותר: localhost ו-127.0.0.1 בכל פורט", () => {
  for (const o of ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:61234", "http://localhost"]) assert.ok(isAllowedOrigin(o), o);
  for (const o of ["https://localhost:5173", "http://localhost:5173.evil.example", "", undefined]) assert.ok(!isAllowedOrigin(o), String(o));
});

test("רק קריאה: OPTIONS מחזיר 204 עם GET בלבד, ו-POST מקבל 405", async () => {
  const { fetchImpl, seen } = airtableOk();
  const pre = await handleDashboard(req(PAGES, "OPTIONS"), env, fetchImpl);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-methods"), "GET, OPTIONS");
  const post = await handleDashboard(req(PAGES, "POST"), env, fetchImpl);
  assert.equal(post.status, 405);
  assert.equal(seen.length, 0);
});

test("שגיאות של Airtable עוברות לאתר כסוג והודעה בעברית", async () => {
  for (const [status, kind] of [[401, "auth"], [403, "forbidden"], [429, "rate"], [500, "server"]]) {
    const res = await handleDashboard(req(PAGES), env, async () => ({ ok: false, status, json: async () => ({}) }), new Date(), { wait: async () => {} });
    assert.equal(res.status, 502, `${status}`);
    const body = await res.json();
    assert.equal(body.error.kind, kind);
    assert.match(body.error.message, /[֐-׿]/);
  }
});

test("בלי משתני סביבה: 500 עם סוג config", async () => {
  const res = await handleDashboard(req(PAGES), {}, airtableOk().fetchImpl);
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error.kind, "config");
});

test("רשומות לא תקינות מגיעות לאתר עם טבלה, מפתח וסיבה; שגיאה לא נשמרת בשרת", async () => {
  const raw = fakeAirtable(data);
  raw.shipments.find((r) => r.fields.ID === "SH-1000").fields.Status = "אבד";
  const byTable = { Warehouses: raw.warehouses, Contractors: raw.contractors, Inventory: raw.inventory, Shipments: raw.shipments };
  const fetchImpl = async (url) => ({ ok: true, status: 200, json: async () => ({ records: byTable[decodeURIComponent(new URL(url).pathname.split("/").pop())] }) });
  const body = await (await handleDashboard(req(PAGES), env, fetchImpl)).json();
  assert.deepEqual(body.rejected, [{ table: "Shipments", key: "SH-1000", reason: 'סטטוס לא מוכר: "אבד". הסטטוסים המוכרים: ממתין, בדרך, נמסר, נכשל.' }]);
  assert.equal(body.data.shipments.length, data.shipments.length - 1);
  const err = await handleDashboard(req(PAGES), env, async () => ({ ok: false, status: 500, json: async () => ({}) }));
  assert.equal(err.headers.get("vercel-cdn-cache-control"), null);
});

test("DEMO_NOW לא תקין: 500 עם סוג now, בלי לפנות ל-Airtable", async () => {
  const { fetchImpl, seen } = airtableOk();
  const res = await handleDashboard(req(PAGES), { ...env, DEMO_NOW: "2026-02-31T10:00:00" }, fetchImpl);
  assert.equal(res.status, 500);
  assert.equal((await res.json()).error.kind, "now");
  assert.equal(seen.length, 0);
});

test("בלי DEMO_NOW: \"עכשיו\" מהשעון של השרת, ומסומן ככזה", async () => {
  const { fetchImpl } = airtableOk();
  const { DEMO_NOW, ...clockEnv } = env;
  const body = await (await handleDashboard(req(PAGES), clockEnv, fetchImpl, new Date("2026-11-08T14:30:00Z"))).json();
  assert.equal(body.data.now, "2026-11-08T16:30:00");
  assert.equal(body.data.nowSource, "clock");
  // באותו יום: מה שנוצר עד 16:30 בלוח, מה שאחרי נדחה כ"אחרי עכשיו"
  assert.ok(body.data.shipments.every((s) => s.createdAt <= "2026-11-08T16:30:00"));
  assert.ok(body.rejected.every((r) => r.reason === 'Created At אחרי "עכשיו"'));
});
