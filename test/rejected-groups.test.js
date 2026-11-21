// SPEC.md, נתונים / הידיים: רשומות לא תקינות עם אותה סיבה בשורה אחת
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRejected } from "../src/logic.js";

test("אותה טבלה ואותה סיבה בקבוצה אחת, לפי סדר ההופעה, עם כמה ומה", () => {
  const moved = 'סטטוס לא מוכר: "בתנועה". נראה שזה "בדרך" ששמו שונה ב-Airtable: מחזירים את השם "בדרך".';
  const groups = groupRejected([
    { table: "Shipments", key: "SH-1003", reason: moved },
    { table: "Inventory", key: "SKU-001", reason: "Quantity צריך להיות מספר שלם, אפס ומעלה" },
    { table: "Shipments", key: "SH-1007", reason: moved },
    { table: "Shipments", key: "SH-1012", reason: moved },
  ]);
  assert.deepEqual(groups, [
    { table: "Shipments", reason: moved, keys: ["SH-1003", "SH-1007", "SH-1012"], label: "3 משלוחים" },
    { table: "Inventory", reason: "Quantity צריך להיות מספר שלם, אפס ומעלה", keys: ["SKU-001"], label: "פריט אחד" },
  ]);
});

test("אותה סיבה בטבלאות שונות היא שתי קבוצות; רשימה ריקה היא אפס קבוצות", () => {
  const groups = groupRejected([
    { table: "Warehouses", key: "", reason: "חסר Name" },
    { table: "Contractors", key: "c9", reason: "חסר Name" },
  ]);
  assert.deepEqual(groups.map((g) => g.label), ["מחסן אחד", "קבלן אחד"]);
  assert.deepEqual(groupRejected([]), []);
});
