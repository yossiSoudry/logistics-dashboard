// SPEC.md, "גמור": נתונים מ-Airtable; "נתונים"
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMockData, fakeAirtable } from "./helpers.js";
import {
  SCHEMA,
  TABLES,
  STATUS_TO_AIRTABLE,
  STATUS_FROM_AIRTABLE,
  toLocalIso,
  fromLocalIso,
  fromAirtable,
} from "../src/lib/airtable.js";

const data = loadMockData();

test("חמש טבלאות, בשמות שבספק", () => {
  assert.deepEqual(SCHEMA.map((t) => t.name), ["Warehouses", "Contractors", "Inventory", "Shipments", "Settings"]);
  assert.deepEqual(Object.values(TABLES).sort(), SCHEMA.map((t) => t.name).sort());
});

test("קישור תמיד לטבלה שנוצרה לפניו, והשדה הראשי הוא טקסט", () => {
  const created = new Set();
  for (const t of SCHEMA) {
    assert.equal(t.fields[0].type, "singleLineText", `${t.name}: primary`);
    for (const f of t.fields) if (f.link) assert.ok(created.has(f.link), `${t.name}.${f.name} -> ${f.link}`);
    created.add(t.name);
  }
});

test("הסטטוסים ב-Airtable בעברית, וההמרה הפיכה", () => {
  assert.deepEqual(Object.values(STATUS_TO_AIRTABLE), ["ממתין", "בדרך", "נמסר", "נכשל"]);
  for (const [k, v] of Object.entries(STATUS_TO_AIRTABLE)) assert.equal(STATUS_FROM_AIRTABLE[v], k);
  const choices = SCHEMA.find((t) => t.name === "Shipments").fields.find((f) => f.name === "Status").options.choices.map((c) => c.name);
  assert.deepEqual(choices, Object.values(STATUS_TO_AIRTABLE));
});

test("זמן: UTC של Airtable -> שעון ישראל ובחזרה", () => {
  assert.equal(toLocalIso("2026-11-08T05:05:00.000Z"), "2026-11-08T07:05:00");
  assert.equal(fromLocalIso("2026-11-08T07:05:00"), "2026-11-08T05:05:00.000Z");
  // שעון קיץ: ביולי ההפרש שלוש שעות
  assert.equal(fromLocalIso("2026-07-01T12:00:00"), "2026-07-01T09:00:00.000Z");
  for (const s of data.shipments) assert.equal(toLocalIso(fromLocalIso(s.createdAt)), s.createdAt);
});

test("מה שנטען ל-Airtable חוזר ממנו זהה לקובץ הדמה, גם כשהסדר מעורבב", () => {
  const { data: back, skipped } = fromAirtable(fakeAirtable(data));
  assert.equal(skipped, 0);
  assert.deepEqual(back, data);
});

test("רשומה חסרה או עם סטטוס לא מוכר לא נכנסת, ונספרת", () => {
  const raw = fakeAirtable(data);
  raw.shipments[0] = { ...raw.shipments[0], fields: { ...raw.shipments[0].fields, Status: "אבד" } };
  raw.shipments[1] = { ...raw.shipments[1], fields: { ...raw.shipments[1].fields, ID: undefined } };
  raw.inventory[0] = { ...raw.inventory[0], fields: { ...raw.inventory[0].fields, Warehouse: undefined } };
  const { data: back, skipped } = fromAirtable(raw);
  assert.equal(skipped, 3);
  assert.equal(back.shipments.length, data.shipments.length - 2);
  assert.equal(back.inventory.length, data.inventory.length - 1);
});

test("שינוי ב-Airtable (סטטוס של משלוח) מופיע בנתונים", () => {
  const raw = fakeAirtable(data);
  const target = raw.shipments.find((r) => r.fields.ID === "SH-1000");
  target.fields.Status = "נמסר";
  const { data: back } = fromAirtable(raw);
  assert.equal(back.shipments.find((s) => s.id === "SH-1000").status, "delivered");
});

test("בלי Now בטבלת Settings: שגיאה ברורה", () => {
  const raw = fakeAirtable(data);
  raw.settings = [];
  assert.throws(() => fromAirtable(raw), /Now/);
});
