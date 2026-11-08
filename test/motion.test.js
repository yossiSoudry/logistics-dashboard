// SPEC.md, "גמור": אנימציה
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import {
  MAX_TRANSITION_MS,
  ENTER_MS,
  COUNT_MS,
  CHART_MS,
  BAR_GROW_MS,
  BAR_STAGGER_MS,
  staggerDelay,
  easeOutCubic,
  tweenValue,
} from "../src/lib/motion.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("כל הזמנים הקבועים עד 600ms", () => {
  assert.equal(MAX_TRANSITION_MS, 600);
  for (const ms of [ENTER_MS, COUNT_MS, CHART_MS, BAR_GROW_MS]) assert.ok(ms <= 600, String(ms));
});

test("כניסה מדורגת: השהיה ועוד משך לא עוברים 600ms, גם לכרטיס המאה", () => {
  for (let i = 0; i < 100; i++) assert.ok(staggerDelay(i) + ENTER_MS <= 600, `card ${i}`);
  assert.equal(staggerDelay(0), 0);
  assert.ok(staggerDelay(1) > 0);
  // רצועת המלאי: 20 פסים
  for (let i = 0; i < 20; i++) assert.ok(staggerDelay(i, BAR_STAGGER_MS, BAR_GROW_MS) + BAR_GROW_MS <= 600);
});

test("ההאטה מתחילה ב-0, מסתיימת ב-1 ועולה כל הזמן", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(2), 1);
  let prev = -1;
  for (let t = 0; t <= 1; t += 0.05) {
    const v = easeOutCubic(t);
    assert.ok(v >= prev);
    prev = v;
  }
});

test("מספר סופר: שלם בכל רגע, ונעצר בדיוק על הערך הנכון, גם בירידה", () => {
  for (const [from, to] of [[0, 12], [12, 4], [50, 50], [3, 0]]) {
    for (let t = 0; t <= COUNT_MS + 50; t += 25) {
      const v = tweenValue(from, to, t);
      assert.ok(Number.isInteger(v));
      assert.ok(v >= Math.min(from, to) && v <= Math.max(from, to));
    }
    assert.equal(tweenValue(from, to, COUNT_MS), to);
    assert.equal(tweenValue(from, to, 10_000), to);
  }
});

// סריקת הקוד: אין משך או השהיה מעל 600ms (לולאת animate-ping היא החריג היחיד שהספק מתיר)
function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?|css)$/.test(f) ? [p] : [];
  });
}

test("בקוד אין duration, delay או animationDuration מעל 600ms", () => {
  const offenders = [];
  for (const file of files(join(root, "src"))) {
    const text = readFileSync(file, "utf8");
    const patterns = [
      /\b(?:duration|delay)-(\d+)\b/g, // Tailwind
      /\b(?:duration|delay)-\[(\d+)ms\]/g,
      /animation(?:Duration|Begin)=\{(\d+)\}/g, // Recharts
      /(\d+)ms/g, // CSS
    ];
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        if (Number(m[1]) > 600) offenders.push(`${relative(root, file)}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
