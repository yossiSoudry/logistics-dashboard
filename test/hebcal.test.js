// SPEC.md, גמור / עד כניסת שבת. נבדק מול תשובות אמיתיות של Hebcal שנשמרו ב-test/fixtures/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hebcalUrl, isHebcalPayload, stopsOf, stripNiqqud } from "../src/lib/hebcal.js";
import { addDays, weekOf } from "../src/lib/dates.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const november = fixture("hebcal-tel-aviv-2026-11-08.json");
const holidays = fixture("hebcal-tel-aviv-2026-09-20.json");

test("הבקשה ל-Hebcal: לוח השנה בטווח מפורש, עיר לפי GeoNames, בעברית", () => {
  const u = new URL(hebcalUrl(293397, "2026-11-08", "2026-11-21"));
  assert.equal(u.origin + u.pathname, "https://www.hebcal.com/hebcal");
  const q = Object.fromEntries(u.searchParams);
  assert.equal(q.geonameid, "293397");
  assert.equal(q.start, "2026-11-08");
  assert.equal(q.end, "2026-11-21");
  assert.equal(q.lg, "he");
  for (const flag of ["c", "s", "maj"]) assert.equal(q[flag], "on", flag); // נרות והבדלה, פרשה, חגים
});

test("תאריכים: הוספת ימים מעבר חודש ושנה, ויום ראשון שפותח את השבוע", () => {
  assert.equal(addDays("2026-11-08", 13), "2026-11-21");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(weekOf("2026-11-08T18:00:00"), "2026-11-08"); // ראשון
  assert.equal(weekOf("2026-11-14T23:59:00"), "2026-11-08"); // שבת
  assert.equal(weekOf("2026-11-15T00:00:00"), "2026-11-15");
  assert.equal(weekOf("2027-01-01"), "2026-12-27");
});

test("שבועיים בנובמבר: שתי שבתות, עם פרשה, נרות והבדלה בשעון ישראל", () => {
  assert.deepEqual(stopsOf(november), [
    { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" },
    { kind: "shabbat", title: "פרשת ויצא", shabbat: true, candles: "2026-11-20T16:18:00", havdalah: "2026-11-21T17:17:00" },
  ]);
});

test("חג שאינו יום טוב (חג הסיגד, יום בן־גוריון) לא נחשב עצירה", () => {
  assert.ok(november.items.some((i) => i.category === "holiday" && !i.yomtov));
  assert.ok(stopsOf(november).every((s) => s.kind === "shabbat"));
});

test("חגי תשרי: יום כיפור (נרות ביום ראשון), סוכות א׳ בשבת ושמיני עצרת, בלי ניקוד", () => {
  const stops = stopsOf(holidays);
  assert.deepEqual(stops.map((s) => [s.kind, s.title, s.shabbat, s.candles, s.havdalah]), [
    ["yomtov", "יום כיפור", false, "2026-09-20T18:20:00", "2026-09-21T19:15:00"],
    ["yomtov", "סוכות א׳", true, "2026-09-25T18:13:00", "2026-09-26T19:09:00"],
    ["yomtov", "שמיני עצרת", true, "2026-10-02T18:04:00", "2026-10-03T19:00:00"],
  ]);
});

test("החוזה: תשובה בלי items או location נדחית", () => {
  assert.equal(isHebcalPayload(november), true);
  for (const bad of [null, {}, { items: [] }, { location: {} }, { items: "x", location: {} }, "<html>"]) assert.equal(isHebcalPayload(bad), false);
});

test("ניקוד יורד, האותיות נשארות", () => {
  assert.equal(stripNiqqud("פָּרָשַׁת תּוֹלְדוֹת"), "פרשת תולדות");
});
