// SPEC.md, "גמור": טבלת מלאי
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { isLowStock, lowStockItems } from "../src/logic.js";

const data = loadMockData();

test("כל פריט מגיע עם שם, מחסן, כמות נוכחית וכמות מינימום", () => {
  for (const item of data.inventory) {
    assert.equal(typeof item.name, "string");
    assert.equal(typeof item.warehouseId, "string");
    assert.equal(typeof item.quantity, "number");
    assert.equal(typeof item.minimum, "number");
  }
});

test("פריט מתחת למינימום נמוך; שווה למינימום או מעליו לא", () => {
  assert.equal(isLowStock({ quantity: 4, minimum: 5 }), true);
  assert.equal(isLowStock({ quantity: 5, minimum: 5 }), false);
  assert.equal(isLowStock({ quantity: 6, minimum: 5 }), false);
  assert.equal(isLowStock({ quantity: 0, minimum: 1 }), true);
});

test("מספר הפריטים הנמוכים הוא מספר אחד שסופר בדיוק את המודגשים", () => {
  const low = lowStockItems(data.inventory);
  assert.equal(low.length, data.inventory.filter((i) => i.quantity < i.minimum).length);
  assert.ok(low.every(isLowStock));
  // בקובץ הדמה יש פריט שווה בדיוק למינימום, והוא לא נספר
  const atMin = data.inventory.find((i) => i.quantity === i.minimum);
  assert.ok(atMin, "חסר פריט שווה למינימום בנתוני הדמה");
  assert.ok(!low.includes(atMin));
});
