# Project: browser remake of Vigilante 8 (vehicular combat)

Plan: `docs/PLAN.md` (Uzbek, tasks T*.*). Spec: `docs/GDD.md`. Progress log: `docs/PROGRESS.md`.
Stack: TypeScript, Vite, Three.js, Rapier3D (WASM), Vitest, Playwright.

## Commands
- `npm run dev` — dev server
- `npm run check` — lint + typecheck + unit tests (must pass before commit)
- `npm run e2e` — Playwright smoke

## Rules
- Content/balance lives in `data/*.json`; no magic numbers in code.
- Cross-module access only through `src/core/types.ts` contracts. Don't read other modules' internals.
- Files ≤ 300 lines, one responsibility each.
- No original Vigilante 8 assets (models, textures, audio, logos). Original/procedural/CC0 only.
- All user-facing strings in `data/strings.json`.
- Physics fixed 60 Hz; render interpolated.
- Read narrowly: Grep/Glob first, then Read with offset/limit.
- Agent reports: ≤10 lines (what changed, files, test result). No diffs.
- After finishing a task, append one line to `docs/PROGRESS.md`: `T#.# — done — note`.
