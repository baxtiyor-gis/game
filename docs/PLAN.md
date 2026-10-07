# Vigilante 8 — Browser Remake: Loyiha rejasi

> Maqsad: **Vigilante 8 (1998, Luxoflux / Activision, PS1/N64/GBC)** o'yinini brauzerda o'ynaladigan
> 3D avtomobil-jang o'yini sifatida mexanikasi bo'yicha 1:1 qayta yaratish.
> Texnik spetsifikatsiya (agentlar uchun, qisqa): [`docs/GDD.md`](GDD.md).

---

## 0. Muhim ogohlantirish — huquqiy jihat

"Vigilante 8" nomi, personajlar, mashina dizaynlari, musiqa va logotip Activision mulki.
**Mexanikani 1:1 takrorlash mumkin, lekin asl assetlar (model, tekstura, musiqa, ovoz, nomlar) ishlatilmaydi.**

- Kod va gameplay: asl o'yinga 1:1 (fizika his-tuyg'usi, qurollar, kombolar, arenalar tuzilishi).
- Assetlar: **o'zimiz yaratamiz** (procedural / low-poly / CC0), 70-yillar funk uslubida.
- Nomlar: ishchi nomlar asl bilan (ichki), release oldidan `data/*.json` dagi nomlar bitta faylda
  almashtiriladi (masalan "Vigilante 8" → "Outlaw '75"). Shuning uchun **barcha matnlar data-driven**.

---

## 1. Asl o'yin — tadqiqot xulosasi

| Soha | Ma'lumot |
|---|---|
| Janr | Arena avtomobil-jangi (Twisted Metal uslubi), Interstate '76 spin-off |
| Setting | 1975, AQSh janubi-g'arbi, neft inqirozi. OMAR korporatsiyasi yollagan **Coyotes** (Sid Burn boshchiligida) vs **Vigilantes** (Convoy boshchiligida) |
| Rejimlar | Quest (sujet, missiyalar), Arcade, Survival/Brawl, 2P Versus, 2P Co-op (split-screen) |
| Personajlar | 12 + yashirin (Y the Alien). Boshida 8 ta (4+4), qolganlari ochiladi |
| Arenalar | Oil Fields, Aircraft Graveyard, Hoover Dam, Ski Resort, Casino City, Secret Base (Area 51), Valley Farms, Canyonlands, Ghost Town, Super Dreamland 64 (N64/bonus) |
| Qurollar | Har mashinada cheksiz **pulemyot** + 3 slot: Interceptor Missiles, Bull's Eye Rockets, Sky Hammer Mortar, Bruiser Cannon, Roadkill Mines + **shaxsiy maxsus qurol** |
| Kombolar | Har standart qurol uchun 3 ta "special move" — fighting-game uslubida yo'nalish ketma-ketligi + pulemyot tugmasi (masalan Missile: ↑↑↓ = Halo Decoy, ↑↑↑ = Afterburner, ↑↑→ = Missile Swarm) |
| Whammy | Bir vaqtda bir nechta qurol bilan urish → x2…x6 "Whammy" bonus |
| Statlar | Acceleration, Top Speed, Armor, Target Avoidance |
| Muhit | To'liq buziladigan binolar, interaktiv elementlar: poyezdni otib qurol olish (Valley Farms), Area 51 da samolyot uchirish, neft rezervuarlari portlashi, aeroport kranlari |
| Vizual | Asl: PS1 low-poly. **Bizda: zamonaviyroq** — PBR, soyalar, bloom; PS1 ixtiyoriy "Retro" rejim |
| Audio | 70-yillar funk saundtreki, baland portlashlar, personaj ovozlari |

**Personaj ↔ mashina** (❓ = T0.1 da tasdiqlanadi):

| Fraksiya | Personaj | Mashina | Maxsus qurol |
|---|---|---|---|
| Vigilantes | Chassey Blue | '67 Rattler | Gridlock (dvigatelni o'chiruvchi flare to'ri) |
| Vigilantes | John Torque | '69 Jefferson | Bass Quake (zilzila to'lqini) |
| Vigilantes | Slick Clyde | '70 Clydesdale | White Lightning (dvigatelni o'chiruvchi chaqmoq) |
| Vigilantes | Sheila | '74 Strider ❓ | 24mm Tantrum Gun (avto-turret) |
| Vigilantes (lock) | Convoy | '72 Moth Truck ❓ | ❓ |
| Vigilantes (lock) | Dave | '70 Stag Pickup ❓ | ❓ |
| Coyotes | Loki | '73 Glenn 4x4 | ❓ (raketa) |
| Coyotes | Houston 3 | '75 Palamino ❓ | ❓ |
| Coyotes | Boogie | '76 Leprechaun ❓ | ❓ |
| Coyotes | Beezwax | '70 Van ❓ | ❓ |
| Coyotes (lock) | Sid Burn | ❓ | ❓ |
| Coyotes (lock) | Molo | '66 School Bus | ❓ |
| Yashirin | Y the Alien | UFO | ❓ |

> ⚠️ Cheklov: bu muhitda Wikipedia, GiantBomb, MobyGames, Fandom saytlari proxy tomonidan bloklangan,
> video ko'rish imkoniyati yo'q — ma'lumot qidiruv natijalaridan olindi. **T0.1** vazifasi:
> siz YouTube longplay + GameFAQs FAQ dan screenshot/matn berasiz, agent jadvalni to'ldiradi.

---

## 2. Texnologiya steki

| Qatlam | Tanlov | Sabab |
|---|---|---|
| Til / build | **TypeScript + Vite** | Tez HMR, tree-shaking, statik deploy |
| 3D render | **Three.js** (WebGL2, keyin WebGPU fallback) | Eng katta ekotizim, PS1 shaderlar oson |
| Fizika | **Rapier3D** (`@dimforge/rapier3d-compat`, WASM) + `DynamicRayCastVehicleController` | Deterministik, tez, vehicle controller tayyor |
| Arxitektura | Yengil **ECS** (o'zimizniki yoki `bitecs`) | Ko'p snaryad/zarra uchun samarali |
| Audio | **Web Audio API** (Howler.js ixtiyoriy) | Pozitsion 3D ovoz |
| Input | Klaviatura + **Gamepad API** | 2P split-screen: KB + gamepad |
| Assetlar | glTF (Blender low-poly), procedural teksturalar 64–128px | PS1 his-tuyg'usi, kichik hajm |
| Test | **Vitest** (logika) + **Playwright** (smoke/screenshot) | Headless CI |
| Deploy | GitHub Pages / Cloudflare Pages | Bepul, statik |
| Online (F10, ixtiyoriy) | WebRTC (P2P) + kichik signaling server | 1:1 da yo'q, bonus |

**Arxitektura (papkalar):**
```
src/
  core/       loop (fixed 60Hz physics, variable render), events, ecs, assets
  input/      keyboard, gamepad, combo-buffer
  physics/    rapier world, vehicle controller, collision groups
  vehicles/   VehicleEntity, damage model, stats → handling
  weapons/    machinegun, missile, rocket, mortar, cannon, mines, specials/, combos
  ai/         behaviour tree / utility AI, navmesh/waypoints
  levels/     loader, destructibles, interactives (train, plane, tanks)
  modes/      arcade, quest, survival, versus, coop
  ui/         HUD, menus, char-select, results (DOM + CSS overlay)
  render/     PS1 post-fx, particles, decals, camera rigs, split-screen
  audio/
data/         vehicles.json, weapons.json, combos.json, levels/*.json, quest.json, strings.json
assets/       models/, textures/, audio/
tests/
```
Qoida: **balans va kontent faqat `data/` da**, kodda magic number yo'q → agentlar kodni o'qimay JSON bilan ishlaydi (token tejaladi).

---

## 3. Fazalar va tasklar

Belgilar: **Agent** = `.claude/agents/` dagi subagent, **Model**: H = Haiku, S = Sonnet, O = Opus.
**∥** = parallel ishlasa bo'ladi.

### F0 — Tadqiqot va spetsifikatsiya (1 hafta)
| ID | Task | Agent | Model | Natija |
|---|---|---|---|---|
| T0.1 | Asl o'yin ma'lumotlarini to'ldirish (❓ larni yopish): personaj/mashina/maxsus qurol/statlar | researcher | H | `docs/GDD.md` §Roster |
| T0.2 | Har arena uchun xarita sxemasi (top-down eskiz, interaktivlar, pickup joylari) — longplay screenshotlardan | researcher | S | `docs/levels/*.md` |
| T0.3 | Kombo jadvali (asl V8 uchun) va qurol parametrlari (damage, ammo, cooldown) | researcher | H | `data/combos.json`, `data/weapons.json` draft |
| T0.4 | Arxitektura + interfeys kontraktlari (ECS komponentlar, event nomlari) | architect | O | `docs/ARCHITECTURE.md` |

### F1 — Engine skeleti (1 hafta) — *M0: bo'sh arenada kamera bilan kub haydash*
| ID | Task | Agent | Model |
|---|---|---|---|
| T1.1 | Vite+TS+Three+Rapier loyiha, ESLint, Vitest, Playwright, CI (GitHub Actions) | engine-dev | S |
| T1.2 | Game loop: fixed-step fizika (60Hz) + interpolatsiyali render | engine-dev | S |
| T1.3 | Input qatlami + combo buffer (yo'nalish ketma-ketligi, 400ms oyna) | engine-dev | S |
| T1.4 | Kamera: chase-cam (asl o'yindek orqadan, past burchak), rear-view toggle | engine-dev | S |
| T1.5 | Asset loader (glTF, Draco), PS1 post-FX shader (vertex snap, affine UV, 320×240 render target, dithering, tuman) | render-dev | S |

### F2 — Mashina fizikasi (1–2 hafta) — *M1: "his-tuyg'u" asl o'yinga o'xshash*
| ID | Task | Agent | Model |
|---|---|---|---|
| T2.1 | Raycast vehicle: suspensiya, drift, havoda boshqaruv, ag'darilganda o'zini to'g'rilash | physics-dev | O |
| T2.2 | Statlar (accel/speed/armor/avoidance) → fizika parametrlari mapping | physics-dev | S |
| T2.3 | Damage model: HP, tutun bosqichlari (oq→qora→olov), portlash, mashina qoldig'i | gameplay-dev | S |
| T2.4 | Tuning sahnasi (debug UI: lil-gui) — asl gameplay video bilan yonma-yon solishtirish | physics-dev | S |

### F3 — Qurollar va jang (2 hafta) ∥ F4
| ID | Task | Agent | Model |
|---|---|---|---|
| T3.1 | Pulemyot (cheksiz, overheat yo'q, hitscan + tracer) | gameplay-dev | S |
| T3.2 | 5 standart qurol: Missiles (homing), Rockets, Mortar (ballistik), Cannon, Mines | gameplay-dev | S |
| T3.3 | 15 ta special move (har qurolga 3) — combo buffer orqali | gameplay-dev | S |
| T3.4 | Whammy tizimi (bir vaqtda ko'p qurol hit → x2..x6), score | gameplay-dev | H |
| T3.5 | Pickup/crate: qurol, health (wrench), maxsus qurol sandig'i, respawn taymerlari | gameplay-dev | H |
| T3.6 | 13 ta maxsus qurol (har mashinaga) — har biri alohida fayl `weapons/specials/*.ts` | gameplay-dev | S (∥ bir nechta agent) |
| T3.7 | VFX: portlash, tutun, uchqun, decal (kuyish izi), ekran silkinishi | render-dev | S |

### F4 — Sun'iy intellekt (2 hafta) ∥ F3
| ID | Task | Agent | Model |
|---|---|---|---|
| T4.1 | Arena navigatsiyasi: waypoint graf / navmesh (recast-navigation-js) | ai-dev | S |
| T4.2 | Utility AI: hujum, qochish, pickup yig'ish, health izlash, nishon tanlash | ai-dev | O |
| T4.3 | Qiyinlik darajalari (aim error, reaksiya vaqti, combo ishlatish ehtimoli) | ai-dev | S |
| T4.4 | Har personajga "shaxsiyat" profili (agressiv/ehtiyotkor) — `data/ai_profiles.json` | ai-dev | H |

### F5 — Arenalar (3–4 hafta, eng katta hajm) — har arena ∥
| ID | Task | Agent | Model |
|---|---|---|---|
| T5.0 | Level framework: JSON → sahna, destructible tizimi (fractured mesh / HP'li bino), interaktiv trigger API | level-dev | O |
| T5.1 | Oil Fields (neft rezervuarlari, nasoslar) | level-dev | S |
| T5.2 | Valley Farms (poyezd — otilsa qurol tashlaydi, shamol tegirmonlari) | level-dev | S |
| T5.3 | Aircraft Graveyard (samolyotlar, kranlar, angarlar) | level-dev | S |
| T5.4 | Secret Base / Area 51 (raketa/samolyot uchirish, bunker) | level-dev | S |
| T5.5 | Hoover Dam (to'g'on, transformatorlar) | level-dev | S |
| T5.6 | Ski Resort (qor, kanat yo'li, sirpanchiq fizika) | level-dev | S |
| T5.7 | Casino City (Las Vegas uslubi, neon, buziladigan vivekalar) | level-dev | S |
| T5.8 | Canyonlands / Ghost Town / bonus arena | level-dev | S |
| T5.9 | Low-poly modellar (procedural yoki Blender skript orqali) — har arena uchun prop to'plami | asset-dev | S |

### F6 — Roster (2 hafta) ∥ F5
| ID | Task | Agent | Model |
|---|---|---|---|
| T6.1 | 13 ta mashina modeli (low-poly, 300–800 tri, 70-yillar uslubi, original dizayn) | asset-dev | S |
| T6.2 | `data/vehicles.json` — statlar, mass, kamera offset, qurol mount nuqtalari | gameplay-dev | H |
| T6.3 | Personaj portretlari + bio matnlari (original) | asset-dev | H |
| T6.4 | Unlock tizimi (Quest yakunlash → yangi personaj) + save (localStorage) | gameplay-dev | H |

### F7 — O'yin rejimlari (2 hafta)
| ID | Task | Agent | Model |
|---|---|---|---|
| T7.1 | Arcade (1 vs N bot, arena tanlash) | gameplay-dev | S |
| T7.2 | Quest: har personajga missiyalar zanjiri, maqsadlar (yo'q qil / himoya qil / to'pla), sujet matnlari, yakun sahnasi | gameplay-dev | S |
| T7.3 | Survival / Brawl | gameplay-dev | H |
| T7.4 | 2P split-screen Versus + Co-op (2 kamera, 2 HUD, KB+Gamepad) | render-dev | S |

### F8 — UI, HUD, Audio (∥ F5–F7)
| ID | Task | Agent | Model |
|---|---|---|---|
| T8.1 | HUD: health bar, qurol ikonka+ammo, radar, whammy matni, maxsus qurol | ui-dev | S |
| T8.2 | Menyular: title, rejim, personaj tanlash (3D aylanuvchi mashina), arena tanlash, pauza, options, natijalar | ui-dev | S |
| T8.3 | Audio tizimi: 3D pozitsion SFX, dvigatel pitch (tezlikka bog'liq), musiqa crossfade | audio-dev | S |
| T8.4 | 70-yillar funk musiqa (CC0/litsenziyali yoki generatsiya) + SFX to'plami | audio-dev | H |

### F9 — Polish, optimizatsiya, release (1–2 hafta)
| ID | Task | Agent | Model |
|---|---|---|---|
| T9.1 | Performance: instancing, object pooling, LOD, 60 FPS @ o'rta noutbuk; bundle < 30MB | engine-dev | S |
| T9.2 | Balans o'tkazish (data-only o'zgarishlar) | gameplay-dev | H |
| T9.3 | Playwright smoke testlar: har arena yuklanadi, 60s bot-vs-bot crashsiz | qa | H |
| T9.4 | Code review + xavfsizlik + deploy (GitHub Pages) | reviewer | O |

### F10 — (ixtiyoriy) Online multiplayer
WebRTC P2P, host-authoritative, 2–4 o'yinchi. 1:1 asl o'yinda yo'q, keyinroq.

---

## 4. Milestonelar

| M | Nima o'ynaladi | Taxminiy |
|---|---|---|
| **M0** | Bo'sh arenada kub mashina, kamera, input | 1-hafta oxiri |
| **M1 — Vertical slice** | 1 mashina, 1 arena (Oil Fields), pulemyot + raketa, 1 bot, HUD | 4-hafta |
| **M2 — Combat complete** | 5 qurol + 15 kombo + whammy + 4 mashina + 3 arena + AI | 8-hafta |
| **M3 — Content complete** | 13 mashina, 8+ arena, barcha rejimlar | 13-hafta |
| **M4 — Release** | Polish, audio, nom/brend almashtirish, deploy | 15-hafta |

Har milestone oxirida: Playwright screenshot + qisqa video → asl o'yin bilan solishtirish.

---

## 5. Subagentlar

Fayllar: `.claude/agents/*.md`. Har biri **faqat o'z papkasini** o'qiydi/yozadi.

| Agent | Model | Mas'uliyat | Ruxsat etilgan papkalar |
|---|---|---|---|
| `architect` | Opus | Arxitektura, interfeyslar, murakkab qarorlar | `docs/`, `src/core/` |
| `researcher` | Haiku | Asl o'yin faktlari → GDD/JSON | `docs/`, `data/` |
| `engine-dev` | Sonnet | Loop, input, kamera, build, perf | `src/core/`, `src/input/`, config |
| `physics-dev` | Sonnet (T2.1 da Opus) | Mashina fizikasi | `src/physics/`, `src/vehicles/` |
| `gameplay-dev` | Sonnet | Qurollar, kombo, pickup, rejimlar | `src/weapons/`, `src/modes/`, `data/` |
| `ai-dev` | Sonnet | Botlar | `src/ai/`, `data/ai_profiles.json` |
| `level-dev` | Sonnet | Arenalar, destructibles | `src/levels/`, `data/levels/` |
| `render-dev` | Sonnet | Shader, VFX, split-screen | `src/render/` |
| `asset-dev` | Sonnet | Procedural model/tekstura skriptlari | `assets/`, `tools/` |
| `ui-dev` | Sonnet | HUD, menyular | `src/ui/` |
| `audio-dev` | Haiku | Audio tizim va SFX | `src/audio/`, `assets/audio/` |
| `qa` | Haiku | Test yozish/ishga tushirish, bug report | `tests/` |
| `reviewer` | Opus | Milestone oxirida diff review | read-only |

**Orkestratsiya oqimi (har task uchun):**
1. Asosiy sessiya (orkestrator) taskni tanlaydi → kerakli agentga **qisqa brief** beradi (task ID + kontrakt + "bajarildi" mezoni).
2. Agent ishlaydi, `npm run check` (lint+typecheck+test) o'tkazadi, **5–10 qatorlik hisobot** qaytaradi.
3. Mustaqil tasklar (masalan T5.1–T5.8, T3.6 maxsus qurollar) **parallel** agentlarga, `isolation: worktree` bilan.
4. Milestone oxirida `reviewer` + `qa`.

---

## 6. Token tejash strategiyasi

1. **Kichik `CLAUDE.md`** (≤60 qator): faqat buyruqlar, papka xaritasi, qoidalar. Uzun hujjatlar alohida, kerak bo'lganda o'qiladi.
2. **Model tanlash**: mexanik ish (JSON to'ldirish, test, balans, matn) → **Haiku**; kod → **Sonnet**; faqat arxitektura/fizika/AI yadrosi/review → **Opus**.
3. **Data-driven dizayn**: balans o'zgarishi = 1 JSON qator, kodni o'qish shart emas.
4. **Kichik fayllar** (≤300 qator), bitta fayl = bitta mas'uliyat → agent faqat kerakli faylni o'qiydi.
5. **Interfeys kontraktlari** `src/core/types.ts` da — agentlar boshqa modullarning ichini o'qimaydi, faqat tiplarni.
6. **Kichik tasklarga agent chaqirmaslik**: 1–2 fayllik tuzatishni orkestrator o'zi qiladi; agent faqat ≥1 soatlik izolyatsiyalangan ish uchun.
7. **Brief shabloni** (pastda) — agent kontekstni qayta qidirmaydi.
8. **Hisobot qisqa**: agent diff ni qaytarmaydi, faqat "nima o'zgardi, qaysi fayllar, test natijasi".
9. **Procedural assetlar**: binar fayllarni kontekstga yuklamaslik; modellar skript orqali generatsiya.
10. **Grep/Glob avval, Read keyin** — butun faylni emas, kerakli qismni (`offset/limit`).
11. **Sessiyani faza bo'yicha bo'lish**: har faza — yangi sessiya, kontekst `docs/PROGRESS.md` (qisqa jurnal) dan tiklanadi.

**Agent brief shabloni:**
```
Task: T3.2 Raketalar (Missiles)
O'qish: docs/GDD.md#qurollar, src/core/types.ts, data/weapons.json
Faqat yozish: src/weapons/missile.ts, tests/weapons/missile.test.ts
Kontrakt: Weapon interfeysini bajaradi; quvish burilish tezligi data dan
Tayyor mezoni: npm run check o'tadi; homing testi harakatdagi nishonga tegadi
Hisobot: ≤10 qator
```

---

## 7. Xavflar

| Xavf | Yechim |
|---|---|
| Mualliflik huquqi | Original assetlar, nomlar bitta faylda — release oldidan almashtiriladi |
| Fizika "his-tuyg'usi" o'xshamaydi | T2.4 tuning sahnasi, video bilan yonma-yon solishtirish, M1 da qabul testi |
| Brauzerda performance | Pooling, instancing, 320×240 internal render (PS1 uslubi o'zi yordam beradi) |
| Asl ma'lumot yetishmasligi | T0.1–T0.3; siz longplay link/screenshot berasiz |
| Scope katta | M1 vertical slice ga qat'iy e'tibor; F10 ixtiyoriy |

---

## 8. Keyingi qadam

1. Siz tasdiqlang (yoki o'zgartiring): stek, nom almashtirish siyosati, F10 kerakmi.
2. T0.1–T0.3 uchun YouTube longplay linklari / screenshotlar bering (bu muhitdan video ko'rib bo'lmaydi).
3. Men F1 (engine skeleti) ni boshlayman → M0.
