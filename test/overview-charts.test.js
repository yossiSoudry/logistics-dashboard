// SPEC.md, "גמור": סקירה (כרטיס השעות, מלאי מול מינימום)
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { stockBalance, peakHour, hourlyCounts, lowStockItems, applyFilters } from "../src/logic.js";

const data = loadMockData();

test("מלאי מול מינימום: הפרש = כמות פחות מינימום, לכל פריט", () => {
  const rows = stockBalance(data.inventory);
  assert.equal(rows.length, data.inventory.length);
  for (const r of rows) assert.equal(r.diff, r.quantity - r.minimum);
});

test("מספר העמודות האדומות (הפרש שלילי) שווה למספר הפריטים מתחת למינימום, גם אחרי סינון", () => {
  for (const f of [{}, { warehouseId: "north" }, { warehouseId: "center" }]) {
    const inv = applyFilters(data, f).inventory;
    assert.equal(stockBalance(inv).filter((r) => r.diff < 0).length, lowStockItems(inv).length, JSON.stringify(f));
  }
});

test("פריט שווה למינימום לא אדום, והחוסרים הגדולים ראשונים", () => {
  const rows = stockBalance([
    { sku: "A", name: "א", warehouseId: "w", quantity: 5, minimum: 5 },
    { sku: "B", name: "ב", warehouseId: "w", quantity: 1, minimum: 9 },
    { sku: "C", name: "ג", warehouseId: "w", quantity: 3, minimum: 4 },
  ]);
  assert.deepEqual(rows.map((r) => r.sku), ["B", "C", "A"]);
  assert.equal(rows[2].diff, 0);
});

test("השעה העמוסה ביותר; בתיקו המוקדמת", () => {
  const rows = hourlyCounts(data.shipments);
  const p = peakHour(rows);
  assert.equal(p.total, Math.max(...rows.map((r) => r.total)));
  assert.equal(p.label, rows.find((r) => r.total === p.total).label);
  assert.equal(p.ties, rows.filter((r) => r.total === p.total).length);
  assert.equal(peakHour([]), null);
  assert.deepEqual(peakHour([{ hour: 9, label: "09:00", total: 2 }, { hour: 8, label: "08:00", total: 3 }]), { hour: 8, label: "08:00", total: 3, ties: 1 });
});
