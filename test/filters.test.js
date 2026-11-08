// SPEC.md, "גמור": סינון
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { applyFilters, summarizeByStatus, contractorPerformance, warehouseSummary, toggleContractor } from "../src/logic.js";

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

test("מחליף המחסן: לכל מחסן מספר פריטים ומספר חסרים, והסכומים תואמים למלאי", () => {
  const rows = warehouseSummary(data.warehouses, data.inventory);
  assert.deepEqual(rows.map((r) => r.name), ["מרכז", "צפון", "דרום"]);
  assert.equal(rows.reduce((s, r) => s + r.items, 0), data.inventory.length);
  assert.equal(rows.reduce((s, r) => s + r.low, 0), data.inventory.filter((i) => i.quantity < i.minimum).length);
});

test("רשימת הקבלנים: לחיצה בוחרת, לחיצה נוספת על אותו קבלן מבטלת", () => {
  assert.equal(toggleContractor("all", "c2"), "c2");
  assert.equal(toggleContractor("c2", "c2"), "all");
  assert.equal(toggleContractor("c2", "c3"), "c3");
});
