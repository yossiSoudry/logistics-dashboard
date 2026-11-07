// SPEC.md, "גמור": ניווט
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROUTES, parseRoute, hrefFor } from "../src/lib/routes.js";

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
