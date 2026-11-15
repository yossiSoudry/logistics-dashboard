// SPEC.md, גמור / עד כניסת שבת: הפונקציה /api/shabbat מול Hebcal מדומה (תשובות אמיתיות מ-test/fixtures/)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleShabbat, SHABBAT_CACHE_SECONDS } from "../api/shabbat.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const WEEKS = { "2026-11-8": fixture("hebcal-tel-aviv-2026-11-08.json"), "2026-11-15": fixture("hebcal-tel-aviv-2026-11-15.json") };
const PAGES = "https://yossisoudry.github.io";

const req = (query, { origin = PAGES, method = "GET" } = {}) =>
  new Request(`https://fn.example/api/shabbat${query}`, { method, headers: origin ? { origin } : {} });

/** Hebcal מדומה: עונה לפי gy-gm-gd, ורושם כל קריאה. */
function hebcal(override) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (override) return override(url);
    // כמו Hebcal: כל תאריך מקבל את השבוע שלו (8-14 בנובמבר, 15-21 בנובמבר)
    const p = new URL(url).searchParams;
    const d = Number(p.get("gd"));
    const body = p.get("gy") === "2026" && p.get("gm") === "11" ? (d >= 8 && d <= 14 ? WEEKS["2026-11-8"] : d >= 15 && d <= 21 ? WEEKS["2026-11-15"] : undefined) : undefined;
    return { ok: Boolean(body), status: body ? 200 : 404, json: async () => body ?? {} };
  };
  return { fetchImpl, calls };
}

test("ערב שבת לתל אביב: חוזה קצר משלנו, עם שמירה של שש שעות בשרת", async () => {
  const h = hebcal();
  const res = await handleShabbat(req("?geonameid=293397&from=2026-11-08T18:00:00"), h.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("vercel-cdn-cache-control"), `max-age=${SHABBAT_CACHE_SECONDS}`);
  assert.equal(SHABBAT_CACHE_SECONDS, 21600);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), {
    location: { geonameid: 293397, title: "Tel Aviv, Israel" },
    stop: { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" },
    source: "Hebcal.com",
  });
  assert.equal(h.calls.length, 1);
  assert.match(h.calls[0], /^https:\/\/www\.hebcal\.com\/shabbat\?.*geonameid=293397.*gy=2026&gm=11&gd=8/);
});

test("אחרי הדלקת הנרות: עוברים לשבוע הבא", async () => {
  const h = hebcal();
  const res = await handleShabbat(req("?geonameid=293397&from=2026-11-13T17:00"), h.fetchImpl);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(h.calls.length, 2);
  assert.match(h.calls[0], /gd=13/);
  assert.match(h.calls[1], /gd=20/);
  assert.ok(body.stop.candles.startsWith("2026-11-20T"));
});

test("קלט שבור נדחה ב-400 בדלת, ו-Hebcal לא שומע עליו", async () => {
  const h = hebcal();
  for (const q of ["", "?geonameid=abc&from=2026-11-08T18:00:00", "?geonameid=0&from=2026-11-08T18:00:00", "?geonameid=-5&from=2026-11-08T18:00:00", "?geonameid=293397", "?geonameid=293397&from=tomorrow", "?geonameid=293397&from=2026-13-40T99:00:00"]) {
    const res = await handleShabbat(req(q), h.fetchImpl);
    assert.equal(res.status, 400, q);
    const body = await res.json();
    assert.equal(body.error.kind, "input");
    assert.match(body.error.message, /[֐-׿]/);
  }
  assert.equal(h.calls.length, 0);
});

test("Hebcal נופל, מחזיר שגיאה או תשובה בפורמט אחר: 502 שלנו, בלי שמירה", async () => {
  const cases = [
    async () => { throw new TypeError("fetch failed"); },
    async () => ({ ok: false, status: 503, json: async () => ({}) }),
    async () => ({ ok: true, status: 200, json: async () => ({ unexpected: true }) }),
    async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("html"); } }),
  ];
  for (const c of cases) {
    const res = await handleShabbat(req("?geonameid=293397&from=2026-11-08T18:00:00"), hebcal(c).fetchImpl);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error.kind, "external");
    assert.equal(res.headers.get("vercel-cdn-cache-control"), null);
  }
});

test("אותו כלל מקור כמו /api/dashboard, ורק GET", async () => {
  const h = hebcal();
  assert.equal((await handleShabbat(req("?geonameid=293397&from=2026-11-08T18:00:00", { origin: "https://evil.example" }), h.fetchImpl)).status, 403);
  assert.equal((await handleShabbat(req("?geonameid=293397&from=2026-11-08T18:00:00", { origin: null }), h.fetchImpl)).status, 403);
  assert.equal((await handleShabbat(req("?geonameid=293397&from=2026-11-08T18:00:00", { method: "POST" }), h.fetchImpl)).status, 405);
  assert.equal((await handleShabbat(req("", { method: "OPTIONS" }), h.fetchImpl)).status, 204);
  assert.equal(h.calls.length, 0);
});
