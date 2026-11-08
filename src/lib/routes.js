// רשימת העמודים ופענוח הכתובת. טהור, בלי DOM. נבדק ב-test/routes.test.js.
// SPEC.md, "גמור": ניווט.

export const ROUTES = [
  { id: "overview", path: "/", label: "סקירה" },
  { id: "shipments", path: "/shipments", label: "משלוחים" },
  { id: "stuck", path: "/stuck", label: "תקועים" },
  { id: "hourly", path: "/hourly", label: "לפי שעה" },
];

export const DEFAULT_ROUTE = "overview";

/** "#/shipments" -> "shipments". ריק, "#", "#/" או כתובת לא מוכרת -> "overview". */
export function parseRoute(hash) {
  const path = String(hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  return ROUTES.find((r) => r.path === path)?.id ?? DEFAULT_ROUTE;
}

/** "shipments" -> "#/shipments" ; "overview" -> "#/" */
export function hrefFor(id) {
  const route = ROUTES.find((r) => r.id === id) ?? ROUTES[0];
  return `#${route.path}`;
}

// מבנה סרגל הצד (sidebar-07): "סקירה" לבד, ושלושת עמודי המשלוחים בקבוצה נפתחת.
export const NAV_GROUP_LABEL = "משלוחים";
export const NAV = [
  { type: "link", id: "overview", label: "סקירה" },
  {
    type: "group",
    label: NAV_GROUP_LABEL,
    items: [
      { id: "shipments", label: "כל המשלוחים" },
      { id: "stuck", label: "תקועים" },
      { id: "hourly", label: "לפי שעה" },
    ],
  },
];

/** פירורי הלחם בכותרת: ["סקירה"] או ["משלוחים", "תקועים"]. */
export function breadcrumbFor(id) {
  for (const entry of NAV) {
    if (entry.type === "link" && entry.id === id) return [entry.label];
    if (entry.type === "group") {
      const item = entry.items.find((i) => i.id === id);
      if (item) return [entry.label, item.label];
    }
  }
  return [NAV[0].label];
}
