// רץ אחרי pnpm build. נכשל אם בקוד האתר יש טוקן של Airtable, כתובת של Airtable, או נתוני הדמה.
// SPEC.md, "גמור": נתונים מ-Airtable. ב-GitHub Actions כישלון כאן עוצר את הפרסום.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(js|html|css|map|json)$/.test(f) ? [p] : [];
  });
}

const CHECKS = [
  { name: "טוקן של Airtable (pat...)", re: /pat[A-Za-z0-9]{14}\.[a-f0-9]{64}/ },
  { name: "כתובת ה-API של Airtable", re: /api\.airtable\.com/ },
  { name: "נתוני הדמה מהקובץ", re: /SH-1000/ },
];

const problems = [];
const all = files(dist);
for (const file of all) {
  const text = readFileSync(file, "utf8");
  for (const c of CHECKS) if (c.re.test(text)) problems.push(`${c.name}: ${file.slice(dist.length)}`);
}

if (problems.length) {
  console.error("✖ בקוד האתר יש מה שלא אמור להיות שם:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ נסרקו ${all.length} קבצים ב-dist: אין טוקן, אין כתובת של Airtable, אין נתוני דמה.`);
