// SPEC.md, גמור / עד כניסת שבת: האתר פונה רק ל-/api/shabbat שלנו
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchShabbat } from "../src/lib/shabbat-api.js";

const ok = { location: { geonameid: 293397, title: "Tel Aviv, Israel" }, stop: { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" } };

test("פונה ל-/api/shabbat שלנו עם geonameid ו-from, לא ל-Hebcal", async () => {
  let seen;
  const out = await fetchShabbat({ apiUrl: "https://fn.example/", geonameid: 293397, from: "2026-11-08T18:00:00", fetchImpl: async (url) => ((seen = url), { ok: true, status: 200, json: async () => ok }) });
  assert.equal(seen, "https://fn.example/api/shabbat?geonameid=293397&from=2026-11-08T18%3A00%3A00");
  assert.ok(!seen.includes("hebcal"));
  assert.deepEqual(out, ok);
});

test("שגיאה מהפונקציה, תשובה בלי עצירה, ורשת שנפלה", async () => {
  await assert.rejects(
    fetchShabbat({ apiUrl: "https://fn.example", geonameid: 1, from: "2026-11-08T18:00:00", fetchImpl: async () => ({ ok: false, status: 502, json: async () => ({ error: { kind: "external", message: "זמני השבת מ-Hebcal לא זמינים כרגע." } }) }) }),
    (e) => e.kind === "external" && /Hebcal/.test(e.message),
  );
  await assert.rejects(
    fetchShabbat({ apiUrl: "https://fn.example", geonameid: 1, from: "2026-11-08T18:00:00", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }) }),
    (e) => e.kind === "external",
  );
  await assert.rejects(
    fetchShabbat({ apiUrl: "https://fn.example", geonameid: 1, from: "2026-11-08T18:00:00", fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "network",
  );
});
