// המרה טהורה בין רשומות Airtable למבנה הנתונים של הלוח, בשני הכיוונים.
// בלי רשת ובלי DOM. נבדק ב-test/airtable.test.js.
// SPEC.md, "נתונים": חמש טבלאות, שמות באנגלית, ערכים בעברית, קשרים בשדות קישור.

export const TIME_ZONE = "Asia/Jerusalem";

export const TABLES = {
  warehouses: "Warehouses",
  contractors: "Contractors",
  inventory: "Inventory",
  shipments: "Shipments",
  settings: "Settings",
};

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
  { name: TABLES.warehouses, fields: [{ name: "Key", ...TEXT }, { name: "Name", ...TEXT }] },
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
        options: { choices: Object.values(STATUS_TO_AIRTABLE).map((name) => ({ name })) },
      },
      { name: "Created At", ...DATE_TIME },
    ],
  },
  { name: TABLES.settings, fields: [{ name: "Name", ...TEXT }, { name: "Now", ...DATE_TIME }] },
];

// ---------------------------------------------------------------------------
// זמן: Airtable מחזיר תאריך ושעה כ-UTC. הלוח עובד בשעון ישראל, בלי אזור זמן במחרוזת.

/** "2026-11-08T05:05:00.000Z" -> "2026-11-08T07:05:00" (שעון ישראל) */
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
const firstLink = (value) => (Array.isArray(value) ? value[0] : undefined);

/**
 * רשומות Airtable (לפי טבלה) -> מבנה הנתונים של הלוח.
 * מיון לפי המפתח הראשי, כדי שהסדר לא יהיה תלוי בסדר שבו Airtable מחזיר רשומות.
 * רשומה חסרה (בלי מפתח, סטטוס לא מוכר, בלי תאריך) לא נכנסת, ונספרת ב-skipped.
 */
export function fromAirtable({ warehouses, contractors, inventory, shipments, settings }) {
  const warehouseKey = new Map(warehouses.map((r) => [r.id, r.fields.Key]));
  const contractorKey = new Map(contractors.map((r) => [r.id, r.fields.Key]));
  let skipped = 0;
  const keep = (ok) => {
    if (!ok) skipped += 1;
    return ok;
  };

  const nowField = settings.find((r) => r.fields.Now)?.fields.Now;
  if (!nowField) throw new Error("חסר השדה Now בטבלת Settings");
  const now = toLocalIso(nowField);

  const result = {
    date: now.slice(0, 10),
    now,
    warehouses: warehouses
      .filter((r) => keep(Boolean(r.fields.Key)))
      .map((r) => ({ id: r.fields.Key, name: r.fields.Name ?? r.fields.Key }))
      .sort((a, b) => byKey(a.id, b.id)),
    contractors: contractors
      .filter((r) => keep(Boolean(r.fields.Key)))
      .map((r) => ({ id: r.fields.Key, name: r.fields.Name ?? r.fields.Key }))
      .sort((a, b) => byKey(a.id, b.id)),
    inventory: inventory
      .filter((r) => keep(Boolean(r.fields.SKU && warehouseKey.get(firstLink(r.fields.Warehouse)))))
      .map((r) => ({
        sku: r.fields.SKU,
        name: r.fields.Name ?? r.fields.SKU,
        warehouseId: warehouseKey.get(firstLink(r.fields.Warehouse)),
        quantity: r.fields.Quantity ?? 0,
        minimum: r.fields.Minimum ?? 0,
      }))
      .sort((a, b) => byKey(a.sku, b.sku)),
    shipments: shipments
      .filter((r) =>
        keep(
          Boolean(
            r.fields.ID &&
              STATUS_FROM_AIRTABLE[r.fields.Status] &&
              r.fields["Created At"] &&
              warehouseKey.get(firstLink(r.fields.Warehouse)) &&
              contractorKey.get(firstLink(r.fields.Contractor)),
          ),
        ),
      )
      .map((r) => ({
        id: r.fields.ID,
        customer: r.fields.Customer ?? "",
        warehouseId: warehouseKey.get(firstLink(r.fields.Warehouse)),
        contractorId: contractorKey.get(firstLink(r.fields.Contractor)),
        status: STATUS_FROM_AIRTABLE[r.fields.Status],
        createdAt: toLocalIso(r.fields["Created At"]),
      }))
      .sort((a, b) => byKey(a.id, b.id)),
  };
  return { data: result, skipped };
}

// ---------------------------------------------------------------------------
// לוח -> Airtable (לסקריפט הטעינה)

/** שדות הרשומות לכל טבלה. ids = מפת מפתח -> מזהה רשומה ב-Airtable, לשדות הקישור. */
export function toAirtableFields(data, ids = { warehouses: new Map(), contractors: new Map() }) {
  const link = (map, key) => [map.get(key)];
  return {
    warehouses: data.warehouses.map((w) => ({ Key: w.id, Name: w.name })),
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
    settings: [{ Name: "dashboard", Now: fromLocalIso(data.now) }],
  };
}
