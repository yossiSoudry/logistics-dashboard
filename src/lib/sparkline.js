// גאומטריה טהורה לגרפי מגמה קטנים (sparklines). בלי DOM. נבדק ב-test/sparkline.test.js.
// SVG פשוט ולא Recharts, כדי שעמוד הסקירה ייטען מהר בטלפון.

const round = (n) => Math.round(n * 100) / 100;

/**
 * נקודות [x, y] לסדרת ערכים בתוך מלבן width על height.
 * rtl: הערך הראשון (השעה המוקדמת) בצד ימין.
 * הבסיס הוא 0, כדי שהבדל קטן בין שעות לא ייראה כמו קפיצה.
 */
export function sparklinePoints(values, width, height, { rtl = true, padX = 0, padY = 4 } = {}) {
  const n = values.length;
  if (n === 0 || width <= 0 || height <= 0) return [];
  const max = Math.max(0, ...values);
  return values.map((v, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const xLtr = padX + t * (width - 2 * padX);
    const x = rtl ? width - xLtr : xLtr;
    const y = max === 0 ? height - padY : padY + (1 - v / max) * (height - 2 * padY);
    return [round(x), round(y)];
  });
}

/**
 * קו חלק דרך כל הנקודות (Catmull-Rom כעקומות בזייה). נקודות הבקרה נחתכות לטווח ה-y
 * של הנקודות, כך שהקו לא חורג מעל השיא או מתחת לאפס.
 */
export function smoothPath(points) {
  if (points.length === 0) return "";
  const ys = points.map(([, y]) => y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const clampY = (y) => round(Math.min(maxY, Math.max(minY, y)));
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [round(p1[0] + (p2[0] - p0[0]) / 6), clampY(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [round(p2[0] - (p3[0] - p1[0]) / 6), clampY(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** סכום מצטבר: [1, 0, 2] -> [1, 1, 3]. בכרטיסי הסטטוס, כדי שהמגמה לאורך היום תהיה קריאה. */
export function cumulative(values) {
  let sum = 0;
  return values.map((v) => (sum += v));
}

/** השטח שמתחת לקו, סגור עד תחתית המלבן. */
export function areaPath(points, height) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points)} L${last[0]},${height} L${first[0]},${height} Z`;
}
