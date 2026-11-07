// SPEC.md, סעיף "נתוני דמה"
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { STATUSES, lowStockItems } from "../src/logic.js";

const data = loadMockData();

test("שלושה מחסנים: מרכז, צפון, דרום", () => {
  assert.deepEqual(data.warehouses.map((w) => w.name), ["מרכז", "צפון", "דרום"]);
});

test("כעשרים פריטי מלאי, לפחות שלושה מתחת למינימום", () => {
  assert.ok(data.inventory.length >= 18 && data.inventory.length <= 22);
  assert.ok(lowStockItems(data.inventory).length >= 3);
});

test("ארבעה קבלנים", () => {
  assert.equal(data.contractors.length, 4);
});

test("כחמישים משלוחים ליום אחד, בכל ארבעת הסטטוסים", () => {
  assert.ok(data.shipments.length >= 45 && data.shipments.length <= 55);
  const dates = new Set(data.shipments.map((s) => s.createdAt.slice(0, 10)));
  assert.deepEqual([...dates], [data.date]);
  for (const st of STATUSES) {
    assert.ok(data.shipments.some((s) => s.status === st), `חסר סטטוס ${st}`);
  }
});

test("כל משלוח מפנה למחסן ולקבלן קיימים", () => {
  const wh = new Set(data.warehouses.map((w) => w.id));
  const ct = new Set(data.contractors.map((c) => c.id));
  for (const s of data.shipments) {
    assert.ok(wh.has(s.warehouseId), `מחסן לא קיים: ${s.warehouseId}`);
    assert.ok(ct.has(s.contractorId), `קבלן לא קיים: ${s.contractorId}`);
  }
  for (const i of data.inventory) {
    assert.ok(wh.has(i.warehouseId), `מחסן לא קיים: ${i.warehouseId}`);
  }
});
