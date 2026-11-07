// SPEC.md, "גמור": משלוחים לפי שעה
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { hourlyCounts, applyFilters, STATUSES } from "../src/logic.js";

const data = loadMockData();

test("עמודה לכל שעה עגולה שיש בה משלוחים, ממוינת מהמוקדמת", () => {
  const rows = hourlyCounts(data.shipments);
  const hours = [...new Set(data.shipments.map((s) => Number(s.createdAt.slice(11, 13))))].sort((a, b) => a - b);
  assert.deepEqual(rows.map((r) => r.hour), hours);
  assert.equal(rows[0].label, `${String(hours[0]).padStart(2, "0")}:00`);
});

test("כל עמודה מפוצלת לארבעת הסטטוסים, והפיצול מסתכם ל-total", () => {
  for (const r of hourlyCounts(data.shipments)) {
    const parts = STATUSES.reduce((sum, st) => sum + r[st], 0);
    assert.equal(parts, r.total);
  }
});

test("סכום כל העמודות שווה למספר המשלוחים, גם אחרי סינון", () => {
  for (const filters of [{}, { warehouseId: "south" }, { contractorId: "c3" }, { warehouseId: "center", contractorId: "c1" }]) {
    const view = applyFilters(data, filters);
    const total = hourlyCounts(view.shipments).reduce((sum, r) => sum + r.total, 0);
    assert.equal(total, view.shipments.length, JSON.stringify(filters));
  }
});

test("שעה בלי משלוחים לא מקבלת עמודה, ואין משלוחים = אין עמודות", () => {
  assert.deepEqual(hourlyCounts([]), []);
  const rows = hourlyCounts([{ status: "pending", createdAt: "2026-11-08T09:59:00" }, { status: "failed", createdAt: "2026-11-08T11:00:00" }]);
  assert.deepEqual(rows.map((r) => r.label), ["09:00", "11:00"]);
});
