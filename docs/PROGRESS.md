# Bajarilganlar jurnali

- T-reja — bajarildi — PLAN.md, GDD.md, CLAUDE.md, 13 ta subagent
- T0.4 — bajarildi — src/core/types.ts kontraktlari, events, loop, data loader
- T1.1–T1.4 — bajarildi — Vite+TS+Three+Rapier, fixed 60Hz loop, klaviatura/gamepad/kombo buferi, chase kamera, Vitest (6 test), Playwright smoke (`npm run e2e`) — M0 tayyor
- T2.1–T2.3 — bajarildi — Rapier raycast mashina (src/vehicles/*), data/handling.json (stat→fizika), DamageSystem; main.ts da rattler + rampalar; 11 test. Arkada sozlamalar: AWD, yon-tezlanish bilan rul cheklovi, yaw-limit, handbrake drift, havoda boshqaruv, 1.2 s o'nglanish
- T1.5+T3.7 — bajarildi — src/render/{ps1,vfx,shake,particlePool,pointsLayer}.ts, data/render.json, World.renderHook; PS1 post-FX (240p, Bayer dither, 15-bit, vertex snap), pooled VFX, kamera silkinishi; 9 test
- T3.1+T3.2+T3.5 — bajarildi — src/weapons/* (pulemyot hitscan+tracer, 5 qurol, snaryad pooli, WeaponSystem, PickupSystem), data/weaponTuning.json + pickups.json, main.ts da 10 sandiq + 2 nishon; tests/weapons.test.ts (11 test)
