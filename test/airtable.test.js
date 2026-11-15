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

test("מה שנטען ל-Airtable חוזר ממנו זהה לקובץ הדמה, גם כשהסדר מעורבב, בלי אף רשומה לא תקינה", () => {
  const { data: back, rejected } = fromAirtable(fakeAirtable(data));
  assert.deepEqual(rejected, []);
  assert.deepEqual(back, data);
});

// SPEC.md, נתונים / הכללים. כל כלל: רשומה ששוברת אותו לא נכנסת, ומופיעה עם טבלה, מפתח וסיבה.
const field = (raw, table, key, keyField, patch) => {
  const r = raw[table].find((x) => x.fields[keyField] === key);
  Object.assign(r.fields, patch);
  return r;
};
const rejectedOf = (raw) => fromAirtable(raw).rejected.map((r) => `${r.table}:${r.key}:${r.reason}`);

test("חובה: בלי מפתח, בלי שם, בלי לקוח, בלי מחסן", () => {
  const raw = fakeAirtable(data);
  field(raw, "shipments", "SH-1001", "ID", { ID: "" });
  field(raw, "inventory", "SKU-001", "SKU", { Name: "  " });
  field(raw, "shipments", "SH-1002", "ID", { Customer: undefined });
  field(raw, "inventory", "SKU-002", "SKU", { Warehouse: [] });
  const out = rejectedOf(raw);
  assert.deepEqual(out.sort(), [
    "Inventory:SKU-001:חסר Name",
    "Inventory:SKU-002:חסר מחסן",
    "Shipments:(בלי מפתח):חסר ID",
    "Shipments:SH-1002:חסר Customer",
  ].sort());
});

test("ייחודי: מפתח כפול - הרשומה שנוצרה ראשונה נשארת, השנייה נדחית", () => {
  const raw = fakeAirtable(data);
  const original = raw.shipments.find((r) => r.fields.ID === "SH-1000");
  original.createdTime = "2026-11-15T00:00:00.000Z";
  raw.shipments.push({ id: "recDUP", createdTime: "2026-11-15T09:00:00.000Z", fields: { ...original.fields, Customer: "כפול" } });
  const { data: back, rejected } = fromAirtable(raw);
  assert.deepEqual(rejected, [{ table: "Shipments", key: "SH-1000", reason: "ID כפול: הרשומה הראשונה נשארת" }]);
  assert.equal(back.shipments.find((s) => s.id === "SH-1000").customer, "כהן");
  assert.equal(back.shipments.length, data.shipments.length);
});

test("תקין: כמות ומינימום שלמים ואפס ומעלה; אפס תקין", () => {
  const raw = fakeAirtable(data);
  field(raw, "inventory", "SKU-001", "SKU", { Quantity: -1 });
  field(raw, "inventory", "SKU-002", "SKU", { Minimum: 2.5 });
  field(raw, "inventory", "SKU-003", "SKU", { Quantity: undefined });
  field(raw, "inventory", "SKU-004", "SKU", { Quantity: 0 });
  const { data: back, rejected } = fromAirtable(raw);
  assert.deepEqual(rejected.map((r) => r.key), ["SKU-001", "SKU-002", "SKU-003"]);
  assert.equal(back.inventory.find((i) => i.sku === "SKU-004").quantity, 0);
});

test("תקין: סטטוס אחד מארבעה, ומשלוח ביום של Now ולא אחריו", () => {
  const raw = fakeAirtable(data);
  field(raw, "shipments", "SH-1000", "ID", { Status: "אבד" });
  field(raw, "shipments", "SH-1001", "ID", { "Created At": "2026-11-07T10:00:00.000Z" });
  field(raw, "shipments", "SH-1002", "ID", { "Created At": "2026-11-08T17:00:00.000Z" }); // 19:00 בישראל, אחרי Now
  const out = rejectedOf(raw);
  assert.deepEqual(out, [
    "Shipments:SH-1000:סטטוס לא מוכר: אבד",
    "Shipments:SH-1001:Created At לא ביום 2026-11-08",
    "Shipments:SH-1002:Created At אחרי Now",
  ]);
});

test("מחובר: קישור לרשומה אחת קיימת ותקינה; מחסן שנדחה מושך איתו את מה שמצביע עליו", () => {
  const raw = fakeAirtable(data);
  field(raw, "shipments", "SH-1000", "ID", { Contractor: ["recNOPE"] });
  field(raw, "shipments", "SH-1001", "ID", { Warehouse: ["recW0", "recW1"] });
  field(raw, "warehouses", "south", "Key", { Name: "" });
  const { data: back, rejected } = fromAirtable(raw);
  const reasons = Object.fromEntries(rejected.map((r) => [`${r.table}:${r.key}`, r.reason]));
  assert.equal(reasons["Warehouses:south"], "חסר Name");
  assert.equal(reasons["Shipments:SH-1000"], "הקבלן לא קיים או לא תקין");
  assert.equal(reasons["Shipments:SH-1001"], "יותר ממחסן אחד");
  const south = data.inventory.filter((i) => i.warehouseId === "south").length;
  assert.equal(rejected.filter((r) => r.table === "Inventory" && r.reason === "המחסן לא קיים או לא תקין").length, south);
  assert.ok(back.inventory.every((i) => i.warehouseId !== "south"));
  assert.ok(back.shipments.every((s) => s.warehouseId !== "south"));
});

test("הגדרות: בדיוק רשומה אחת עם Now", () => {
  const raw = fakeAirtable(data);
  raw.settings.push({ ...raw.settings[0], id: "recX9" });
  assert.throws(() => fromAirtable(raw), /רשומה אחת עם Now, ויש 2/);
});

test("נקי בכניסה: רווחים בקצוות של מפתח ושם לא יוצרים עובדה חדשה", () => {
  const raw = fakeAirtable(data);
  field(raw, "warehouses", "north", "Key", { Key: "north ", Name: " צפון " });
  const { data: back, rejected } = fromAirtable(raw);
  assert.deepEqual(rejected, []);
  assert.deepEqual(back.warehouses.find((w) => w.id === "north"), { id: "north", name: "צפון" });
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
