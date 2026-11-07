// SPEC.md, "גמור": משלוחים תקועים
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import {
  stuckShipments,
  minutesBetween,
  formatDuration,
  STUCK_THRESHOLD_MINUTES,
} from "../src/logic.js";

const data = loadMockData();
const NOW = "2026-11-08T18:00:00";
const at = (hhmm) => `2026-11-08T${hhmm}:00`;

test("now בקובץ הנתונים: 18:00 באותו יום, אחרי כל המשלוחים", () => {
  assert.equal(data.now, NOW);
  assert.equal(data.now.slice(0, 10), data.date);
  for (const s of data.shipments) assert.ok(s.createdAt < data.now, `${s.id} נוצר אחרי now`);
});

test("הסף הוא שלוש שעות", () => {
  assert.equal(STUCK_THRESHOLD_MINUTES, 180);
  assert.equal(minutesBetween(at("15:00"), NOW), 180);
});

test("ממתין או בדרך יותר משלוש שעות = תקוע; בדיוק שלוש שעות = לא", () => {
  const s = [
    { id: "A", status: "pending", createdAt: at("14:59") },
    { id: "B", status: "in_transit", createdAt: at("14:00") },
    { id: "C", status: "pending", createdAt: at("15:00") },
    { id: "D", status: "in_transit", createdAt: at("17:00") },
  ];
  assert.deepEqual(stuckShipments(s, NOW).map((x) => x.id), ["B", "A"]);
});

test("נמסר או נכשל לעולם לא תקוע, גם אם נוצר מוקדם", () => {
  const s = [
    { id: "E", status: "delivered", createdAt: at("07:00") },
    { id: "F", status: "failed", createdAt: at("07:00") },
  ];
  assert.deepEqual(stuckShipments(s, NOW), []);
});

test("ממוין מההמתנה הארוכה לקצרה, עם זמן המתנה לכל משלוח", () => {
  const r = stuckShipments(data.shipments, data.now);
  assert.ok(r.length > 0);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].waitedMinutes >= r[i].waitedMinutes);
  for (const s of r) {
    assert.ok(["pending", "in_transit"].includes(s.status));
    assert.equal(s.waitedMinutes, minutesBetween(s.createdAt, data.now));
    assert.ok(s.waitedMinutes > STUCK_THRESHOLD_MINUTES);
  }
});

test("זמן ההמתנה מוצג בשעות ודקות", () => {
  assert.equal(formatDuration(192), "3 ש׳ 12 ד׳");
  assert.equal(formatDuration(240), "4 ש׳");
  assert.equal(formatDuration(45), "45 ד׳");
});
