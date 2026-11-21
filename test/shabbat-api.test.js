// SPEC.md, גמור / עד כניסת שבת: האתר פונה רק ל-/api/shabbat שלנו, לפי עיר ושבוע, ובוחר בעצמו את העצירה הבאה
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchShabbat, nextStop } from "../src/lib/shabbat-api.js";

const toldot = { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" };
const vayetze = { kind: "shabbat", title: "פרשת ויצא", shabbat: true, candles: "2026-11-20T16:18:00", havdalah: "2026-11-21T17:17:00" };
const ok = { location: { geonameid: 293397, title: "Tel Aviv, Israel" }, week: "2026-11-08", stops: [toldot, vayetze] };
const reply = (body, status = 200) => async () => ({ ok: status === 200, status, json: async () => body });

test("פונה ל-/api/shabbat שלנו עם geonameid ו-week, בלי שעה בכתובת, ולא ל-Hebcal", async () => {
  let seen;
  const out = await fetchShabbat({ apiUrl: "https://fn.example/", geonameid: 293397, week: "2026-11-08", fetchImpl: async (url) => ((seen = url), reply(ok)()) });
  assert.equal(seen, "https://fn.example/api/shabbat?geonameid=293397&week=2026-11-08");
  assert.ok(!seen.includes("hebcal"));
  assert.deepEqual(out, { location: ok.location, stops: ok.stops });
});

test("העצירה הבאה לפי \"עכשיו\": לפני הדלקת הנרות, ברגע שלה, ובמוצאי שבת", () => {
  assert.equal(nextStop(ok.stops, "2026-11-08T18:00:00"), toldot);
  assert.equal(nextStop(ok.stops, "2026-11-13T16:21:59"), toldot);
  assert.equal(nextStop(ok.stops, "2026-11-13T16:22:00"), vayetze);
  assert.equal(nextStop(ok.stops, "2026-11-14T20:00:00"), vayetze);
  assert.equal(nextStop(ok.stops, "2026-11-21T18:00:00"), null);
});

test("שגיאה מהפונקציה, תשובה בלי עצירות, ורשת שנפלה", async () => {
  const base = { apiUrl: "https://fn.example", geonameid: 1, week: "2026-11-08" };
  await assert.rejects(
    fetchShabbat({ ...base, fetchImpl: reply({ error: { kind: "external", message: "זמני השבת מ-Hebcal לא זמינים כרגע." } }, 502) }),
    (e) => e.kind === "external" && /Hebcal/.test(e.message),
  );
  await assert.rejects(fetchShabbat({ ...base, fetchImpl: reply({ stops: [] }) }), (e) => e.kind === "external");
  await assert.rejects(
    fetchShabbat({ ...base, fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "network",
  );
});
