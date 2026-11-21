// SPEC.md, גמור / עד כניסת שבת: הפונקציה /api/shabbat מול Hebcal מדומה (תשובות אמיתיות מ-test/fixtures/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleShabbat, SHABBAT_CACHE_SECONDS } from "../api/shabbat.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const TEL_AVIV_NOV = fixture("hebcal-tel-aviv-2026-11-08.json");
const PAGES = "https://yossisoudry.github.io";

const req = (query, { origin = PAGES, method = "GET" } = {}) =>
  new Request(`https://fn.example/api/shabbat${query}`, { method, headers: origin ? { origin } : {} });

/** Hebcal מדומה: עונה עם התשובה האמיתית שנשמרה, ורושם כל קריאה. */
function hebcal(override) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (override) return override(url);
    return { ok: true, status: 200, json: async () => TEL_AVIV_NOV };
  };
  return { fetchImpl, calls };
}

test("שבוע בתל אביב: כל העצירות של השבוע ושל זה שאחריו, בקריאה אחת, עם שמירה של שש שעות בשרת", async () => {
  const h = hebcal();
  const res = await handleShabbat(req("?geonameid=293397&week=2026-11-08"), h.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("vercel-cdn-cache-control"), `max-age=${SHABBAT_CACHE_SECONDS}`);
  assert.equal(SHABBAT_CACHE_SECONDS, 21600);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), {
    location: { geonameid: 293397, title: "Tel Aviv, Israel" },
    week: "2026-11-08",
    stops: [
      { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" },
      { kind: "shabbat", title: "פרשת ויצא", shabbat: true, candles: "2026-11-20T16:18:00", havdalah: "2026-11-21T17:17:00" },
    ],
    source: "Hebcal.com",
  });
  // טווח מפורש: מיום ראשון ועד השבת של השבוע שאחריו
  assert.equal(h.calls.length, 1);
  const u = new URL(h.calls[0]);
  assert.equal(u.origin + u.pathname, "https://www.hebcal.com/hebcal");
  assert.equal(u.searchParams.get("geonameid"), "293397");
  assert.equal(u.searchParams.get("start"), "2026-11-08");
  assert.equal(u.searchParams.get("end"), "2026-11-21");
});

test("המטמון לפי עיר ושבוע: אין שעה בכתובת, ושבוע שלא מתחיל ביום ראשון נדחה", async () => {
  // כל דקה של "עכשיו" באותו שבוע = אותה כתובת = אותה רשומה במטמון
  const h = hebcal();
  for (const day of ["2026-11-09", "2026-11-13", "2026-11-14"]) {
    const res = await handleShabbat(req(`?geonameid=293397&week=${day}`), h.fetchImpl);
    assert.equal(res.status, 400, day);
    assert.match((await res.json()).error.message, /יום ראשון/);
  }
  assert.equal(h.calls.length, 0);
});

test("קלט שבור נדחה ב-400 בדלת, ו-Hebcal לא שומע עליו", async () => {
  const h = hebcal();
  const queries = [
    "",
    "?geonameid=abc&week=2026-11-08",
    "?geonameid=0&week=2026-11-08",
    "?geonameid=-5&week=2026-11-08",
    "?geonameid=293397",
    "?geonameid=293397&week=tomorrow",
    "?geonameid=293397&week=2026-13-40",
    "?geonameid=293397&from=2026-11-08T18:00:00",
  ];
  for (const q of queries) {
    const res = await handleShabbat(req(q), h.fetchImpl);
    assert.equal(res.status, 400, q);
    const body = await res.json();
    assert.equal(body.error.kind, "input");
    assert.match(body.error.message, /[֐-׿]/);
  }
  assert.equal(h.calls.length, 0);
});

test("Hebcal נופל, מחזיר שגיאה, תשובה בפורמט אחר או בלי הדלקת נרות: 502 שלנו, בלי שמירה", async () => {
  const cases = [
    async () => { throw new TypeError("fetch failed"); },
    async () => ({ ok: false, status: 503, json: async () => ({}) }),
    async () => ({ ok: true, status: 200, json: async () => ({ unexpected: true }) }),
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("html"); } }),
    async () => ({ ok: true, status: 200, json: async () => ({ location: {}, items: [] }) }),
  ];
  for (const c of cases) {
    const res = await handleShabbat(req("?geonameid=293397&week=2026-11-08"), hebcal(c).fetchImpl);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.kind, "external");
    assert.equal(res.headers.get("vercel-cdn-cache-control"), null);
  }
});

test("אותו כלל מקור כמו /api/dashboard, ורק GET", async () => {
  const h = hebcal();
  const q = "?geonameid=293397&week=2026-11-08";
  assert.equal((await handleShabbat(req(q, { origin: "https://evil.example" }), h.fetchImpl)).status, 403);
  assert.equal((await handleShabbat(req(q, { origin: null }), h.fetchImpl)).status, 403);
  assert.equal((await handleShabbat(req(q, { method: "POST" }), h.fetchImpl)).status, 405);
  assert.equal((await handleShabbat(req("", { method: "OPTIONS" }), h.fetchImpl)).status, 204);
  assert.equal(h.calls.length, 0);
});
