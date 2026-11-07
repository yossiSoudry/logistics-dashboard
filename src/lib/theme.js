// לוגיקה טהורה של מצב בהיר וכהה. בלי DOM ובלי React. זה מה שנבדק.
// ראה SPEC.md, "גמור": מצב בהיר וכהה.

// אותו מפתח משמש גם בסקריפט המוקדם ב-index.html (נבדק ב-test/theme.test.js)
export const THEME_STORAGE_KEY = "logistics-dashboard-theme";

export const THEME_PREFERENCES = ["light", "dark", "system"];

export const THEME_LABELS = {
  light: "בהיר",
  dark: "כהה",
  system: "לפי המערכת",
};

/** ערך שמור לא מוכר, ריק או חסר הופך לברירת המחדל: לפי המערכת. */
export function normalizePreference(value) {
  return THEME_PREFERENCES.includes(value) ? value : "system";
}

/** ההעדפה של המשתמש וההעדפה של המערכת קובעות את המצב שמוצג בפועל. */
export function resolveTheme(preference, systemPrefersDark) {
  const pref = normalizePreference(preference);
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}
