// SPEC.md, גמור / עד כניסת שבת. נבדק מול תשובות אמיתיות של Hebcal שנשמרו ב-test/fixtures/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDays, hebcalUrl, isHebcalPayload, nextStop, stripNiqqud } from "../src/lib/hebcal.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const week = fixture("hebcal-tel-aviv-2026-11-08.json");
const sukkot = fixture("hebcal-tel-aviv-sukkot-2026-09-24.json");

test("הבקשה ל-Hebcal: עיר לפי GeoNames, השבוע של התאריך, בעברית", () => {
  const u = new URL(hebcalUrl(293397, "2026-11-08"));
  assert.equal(u.origin + u.pathname, "https://www.hebcal.com/shabbat");
  assert.deepEqual(Object.fromEntries(u.searchParams), { cfg: "json", geonameid: "293397", M: "on", lg: "he", leyning: "off", gy: "2026", gm: "11", gd: "8" });
});

test("תאריכים: הוספת ימים, גם מעבר חודש ושנה", () => {
  assert.equal(addDays("2026-11-08", 7), "2026-11-15");
  assert.equal(addDays("2026-11-28", 5), "2026-12-03");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
});

test("ערב שבת: הדלקת הנרות הראשונה אחרי Now, עם פרשה והבדלה, בשעון ישראל", () => {
  const stop = nextStop(week, "2026-11-08T18:00:00");
  assert.deepEqual(stop, { kind: "shabbat", title: "פרשת תולדות", shabbat: true, candles: "2026-11-13T16:22:00", havdalah: "2026-11-14T17:20:00" });
});

test("אחרי הדלקת הנרות כבר אין עצירה בשבוע הזה", () => {
  assert.equal(nextStop(week, "2026-11-13T16:22:00"), null);
  assert.equal(nextStop(week, "2026-11-13T17:00:00"), null);
});

test("ערב חג: למחרת יום טוב (סוכות א', שחל בשבת), שם החג בלי ניקוד", () => {
  const stop = nextStop(sukkot, "2026-09-24T12:00:00");
  assert.equal(stop.kind, "yomtov");
  assert.equal(stop.title, "סוכות א׳");
  assert.equal(stop.shabbat, true);
  assert.equal(stop.candles, "2026-09-25T18:13:00");
  assert.equal(stop.havdalah, "2026-09-26T19:09:00");
});

test("חג שאינו יום טוב (חג הסיגד) לא נחשב עצירה", () => {
  assert.ok(week.items.some((i) => i.category === "holiday" && !i.yomtov));
  assert.equal(nextStop(week, "2026-11-08T18:00:00").kind, "shabbat");
});

test("החוזה: תשובה בלי items או location נדחית", () => {
  assert.equal(isHebcalPayload(week), true);
  for (const bad of [null, {}, { items: [] }, { location: {} }, { items: "x", location: {} }, "<html>"]) assert.equal(isHebcalPayload(bad), false);
});

test("ניקוד יורד, האותיות נשארות", () => {
  assert.equal(stripNiqqud("פָּרָשַׁת תּוֹלְדוֹת"), "פרשת תולדות");
});
