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
