// חישובים טהורים על הנתונים. בלי DOM. זה מה שנבדק.
// ראה SPEC.md, סעיף "גמור" לכל פיצ'ר חובה.

export const STATUSES = ["pending", "in_transit", "delivered", "failed"];

export const STATUS_LABELS = {
  pending: "ממתין",
  in_transit: "בדרך",
  delivered: "נמסר",
  failed: "נכשל",
};

/** סיכום משלוחים לפי סטטוס. תמיד מחזיר את ארבעת המפתחות. */
export function summarizeByStatus(shipments) {
  const summary = { pending: 0, in_transit: 0, delivered: 0, failed: 0 };
  for (const s of shipments) {
    if (s.status in summary) summary[s.status] += 1;
  }
  return summary;
}

/** פריט נמוך = כמות מתחת למינימום. שווה למינימום אינו נמוך. */
export function isLowStock(item) {
  return item.quantity < item.minimum;
}

export function lowStockItems(inventory) {
  return inventory.filter(isLowStock);
}

/**
 * ביצועי קבלנים: שורה לכל קבלן שיש לו משלוח היום.
 * אחוז מסירה = נמסרו / סך הכל, מעוגל לאחוז שלם.
 */
export function contractorPerformance(shipments, contractors) {
  const byId = new Map();
  for (const s of shipments) {
    if (!byId.has(s.contractorId)) byId.set(s.contractorId, { total: 0, delivered: 0 });
    const row = byId.get(s.contractorId);
    row.total += 1;
    if (s.status === "delivered") row.delivered += 1;
  }
  const names = new Map(contractors.map((c) => [c.id, c.name]));
  return [...byId.entries()].map(([id, row]) => ({
    id,
    name: names.get(id) ?? id,
    total: row.total,
    delivered: row.delivered,
    rate: Math.round((row.delivered / row.total) * 100),
  }));
}

/**
 * סינון לפי מחסן ולפי קבלן. ערך ריק או "all" = הכל.
 * מחזיר אובייקט חדש ואינו משנה את הקלט.
 * מחסן מצמצם משלוחים ומלאי. קבלן מצמצם משלוחים בלבד.
 */
export function applyFilters(data, { warehouseId = "all", contractorId = "all" } = {}) {
  const wh = !warehouseId || warehouseId === "all" ? null : warehouseId;
  const ct = !contractorId || contractorId === "all" ? null : contractorId;
  const shipments = data.shipments.filter(
    (s) => (!wh || s.warehouseId === wh) && (!ct || s.contractorId === ct),
  );
  const inventory = data.inventory.filter((i) => !wh || i.warehouseId === wh);
  return { ...data, shipments, inventory };
}

// ---------------------------------------------------------------------------
// עמוד משלוחים. SPEC.md, "גמור": משלוחים וחיפוש.

/**
 * חיפוש לפי חלק משם הלקוח או ממספר המשלוח, וסינון לפי סטטוס.
 * לא תלוי באותיות גדולות או קטנות, מתעלם מרווחים בקצוות. מחזיר מערך חדש.
 */
export function queryShipments(shipments, { search = "", status = "all" } = {}) {
  const q = String(search ?? "").trim().toLowerCase();
  return shipments.filter(
    (s) =>
      (!status || status === "all" || s.status === status) &&
      (!q || s.customer.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)),
  );
}

/** "2026-11-08T07:05:00" -> "07:05" */
export function timeOf(isoDateTime) {
  return isoDateTime.slice(11, 16);
}

// ---------------------------------------------------------------------------
// עמוד תקועים. SPEC.md, "גמור": משלוחים תקועים.

export const STUCK_THRESHOLD_MINUTES = 180;

const OPEN_STATUSES = new Set(["pending", "in_transit"]);

/** דקות שלמות בין שני זמנים בפורמט ISO בלי אזור זמן (שניהם באותו אזור). */
export function minutesBetween(fromIso, toIso) {
  return Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
}

/**
 * משלוח תקוע = ממתין או בדרך, ועברו יותר מ-STUCK_THRESHOLD_MINUTES מאז שנוצר.
 * ממוין מההמתנה הארוכה לקצרה. כל שורה מקבלת waitedMinutes.
 */
export function stuckShipments(shipments, now) {
  return shipments
    .filter((s) => OPEN_STATUSES.has(s.status))
    .map((s) => ({ ...s, waitedMinutes: minutesBetween(s.createdAt, now) }))
    .filter((s) => s.waitedMinutes > STUCK_THRESHOLD_MINUTES)
    .sort((a, b) => b.waitedMinutes - a.waitedMinutes || a.id.localeCompare(b.id));
}

/** 192 -> "3 ש׳ 12 ד׳" ; 45 -> "45 ד׳" */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ד׳`;
  if (m === 0) return `${h} ש׳`;
  return `${h} ש׳ ${m} ד׳`;
}

// ---------------------------------------------------------------------------
// עמוד לפי שעה. SPEC.md, "גמור": משלוחים לפי שעה.

/**
 * שורה לכל שעה עגולה שיש בה משלוחים, ממוינת מהמוקדמת למאוחרת,
 * עם ספירה לכל סטטוס ו-total.
 */
export function hourlyCounts(shipments) {
  const byHour = new Map();
  for (const s of shipments) {
    const hour = Number(s.createdAt.slice(11, 13));
    if (!byHour.has(hour)) {
      byHour.set(hour, { hour, label: `${String(hour).padStart(2, "0")}:00`, pending: 0, in_transit: 0, delivered: 0, failed: 0, total: 0 });
    }
    const row = byHour.get(hour);
    if (s.status in row) row[s.status] += 1;
    row.total += 1;
  }
  return [...byHour.values()].sort((a, b) => a.hour - b.hour);
}

// ---------------------------------------------------------------------------
// סרגל הצד. SPEC.md, "גמור": סינון (מחליף מחסן ורשימת קבלנים).

/** לכל מחסן: מספר הפריטים ומספר הפריטים מתחת למינימום. */
export function warehouseSummary(warehouses, inventory) {
  return warehouses.map((w) => {
    const items = inventory.filter((i) => i.warehouseId === w.id);
    return { id: w.id, name: w.name, items: items.length, low: lowStockItems(items).length };
  });
}

/** לחיצה על קבלן בוחרת אותו; לחיצה נוספת על אותו קבלן מבטלת ("all"). */
export function toggleContractor(current, id) {
  return current === id ? "all" : id;
}
