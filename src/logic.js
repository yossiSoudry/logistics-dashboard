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
