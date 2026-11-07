// SPEC.md, "גמור": סיכום משלוחים לפי סטטוס
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { summarizeByStatus, STATUSES, applyFilters } from "../src/logic.js";

const data = loadMockData();

test("ארבעת המספרים קיימים תמיד, גם כשאין משלוחים", () => {
  assert.deepEqual(summarizeByStatus([]), { pending: 0, in_transit: 0, delivered: 0, failed: 0 });
  assert.deepEqual(Object.keys(summarizeByStatus(data.shipments)), STATUSES);
});

test("סכום ארבעת המספרים שווה למספר המשלוחים בקובץ לאותו יום", () => {
  const s = summarizeByStatus(data.shipments);
  const total = s.pending + s.in_transit + s.delivered + s.failed;
  assert.equal(total, data.shipments.length);
});

test("הסכום נשמר גם אחרי סינון", () => {
  const filtered = applyFilters(data, { warehouseId: "north" });
  const s = summarizeByStatus(filtered.shipments);
  assert.equal(s.pending + s.in_transit + s.delivered + s.failed, filtered.shipments.length);
});

test("סטטוס לא מוכר אינו נספר ואינו שובר את הסיכום", () => {
  const s = summarizeByStatus([{ status: "lost" }, { status: "delivered" }]);
  assert.deepEqual(s, { pending: 0, in_transit: 0, delivered: 1, failed: 0 });
});
