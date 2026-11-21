// המרה טהורה בין רשומות Airtable למבנה הנתונים של הלוח, בשני הכיוונים.
// בלי רשת ובלי DOM. נבדק ב-test/airtable.test.js.
// SPEC.md, "נתונים": ארבע טבלאות, שמות באנגלית, ערכים בעברית, קשרים בשדות קישור.

export const TIME_ZONE = "Asia/Jerusalem";

export const TABLES = {
  warehouses: "Warehouses",
  contractors: "Contractors",
  inventory: "Inventory",
  shipments: "Shipments",
};

/** התיאור של השדה Status ב-Airtable. */
export const STATUS_FIELD_DESCRIPTION =
  "לא לשנות את השמות של האפשרויות: הלוח מזהה סטטוס לפי השם, ומשלוח עם שם אחר לא נכנס ללוח. שינוי שם מתחיל בקוד (SPEC.md), ורק אחר כך כאן.";

/** הסטטוסים נשמרים ב-Airtable בעברית, כדי שיהיה נוח לערוך אותם שם. */
export const STATUS_TO_AIRTABLE = {
  pending: "ממתין",
  in_transit: "בדרך",
  delivered: "נמסר",
  failed: "נכשל",
};
export const STATUS_FROM_AIRTABLE = Object.fromEntries(
  Object.entries(STATUS_TO_AIRTABLE).map(([k, v]) => [v, k]),
);

const DATE_TIME = {
  type: "dateTime",
  options: { timeZone: TIME_ZONE, dateFormat: { name: "iso" }, timeFormat: { name: "24hour" } },
};
const INTEGER = { type: "number", options: { precision: 0 } };
const TEXT = { type: "singleLineText" };

/**
 * מבנה הטבלאות, לפי הסדר שבו יוצרים אותן (קישור צריך טבלה קיימת).
 * השדה הראשון הוא השדה הראשי. link = שם הטבלה המקושרת.
 */
export const SCHEMA = [
  {
    name: TABLES.warehouses,
    fields: [{ name: "Key", ...TEXT }, { name: "Name", ...TEXT }, { name: "City", ...TEXT }, { name: "Geoname ID", ...INTEGER }],
  },
  { name: TABLES.contractors, fields: [{ name: "Key", ...TEXT }, { name: "Name", ...TEXT }] },
  {
    name: TABLES.inventory,
    fields: [
      { name: "SKU", ...TEXT },
      { name: "Name", ...TEXT },
      { name: "Warehouse", link: TABLES.warehouses },
      { name: "Quantity", ...INTEGER },
      { name: "Minimum", ...INTEGER },
    ],
  },
  {
    name: TABLES.shipments,
    fields: [
      { name: "ID", ...TEXT },
      { name: "Customer", ...TEXT },
      { name: "Warehouse", link: TABLES.warehouses },
      { name: "Contractor", link: TABLES.contractors },
      {
        name: "Status",
        type: "singleSelect",
        // התיאור מופיע ב-Airtable ליד השדה: מי שעורך רואה אותו (SPEC.md, נתונים / הידיים)
        description: STATUS_FIELD_DESCRIPTION,
        options: { choices: Object.values(STATUS_TO_AIRTABLE).map((name) => ({ name })) },
      },
      { name: "Created At", ...DATE_TIME },
    ],
  },
];

// ---------------------------------------------------------------------------
// זמן: Airtable מחזיר תאריך ושעה כ-UTC. הלוח עובד בשעון ישראל, בלי אזור זמן במחרוזת.

/** "2026-11-08T05:05:00.000Z" -> "2026-11-08T07:05:00" (שעון ישראל) */
/** "2026-11-08T18:00:00": תאריך ושעה מקומיים, בלי אזור זמן. */
export const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export function toLocalIso(utcIso, timeZone = TIME_ZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(utcIso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

/** "2026-11-08T07:05:00" (שעון ישראל) -> "2026-11-08T05:05:00.000Z" */
export function fromLocalIso(localIso, timeZone = TIME_ZONE) {
  const asUtc = Date.parse(`${localIso}Z`);
  const offset = Date.parse(`${toLocalIso(new Date(asUtc).toISOString(), timeZone)}Z`) - asUtc;
  return new Date(asUtc - offset).toISOString();
}

// ---------------------------------------------------------------------------
// Airtable -> לוח

const byKey = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true });
const text = (v) => (typeof v === "string" ? v.trim() : "");
const isCount = (v) => Number.isInteger(v) && v >= 0;

/** הסדר שבו "הראשונה נשארת" במפתח כפול: לפי זמן היצירה ב-Airtable, ואז המזהה. */
const byCreated = (list) =>
  [...list].sort((a, b) => String(a.createdTime ?? "").localeCompare(String(b.createdTime ?? "")) || String(a.id).localeCompare(String(b.id)));

const TABLE_ORDER = Object.values(TABLES);

/**
 * רשומות Airtable (לפי טבלה) -> מבנה הנתונים של הלוח, אחרי בדיקת הכללים (SPEC.md, נתונים / הכללים).
 * Airtable אוכף רק סוג שדה; כאן, בדלת היחידה לנתונים, נבדקים חובה, ייחודי, תקין ומחובר.
 * רשומה ששוברת כלל לא נכנסת, ומופיעה ב-rejected עם טבלה, מפתח וסיבה.
 * מיון לפי המפתח, כדי שהסדר לא יהיה תלוי בסדר שבו Airtable מחזיר רשומות.
 * now: "עכשיו" בשעון ישראל, מהשרת (src/lib/now.js). הגדרה ולא נתון, ולכן לא מגיע מ-Airtable.
 */
export function fromAirtable({ warehouses, contractors, inventory, shipments }, now) {
  if (!LOCAL_DATETIME.test(String(now ?? ""))) throw new Error(`"עכשיו" לא תקין: ${now}`);
  const rejected = [];
  const reject = (table, key, reason) => rejected.push({ table, key: key || "(בלי מפתח)", reason });
  const date = now.slice(0, 10);

  /** מפתח חובה וייחודי (הראשונה נשארת), ואז הבדיקה של הטבלה. מחזיר מזהה רשומה -> שורה תקינה. */
  function checkTable(table, list, keyField, check) {
    const seen = new Set();
    const valid = new Map();
    for (const r of byCreated(list)) {
      const key = text(r.fields[keyField]);
      if (!key) {
        reject(table, "", `חסר ${keyField}`);
        continue;
      }
      if (seen.has(key)) {
        reject(table, key, `${keyField} כפול: הרשומה הראשונה נשארת`);
        continue;
      }
      seen.add(key);
      const row = check(r.fields, key);
      if (typeof row === "string") reject(table, key, row);
      else if (row) valid.set(r.id, row); // null: תקין, אבל לא שייך ללוח הזה (משלוח מיום אחר)
    }
    return valid;
  }

  /** קישור: בדיוק רשומה אחת, קיימת ותקינה. */
  const link = (value, targets, what) => {
    if (!Array.isArray(value) || value.length === 0) return { error: `חסר ${what}` };
    if (value.length > 1) return { error: `יותר מ${what} אחד` };
    const target = targets.get(value[0]);
    return target ? { id: target.id } : { error: `ה${what} לא קיים או לא תקין` };
  };

  const named = (f, key) => (text(f.Name) ? { id: key, name: text(f.Name) } : "חסר Name");
  // מיקום (רשות): Geoname ID לא תקין לא מוציא את המחסן מהלוח, רק את זמני השבת שלו, ונרשם עם הסיבה
  const warehouseRows = checkTable(TABLES.warehouses, warehouses, "Key", (f, key) => {
    const row = named(f, key);
    if (typeof row === "string") return row;
    if (text(f.City)) row.city = text(f.City);
    const g = f["Geoname ID"];
    if (g !== undefined && g !== null && g !== "") {
      if (Number.isInteger(g) && g > 0) row.geonameId = g;
      else reject(TABLES.warehouses, key, "Geoname ID לא תקין: המחסן נכלל, בלי זמני שבת");
    }
    return row;
  });
  const contractorRows = checkTable(TABLES.contractors, contractors, "Key", named);

  const inventoryRows = checkTable(TABLES.inventory, inventory, "SKU", (f, sku) => {
    if (!text(f.Name)) return "חסר Name";
    const w = link(f.Warehouse, warehouseRows, "מחסן");
    if (w.error) return w.error;
    if (!isCount(f.Quantity)) return "Quantity צריך להיות מספר שלם, אפס ומעלה";
    if (!isCount(f.Minimum)) return "Minimum צריך להיות מספר שלם, אפס ומעלה";
    return { sku, name: text(f.Name), warehouseId: w.id, quantity: f.Quantity, minimum: f.Minimum };
  });

  // שם של אפשרות שהשתנה ב-Airtable: סטטוס מוכר נעלם לגמרי, ובמקומו הופיע אחד לא מוכר
  const statusesSeen = new Set(shipments.map((r) => text(r.fields.Status)).filter(Boolean));
  const unknownStatuses = [...statusesSeen].filter((s) => !STATUS_FROM_AIRTABLE[s]);
  const missingStatuses = Object.values(STATUS_TO_AIRTABLE).filter((s) => !statusesSeen.has(s));
  const renamedFrom = unknownStatuses.length === 1 && missingStatuses.length === 1 ? missingStatuses[0] : null;

  const shipmentRows = checkTable(TABLES.shipments, shipments, "ID", (f, id) => {
    if (!text(f.Customer)) return "חסר Customer";
    const w = link(f.Warehouse, warehouseRows, "מחסן");
    if (w.error) return w.error;
    const c = link(f.Contractor, contractorRows, "קבלן");
    if (c.error) return c.error;
    const status = STATUS_FROM_AIRTABLE[f.Status];
    if (!status) return f.Status ? unknownStatusReason(text(f.Status), renamedFrom) : "חסר Status";
    if (!f["Created At"]) return "חסר Created At";
    const createdAt = toLocalIso(f["Created At"]);
    if (createdAt > now) return "Created At אחרי \"עכשיו\"";
    if (createdAt.slice(0, 10) !== date) return null; // מיום קודם: לא שגוי, פשוט לא ממשלוחי היום
    return { id, customer: text(f.Customer), warehouseId: w.id, contractorId: c.id, status, createdAt };
  });

  const sorted = (map, key) => [...map.values()].sort((a, b) => byKey(a[key], b[key]));
  rejected.sort((a, b) => TABLE_ORDER.indexOf(a.table) - TABLE_ORDER.indexOf(b.table) || byKey(a.key, b.key));
  return {
    data: {
      date,
      now,
      warehouses: sorted(warehouseRows, "id"),
      contractors: sorted(contractorRows, "id"),
      inventory: sorted(inventoryRows, "sku"),
      shipments: sorted(shipmentRows, "id"),
    },
    rejected,
  };
}

/** הסיבה לסטטוס לא מוכר: מה הסטטוסים המוכרים, וכשנראה ששם שונה, לאיזה שם להחזיר. */
export function unknownStatusReason(name, renamedFrom = null) {
  if (renamedFrom) return `סטטוס לא מוכר: "${name}". נראה שזה "${renamedFrom}" ששמו שונה ב-Airtable: מחזירים את השם "${renamedFrom}".`;
  return `סטטוס לא מוכר: "${name}". הסטטוסים המוכרים: ${Object.values(STATUS_TO_AIRTABLE).join(", ")}.`;
}

// ---------------------------------------------------------------------------
// לוח -> Airtable (לסקריפט הטעינה)

/** שדות הרשומות לכל טבלה. ids = מפת מפתח -> מזהה רשומה ב-Airtable, לשדות הקישור. */
export function toAirtableFields(data, ids = { warehouses: new Map(), contractors: new Map() }) {
  const link = (map, key) => [map.get(key)];
  return {
    warehouses: data.warehouses.map((w) => ({ Key: w.id, Name: w.name, ...(w.city ? { City: w.city } : {}), ...(w.geonameId ? { "Geoname ID": w.geonameId } : {}) })),
    contractors: data.contractors.map((c) => ({ Key: c.id, Name: c.name })),
    inventory: data.inventory.map((i) => ({
      SKU: i.sku,
      Name: i.name,
      Warehouse: link(ids.warehouses, i.warehouseId),
      Quantity: i.quantity,
      Minimum: i.minimum,
    })),
    shipments: data.shipments.map((s) => ({
      ID: s.id,
      Customer: s.customer,
      Warehouse: link(ids.warehouses, s.warehouseId),
      Contractor: link(ids.contractors, s.contractorId),
      Status: STATUS_TO_AIRTABLE[s.status],
      "Created At": fromLocalIso(s.createdAt),
    })),
  };
}
