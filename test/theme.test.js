// SPEC.md, "גמור": מצב בהיר וכהה
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  THEME_STORAGE_KEY,
  THEME_PREFERENCES,
  THEME_LABELS,
  normalizePreference,
  resolveTheme,
} from "../src/lib/theme.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("שלוש אפשרויות במתג: בהיר, כהה, לפי המערכת", () => {
  assert.deepEqual(THEME_PREFERENCES, ["light", "dark", "system"]);
  assert.deepEqual(THEME_PREFERENCES.map((p) => THEME_LABELS[p]), ["בהיר", "כהה", "לפי המערכת"]);
});

test("ברירת המחדל היא לפי המערכת", () => {
  for (const v of [null, undefined, "", "blue", "DARK"]) {
    assert.equal(normalizePreference(v), "system");
  }
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
});

test("בחירה מפורשת גוברת על המערכת", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
});

test("בלי הבהוב: index.html מחיל את המצב לפני טעינת האפליקציה, עם אותו מפתח שמירה", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const early = html.indexOf(THEME_STORAGE_KEY);
  const app = html.indexOf("/src/main.tsx");
  assert.ok(early !== -1, "המפתח לא מופיע בסקריפט המוקדם");
  assert.ok(early < app, "הסקריפט המוקדם חייב לרוץ לפני האפליקציה");
  assert.match(html, /classList\.(toggle|add)\(\s*["']dark["']/);
});
