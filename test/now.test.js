// SPEC.md, נתונים / הכללים: "עכשיו" הוא הגדרה של השרת, לא נתון ב-Airtable
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveNow } from "../src/lib/now.js";

test("DEMO_NOW קובע את \"עכשיו\" של הדמו, גם בלי שניות", () => {
  assert.deepEqual(resolveNow({ DEMO_NOW: "2026-11-08T18:00:00" }), { now: "2026-11-08T18:00:00", source: "demo" });
  assert.deepEqual(resolveNow({ DEMO_NOW: " 2026-11-08T18:00 " }), { now: "2026-11-08T18:00:00", source: "demo" });
});

test("בלי DEMO_NOW: השעון של השרת, בשעון ישראל (גם בשעון חורף וגם בקיץ)", () => {
  assert.deepEqual(resolveNow({}, new Date("2026-11-21T10:30:00Z")), { now: "2026-11-21T12:30:00", source: "clock" });
  assert.deepEqual(resolveNow({ DEMO_NOW: "" }, new Date("2026-07-01T21:15:00Z")), { now: "2026-07-02T00:15:00", source: "clock" });
});

test("DEMO_NOW לא תקין: null, כדי שהפונקציה תחזיר שגיאת הגדרה", () => {
  for (const bad of ["מחר", "2026-11-08", "2026-02-31T10:00:00", "2026-11-08T25:00:00", "2026-11-08T18:00:00Z"]) {
    assert.equal(resolveNow({ DEMO_NOW: bad }), null, bad);
  }
});
