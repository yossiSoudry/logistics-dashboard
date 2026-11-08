// SPEC.md, "גמור": ניווט
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTES, parseRoute, hrefFor, NAV, breadcrumbFor } from "../src/lib/routes.js";

test("ארבעה קישורים: סקירה, משלוחים, תקועים, לפי שעה", () => {
  assert.deepEqual(ROUTES.map((r) => r.label), ["סקירה", "משלוחים", "תקועים", "לפי שעה"]);
});

test("לכל עמוד כתובת משלו, והכתובת מתפענחת חזרה לאותו עמוד", () => {
  for (const r of ROUTES) assert.equal(parseRoute(hrefFor(r.id)), r.id);
  assert.equal(hrefFor("shipments"), "#/shipments");
  assert.equal(hrefFor("overview"), "#/");
});

test("כתובת ריקה או לא מוכרת פותחת את הסקירה", () => {
  for (const h of ["", "#", "#/", undefined, null, "#/nope", "#/shipments/extra", "shipments"]) {
    assert.equal(parseRoute(h), "overview", String(h));
  }
});

test("לוכסן בסוף או פרמטרים אחרי ? לא משנים את העמוד", () => {
  assert.equal(parseRoute("#/stuck/"), "stuck");
  assert.equal(parseRoute("#/hourly?x=1"), "hourly");
});

test("סרגל הצד: סקירה, ואחריה קבוצה נפתחת משלוחים עם שלושה עמודים", () => {
  assert.equal(NAV[0].label, "סקירה");
  assert.equal(NAV[1].type, "group");
  assert.equal(NAV[1].label, "משלוחים");
  assert.deepEqual(NAV[1].items.map((i) => i.label), ["כל המשלוחים", "תקועים", "לפי שעה"]);
});

test("כל עמוד מופיע בסרגל הצד בדיוק פעם אחת", () => {
  const ids = NAV.flatMap((e) => (e.type === "group" ? e.items.map((i) => i.id) : [e.id]));
  assert.deepEqual([...ids].sort(), ROUTES.map((r) => r.id).sort());
});

test("פירורי לחם: הקבוצה והעמוד", () => {
  assert.deepEqual(breadcrumbFor("overview"), ["סקירה"]);
  assert.deepEqual(breadcrumbFor("stuck"), ["משלוחים", "תקועים"]);
  assert.deepEqual(breadcrumbFor("shipments"), ["משלוחים", "כל המשלוחים"]);
  assert.deepEqual(breadcrumbFor("nope"), ["סקירה"]);
});
