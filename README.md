# לוח בקרה למלאי ולוגיסטיקה

מטלה 4.4 בקורס AiDO, שיעור 3: דאשבורד מלאי ולוגיסטיקה על נתוני דמה.

**האתר:** https://yossisoudry.github.io/logistics-dashboard/

- [SPEC.md](SPEC.md) – האפיון: מי, מה ומה לא, איפה, פיצ'רים, ומה נחשב "גמור".
- [Practice.md](Practice.md) – איך עובדים על הפרויקט: סקירה, תוכנית, בנייה, בדיקות, קומיט.

## הסטאק

Vite, React, Tailwind ו-[shadcn/ui](https://ui.shadcn.com) במצב RTL, בערכת הצבעים Twitter של [tweakcn](https://tweakcn.com).
מצב בהיר, כהה ולפי המערכת. GitHub Actions בונה ומפרסם ל-GitHub Pages בכל דחיפה ל-main.

## הרצה מקומית

```
pnpm install
pnpm dev
```

## בדיקות ובנייה

```
pnpm test
pnpm build
```

הבדיקות ב-`test/` נגזרות משורות ה"גמור" ב-SPEC.md. הן רצות עם `node --test` על הלוגיקה הטהורה:
`src/logic.js` לנתונים ו-`src/lib/theme.js` למצב הבהיר והכהה.
