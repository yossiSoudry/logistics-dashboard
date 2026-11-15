// SPEC.md, "גמור": נתונים מ-Airtable (האתר פונה לפונקציה, בלי טוקן)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { fetchDashboard } from "../src/lib/dashboard-api.js";
import { ERROR_MESSAGES } from "../src/lib/airtable-client.js";

const data = loadMockData();
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("פונה ל-/api/dashboard בכתובת הפונקציה, בלי טוקן ובלי Airtable", async () => {
  let seen;
  const out = await fetchDashboard({
    apiUrl: "https://fn.example/",
    fetchImpl: async (url, init) => ((seen = { url, init }), res(200, { data, skipped: 0 })),
  });
  assert.equal(seen.url, "https://fn.example/api/dashboard");
  assert.equal(seen.init.headers.Authorization, undefined);
  assert.ok(!seen.url.includes("airtable"));
  assert.deepEqual(out.data, data);
});

test("סוג השגיאה מהפונקציה הופך להודעה בעברית", async () => {
  for (const kind of ["auth", "forbidden", "rate", "origin"]) {
    await assert.rejects(
      fetchDashboard({ apiUrl: "https://fn.example", fetchImpl: async () => res(502, { error: { kind } }) }),
      (e) => e.kind === kind && e.message === ERROR_MESSAGES[kind],
    );
  }
});

test("פונקציה שלא עונה ב-JSON, רשת שנפלה, וכתובת חסרה", async () => {
  await assert.rejects(
    fetchDashboard({ apiUrl: "https://fn.example", fetchImpl: async () => ({ ok: false, status: 504, json: async () => { throw new SyntaxError("x"); } }) }),
    (e) => e.kind === "api",
  );
  await assert.rejects(
    fetchDashboard({ apiUrl: "https://fn.example", fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }),
    (e) => e.kind === "network",
  );
  await assert.rejects(fetchDashboard({ apiUrl: "" }), (e) => e.kind === "config");
});
