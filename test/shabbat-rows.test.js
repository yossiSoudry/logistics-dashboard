// SPEC.md, גמור / עד כניסת שבת: השורות של הכרטיס
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData } from "./helpers.js";
import { shabbatRows, formatTimeLeft, applyFilters } from "../src/logic.js";

const data = loadMockData();
const stop = (candles) => ({ stop: { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles, havdalah: null } });
const stops = { center: stop("2026-11-13T16:22:00"), north: stop("2026-11-13T16:09:00"), south: { error: true } };

test("שורה לכל מחסן: נותרו מ-Now עד הדלקת הנרות, ומשלוחים פתוחים = ממתין + בדרך", () => {
  const rows = shabbatRows(data.warehouses, stops, data.shipments, data.now);
  assert.deepEqual(rows.map((r) => r.id), ["center", "north", "south"]);
  const center = rows[0];
  assert.equal(center.state, "ready");
  assert.equal(center.minutesLeft, 4 * 24 * 60 + 22 * 60 + 22); // ראשון 18:00 -> שישי 16:22
  const openCenter = data.shipments.filter((s) => s.warehouseId === "center" && ["pending", "in_transit"].includes(s.status)).length;
  assert.equal(center.open, openCenter);
  assert.equal(rows[1].minutesLeft, center.minutesLeft - 13); // בחיפה 13 דקות מוקדם יותר
  assert.equal(rows[2].state, "error");
  // סך הפתוחים בכל המחסנים = כל הממתינים והבדרך
  assert.equal(rows.reduce((s, r) => s + r.open, 0), data.shipments.filter((s) => ["pending", "in_transit"].includes(s.status)).length);
});

test("לפי הסינון: מחסן אחד, ופתוחים רק של הקבלן שנבחר", () => {
  const view = applyFilters(data, { contractorId: "c2" });
  const rows = shabbatRows(data.warehouses, stops, view.shipments, data.now, "north");
  assert.deepEqual(rows.map((r) => r.id), ["north"]);
  assert.equal(rows[0].open, view.shipments.filter((s) => s.warehouseId === "north" && ["pending", "in_transit"].includes(s.status)).length);
});

test("מחסן בלי מיקום, ומחסן שעוד נטען", () => {
  const ws = [{ id: "x", name: "בלי מיקום" }, { id: "center", name: "מרכז", geonameId: 293397 }];
  const rows = shabbatRows(ws, {}, data.shipments, data.now);
  assert.deepEqual(rows.map((r) => r.state), ["noLocation", "loading"]);
});

test("זמן שנותר: ימים ושעות, או שעות ודקות כשנשאר פחות מיום", () => {
  assert.equal(formatTimeLeft(4 * 24 * 60 + 22 * 60 + 22), "4 ימים ו-22 ש׳");
  assert.equal(formatTimeLeft(24 * 60 + 60), "יום ו-1 ש׳");
  assert.equal(formatTimeLeft(2 * 24 * 60), "2 ימים");
  assert.equal(formatTimeLeft(192), "3 ש׳ 12 ד׳");
  assert.equal(formatTimeLeft(45), "45 ד׳");
});
