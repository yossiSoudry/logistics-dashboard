// SPEC.md, "גמור": סינון
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { applyFilters, summarizeByStatus, contractorPerformance } from "../src/logic.js";

const data = loadMockData();

test("בחירת מחסן מצמצמת את המלאי ואת המשלוחים לאותו מחסן בלבד", () => {
  const v = applyFilters(data, { warehouseId: "north" });
  assert.ok(v.inventory.length > 0 && v.shipments.length > 0);
  assert.ok(v.inventory.every((i) => i.warehouseId === "north"));
  assert.ok(v.shipments.every((s) => s.warehouseId === "north"));
  const s = summarizeByStatus(v.shipments);
  assert.equal(s.pending + s.in_transit + s.delivered + s.failed, v.shipments.length);
});

test("בחירת קבלן מצמצמת את המשלוחים ואת טבלת הקבלנים לאותו קבלן בלבד", () => {
  const v = applyFilters(data, { contractorId: "c2" });
  assert.ok(v.shipments.length > 0);
  assert.ok(v.shipments.every((s) => s.contractorId === "c2"));
  const rows = contractorPerformance(v.shipments, v.contractors);
  assert.deepEqual(rows.map((r) => r.id), ["c2"]);
  // קבלן לא נוגע במלאי
  assert.equal(v.inventory.length, data.inventory.length);
});

test("מחסן וקבלן יחד מצטמצמים לחיתוך של שניהם", () => {
  const v = applyFilters(data, { warehouseId: "center", contractorId: "c1" });
  assert.ok(v.shipments.every((s) => s.warehouseId === "center" && s.contractorId === "c1"));
  assert.ok(v.inventory.every((i) => i.warehouseId === "center"));
});

test('בחירת "הכל" מחזירה את כל הנתונים', () => {
  for (const all of [{}, { warehouseId: "all", contractorId: "all" }, { warehouseId: "", contractorId: "" }]) {
    const v = applyFilters(data, all);
    assert.equal(v.shipments.length, data.shipments.length);
    assert.equal(v.inventory.length, data.inventory.length);
  }
});

test("הסינון לא משנה את קובץ הנתונים", () => {
  const before = JSON.stringify(data);
  applyFilters(data, { warehouseId: "south", contractorId: "c3" });
  applyFilters(data, { warehouseId: "north" });
  assert.equal(JSON.stringify(data), before);
});
