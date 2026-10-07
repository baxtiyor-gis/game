# Loyiha: Vigilante 8 ning brauzer remeyki (avtomobil-jang o'yini)

Reja: `docs/PLAN.md` (tasklar T*.*). Spetsifikatsiya: `docs/GDD.md`. Bajarilganlar jurnali: `docs/PROGRESS.md`.
Stek: TypeScript, Vite, Three.js, Rapier3D (WASM), Vitest, Playwright.

## Buyruqlar
- `npm run dev` — dev server
- `npm run check` — lint + typecheck + unit testlar (commitdan oldin o'tishi shart)
- `npm run e2e` — Playwright smoke (brauzer, skrinshot test-results/smoke.png)

## Qoidalar
- Kontent va balans faqat `data/*.json` da; kodda "magic number" yo'q.
- Modullar bir-biriga faqat `src/core/types.ts` dagi kontraktlar orqali murojaat qiladi. Boshqa modulning ichini o'qimang.
- Fayl ≤ 300 qator, bitta fayl — bitta vazifa.
- Asl Vigilante 8 assetlari (model, tekstura, audio, logo) ishlatilmaydi. Faqat original / procedural / CC0.
- Foydalanuvchi ko'radigan barcha matnlar `data/strings.json` da.
- Fizika qat'iy 60 Hz; render interpolatsiya bilan.
- Kam o'qing: avval Grep/Glob, keyin Read (offset/limit bilan).
- Agent hisoboti: ≤10 qator (nima o'zgardi, qaysi fayllar, test natijasi). Diff yubormang.
- Task tugagach `docs/PROGRESS.md` ga bitta qator qo'shing: `T#.# — bajarildi — izoh`.
