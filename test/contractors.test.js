// SPEC.md, "גמור": ביצועי קבלנים
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { contractorPerformance } from "../src/logic.js";

const data = loadMockData();

test("כל קבלן שיש לו משלוח היום מופיע בשורה אחת עם סך הכל ונמסרו", () => {
  const rows = contractorPerformance(data.shipments, data.contractors);
  const idsWithShipments = new Set(data.shipments.map((s) => s.contractorId));
  assert.equal(rows.length, idsWithShipments.size);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length, "קבלן מופיע פעמיים");
  for (const r of rows) {
    assert.equal(r.total, data.shipments.filter((s) => s.contractorId === r.id).length);
    assert.equal(r.delivered, data.shipments.filter((s) => s.contractorId === r.id && s.status === "delivered").length);
    assert.equal(typeof r.name, "string");
  }
});

test("קבלן שאין לו משלוחים היום לא מופיע", () => {
  const contractors = [...data.contractors, { id: "idle", name: "קבלן בטל" }];
  const rows = contractorPerformance(data.shipments, contractors);
  assert.ok(!rows.some((r) => r.id === "idle"));
  assert.deepEqual(contractorPerformance([], contractors), []);
});

test("אחוז המסירה = נמסרו חלקי סך הכל, מעוגל לאחוז שלם", () => {
  const shipments = [
    { contractorId: "a", status: "delivered" },
    { contractorId: "a", status: "delivered" },
    { contractorId: "a", status: "pending" },
    { contractorId: "b", status: "failed" },
  ];
  const rows = contractorPerformance(shipments, [{ id: "a", name: "א" }, { id: "b", name: "ב" }]);
  const a = rows.find((r) => r.id === "a");
  const b = rows.find((r) => r.id === "b");
  assert.equal(a.rate, 67); // 2/3 = 66.67 -> 67
  assert.equal(b.rate, 0);
  assert.ok(rows.every((r) => Number.isInteger(r.rate)));
});
