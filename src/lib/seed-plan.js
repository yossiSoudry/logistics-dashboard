// התוכנית של סקריפט הטעינה: מה ליצור, מה כבר קיים, מה שונה, מה מיותר. טהורה ונבדקת.
// SPEC.md, נתונים / כתיבה: בטוח להרצה חוזרת, לא דורס עריכה ב-Airtable, נקי בכניסה, סופר נכנס ויוצא.

import { TABLES, fromAirtable, toAirtableFields } from "./airtable.js";

/** המפתח של כל טבלה: לפיו מזהים רשומה שכבר קיימת. */
export const KEY_FIELD = {
  [TABLES.warehouses]: "Key",
  [TABLES.contractors]: "Key",
  [TABLES.inventory]: "SKU",
  [TABLES.shipments]: "ID",
  [TABLES.settings]: "Name",
};

/** סדר הכתיבה: קודם מה שמקשרים אליו. */
export const WRITE_ORDER = [TABLES.warehouses, TABLES.contractors, TABLES.inventory, TABLES.shipments, TABLES.settings];

const LINKS = { Warehouse: TABLES.warehouses, Contractor: TABLES.contractors };
const TABLE_KEY = Object.fromEntries(Object.entries(TABLES).map(([k, v]) => [v, k]));

/**
 * נקי בכניסה: הקובץ עובר את אותם כללים שהפונקציה בודקת בכל קריאה.
 * מחזיר את השדות לכל טבלה בצורת מפתחות (קישור = [מפתח]), בלי מה שנדחה, ואת רשימת הנדחים.
 */
export function desiredFromFile(data) {
  const identity = (list) => new Map(list.map((x) => [x.id, x.id]));
  const fields = toAirtableFields(data, { warehouses: identity(data.warehouses), contractors: identity(data.contractors) });
  // אותה בדיקה כמו בפונקציה: הקובץ כאילו נקרא מ-Airtable, קישורים לפי מפתח
  const asRecords = (list, table) => list.map((f, i) => ({ id: table === TABLES.warehouses || table === TABLES.contractors ? f.Key : `file-${i}`, createdTime: String(i).padStart(6, "0"), fields: f }));
  const raw = Object.fromEntries(Object.entries(TABLES).map(([k, t]) => [k, asRecords(fields[k], t)]));
  let rejected = [];
  try {
    rejected = fromAirtable(raw).rejected;
  } catch (e) {
    rejected = [{ table: TABLES.settings, key: "dashboard", reason: String(e.message) }];
  }
  const bad = new Set(rejected.map((r) => `${r.table}:${r.key}`));
  const desired = {};
  for (const [k, t] of Object.entries(TABLES)) {
    desired[t] = fields[k].filter((f) => !bad.has(`${t}:${String(f[KEY_FIELD[t]] ?? "").trim() || "(בלי מפתח)"}`));
  }
  return { desired, rejected };
}

/** רשומה קיימת -> שדות בצורת מפתחות, כדי להשוות לקובץ. keyOfId: לכל טבלה מקושרת, מזהה רשומה -> מפתח. */
export function toKeyForm(fields, keyOfId) {
  const out = { ...fields };
  for (const [name, table] of Object.entries(LINKS)) {
    if (Array.isArray(out[name])) out[name] = out[name].map((id) => keyOfId[table]?.get(id) ?? id);
  }
  return out;
}

const same = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  if (typeof a === "string" && typeof b === "string" && /^\d{4}-\d{2}-\d{2}T/.test(a) && /^\d{4}-\d{2}-\d{2}T/.test(b)) {
    return Date.parse(a) === Date.parse(b);
  }
  if (typeof a === "string" && typeof b === "string") return a.trim() === b.trim();
  return a === b;
};

/**
 * תוכנית לטבלה אחת. desired: שדות מהקובץ (צורת מפתחות). existing: רשומות קיימות (צורת מפתחות, עם id).
 * create: חסרות. same: קיימות וזהות. differs: קיימות ושונות (Airtable הבעלים: לא נוגעים בלי --restore).
 * fill: קיימות, וההבדל היחיד הוא שדה ריק ב-Airtable שיש לו ערך בקובץ (למשל שדה חדש). אין עריכה לדרוס, אז ממלאים.
 * גם ב-differs, השדות הריקים (blanks) מתמלאים; רק השדות שנערכו נשארים.
 * כל רשומה מהקובץ נמצאת בדיוק באחת מ: create, same, fill, differs. extra: ב-Airtable ולא בקובץ (לא נמחקות).
 */
export function planTable(table, desired, existing) {
  const keyField = KEY_FIELD[table];
  const byKey = new Map();
  for (const r of existing) {
    const key = String(r.fields[keyField] ?? "").trim();
    if (key && !byKey.has(key)) byKey.set(key, r);
  }
  const plan = { table, create: [], same: [], fill: [], differs: [], extra: [] };
  const wanted = new Set();
  for (const f of desired) {
    const key = String(f[keyField]).trim();
    wanted.add(key);
    const found = byKey.get(key);
    if (!found) {
      plan.create.push(f);
      continue;
    }
    const changed = Object.keys(f).filter((name) => !same(f[name], found.fields[name]));
    const isBlank = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    const blankNames = changed.filter((name) => isBlank(found.fields[name]));
    const edited = changed.filter((name) => !isBlank(found.fields[name]));
    const blanks = Object.fromEntries(blankNames.map((name) => [name, f[name]]));
    if (changed.length === 0) plan.same.push(key);
    else if (edited.length === 0) plan.fill.push({ id: found.id, key, blanks, filled: blankNames });
    else plan.differs.push({ id: found.id, key, fields: f, changed: edited, blanks, filled: blankNames });
  }
  for (const key of byKey.keys()) if (!wanted.has(key)) plan.extra.push(key);
  return plan;
}

/** ספירה נכנסת: בקובץ = נוצרו + כבר היו + מולאו + שונות + נדחו בכניסה. אם לא, משהו הולך לאיבוד בשקט. */
export function countsAddUp(inFile, plan, rejectedHere) {
  return inFile === plan.create.length + plan.same.length + plan.fill.length + plan.differs.length + rejectedHere;
}

/** שדות קישור בצורת מפתחות -> מזהי רשומות, לפני כתיבה. */
export function resolveLinks(fields, idOfKey) {
  const out = { ...fields };
  for (const [name, table] of Object.entries(LINKS)) {
    if (Array.isArray(out[name])) {
      out[name] = out[name].map((key) => {
        const id = idOfKey[table]?.get(key);
        if (!id) throw new Error(`אין רשומה ${key} בטבלה ${table}`);
        return id;
      });
    }
  }
  return out;
}

export { TABLE_KEY };
