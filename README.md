# Know Your Coffee

Static front-end game. Vite + React + TypeScript, plain CSS.

```bash
npm install
npm run dev          # local dev server
npm run build        # type-check + static output in ./dist
npm run check-art    # prints size, viewBox and liquid-mask offset for every art file
npm run pixeldiff    # builds, then compares "/" and "/?screen=table&static=1" with reference/*.png (needs `npx playwright install chromium`)
```

Debug params: `?screen=table&static=1` (table at rest, no animation), `?test=1` (opens the test modal).

Deploy: import the repo in Vercel; framework preset Vite, build command `npm run build`, output directory `dist`.
