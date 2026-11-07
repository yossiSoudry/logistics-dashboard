// SPEC.md, "גמור": משלוחים וחיפוש
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { queryShipments, applyFilters, timeOf } from "../src/logic.js";

const data = loadMockData();
const sample = [
  { id: "SH-1001", customer: "כהן", status: "pending" },
  { id: "SH-1002", customer: "לוי 2", status: "delivered" },
  { id: "AB-77", customer: "Cohen Ltd", status: "failed" },
];

test("בלי חיפוש ובלי סטטוס מוחזרים כל המשלוחים", () => {
  assert.equal(queryShipments(data.shipments).length, data.shipments.length);
  assert.equal(queryShipments(data.shipments, { search: "", status: "all" }).length, data.shipments.length);
});

test("חיפוש לפי חלק משם הלקוח", () => {
  assert.deepEqual(queryShipments(sample, { search: "לוי" }).map((s) => s.id), ["SH-1002"]);
});

test("חיפוש לפי חלק ממספר המשלוח", () => {
  assert.deepEqual(queryShipments(sample, { search: "1001" }).map((s) => s.id), ["SH-1001"]);
});

test("לא תלוי באותיות גדולות או קטנות ומתעלם מרווחים בקצוות", () => {
  assert.deepEqual(queryShipments(sample, { search: "  cohen " }).map((s) => s.id), ["AB-77"]);
  assert.deepEqual(queryShipments(sample, { search: "sh-100" }).map((s) => s.id), ["SH-1001", "SH-1002"]);
});

test("סינון לפי סטטוס", () => {
  const delivered = queryShipments(data.shipments, { status: "delivered" });
  assert.ok(delivered.length > 0);
  assert.ok(delivered.every((s) => s.status === "delivered"));
});

test("חיפוש, סטטוס וסינון כללי מצטברים", () => {
  const view = applyFilters(data, { warehouseId: "north" });
  const r = queryShipments(view.shipments, { search: "SH-10", status: "pending" });
  assert.ok(r.length > 0);
  assert.ok(r.every((s) => s.warehouseId === "north" && s.status === "pending" && s.id.includes("SH-10")));
});

test("אין תוצאות = מערך ריק, והקלט לא משתנה", () => {
  const before = JSON.stringify(sample);
  assert.deepEqual(queryShipments(sample, { search: "אין כזה" }), []);
  assert.equal(JSON.stringify(sample), before);
});

test("שעת יצירה מוצגת כשעה ודקות", () => {
  assert.equal(timeOf("2026-11-08T07:05:00"), "07:05");
});
