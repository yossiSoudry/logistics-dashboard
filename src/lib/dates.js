// חשבון תאריכים של לוח שנה, בלי שעון ובלי אזור זמן. משותף לאתר ולפונקציות.

/** "2026-11-08" + 7 -> "2026-11-15" */
export function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = ראשון ... 6 = שבת */
export const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** יום ראשון שפותח את השבוע של התאריך או השעה: "2026-11-13T16:22:00" -> "2026-11-08" */
export function weekOf(localIsoOrDate) {
  const date = String(localIsoOrDate).slice(0, 10);
  return addDays(date, -weekdayOf(date));
}
