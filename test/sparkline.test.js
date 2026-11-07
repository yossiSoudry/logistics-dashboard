// SPEC.md, "גמור": סקירה (גרף מגמה בכל כרטיס סטטוס) ו-RTL (השעה המוקדמת מימין)
import { test } from "node:test";
import assert from "node:assert/strict";
import { sparklinePoints, smoothPath, areaPath, cumulative } from "../src/lib/sparkline.js";
import { loadMockData } from "./helpers.js";
import { hourlyCounts, summarizeByStatus, STATUSES } from "../src/logic.js";

test("RTL: הערך הראשון בצד ימין והאחרון בצד שמאל", () => {
  const p = sparklinePoints([1, 2, 3], 100, 40);
  assert.equal(p[0][0], 100);
  assert.equal(p[2][0], 0);
  const ltr = sparklinePoints([1, 2, 3], 100, 40, { rtl: false });
  assert.equal(ltr[0][0], 0);
  assert.equal(ltr[2][0], 100);
});

test("השיא בראש המלבן והאפס בתחתית, בתוך השוליים", () => {
  const p = sparklinePoints([0, 5, 10], 100, 40, { padY: 4 });
  assert.equal(p[2][1], 4);
  assert.equal(p[0][1], 36);
  assert.equal(p[1][1], 20);
});

test("הבסיס הוא אפס: הבדל קטן לא נמתח לכל הגובה", () => {
  const p = sparklinePoints([9, 10], 100, 40, { padY: 0 });
  assert.ok(p[0][1] < 10, `9 מתוך 10 צריך להיות קרוב לראש, קיבלתי ${p[0][1]}`);
});

test("סדרה של אפסים שטוחה בתחתית, וערך יחיד באמצע הרוחב", () => {
  assert.ok(sparklinePoints([0, 0, 0], 100, 40).every(([, y]) => y === 36));
  assert.equal(sparklinePoints([3], 100, 40)[0][0], 50);
});

test("קלט ריק או מלבן בלי גודל מחזירים מערך ריק", () => {
  assert.deepEqual(sparklinePoints([], 100, 40), []);
  assert.deepEqual(sparklinePoints([1, 2], 0, 40), []);
  assert.equal(smoothPath([]), "");
  assert.equal(areaPath([], 40), "");
});

test("הקו מתחיל ב-M ויש עקומה אחת לכל קטע; השטח נסגר בתחתית", () => {
  const p = sparklinePoints([1, 3, 2, 4], 120, 40);
  const line = smoothPath(p);
  assert.match(line, /^M/);
  assert.equal(line.match(/ C/g).length, 3);
  const area = areaPath(p, 40);
  assert.match(area, /L0,40 L120,40 Z$/);
});

test("העקומה לא חורגת מטווח ה-y של הנקודות", () => {
  const p = sparklinePoints([0, 10, 0, 10], 120, 40);
  const ys = smoothPath(p).match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 1);
  const min = Math.min(...p.map(([, y]) => y));
  const max = Math.max(...p.map(([, y]) => y));
  assert.ok(ys.every((y) => y >= min && y <= max));
});

test("מגמה מצטברת: כל ערך הוא סכום כל השעות עד אליו", () => {
  assert.deepEqual(cumulative([1, 0, 2, 0]), [1, 1, 3, 3]);
  assert.deepEqual(cumulative([]), []);
});

test("המגמה המצטברת של כל סטטוס מסתיימת במספר שבכרטיס", () => {
  const data = loadMockData();
  const hours = hourlyCounts(data.shipments);
  const summary = summarizeByStatus(data.shipments);
  for (const st of STATUSES) {
    assert.equal(cumulative(hours.map((h) => h[st])).at(-1), summary[st], st);
  }
});
