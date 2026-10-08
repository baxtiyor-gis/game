# Hoover Dam (Nevada / Arizona)

Fayl: `data/levels/hoover_dam.json` (+ konstantalar `data/levels/dam.json`). 400x400 m, markaz (0,0), +x o'ngga (sharq), +z pastga (janub). Issiq kunduzgi kanyon: to'q moviy osmon (`#1d4fa6` -> `#c9d6e4`), qizil-to'q sariq qoyalar (terrain tint `#d9a679`, `rock1..4`), iliq yengil tuman (120..520 m), yorqin quyosh (3.4). Ko'p darajali: tepada to'g'on yo'li (y=24), pastda daryo bo'yi (y=0), ikkita yo'l bilan bog'langan.

## Yuqoridan (reja)

```
 z=-200 ^^^^^^^^^^^^^ tog' ^^^^^^^^^^^^^
        |  ~~~~~~~~~~ LAKE MEAD (y=20, ko'l tubi y=6) ~~~~~~~~~~  |
        |  [IT]cliff                  cliff[IT]    isl.    isl.    |   IT = suv olish minorasi
        |  ledge(-150)  [IT]-52,-140  [IT]52,-140    ledge(+150)   |   ledge = ko'l bo'yi yo'li (y 24->22)
 z=-112 |PLAZA(-158) ===== DAM CREST (y=24, 270 m, parapet) ===== PLAZA(+158)
        |  |  fall-zone (past 24 m)                        |       |
        |  road W (-158..-96)          [TOE z~-90]         road E (158..96)
 z=-66  |  |      [POWERHOUSE W]  tailrace  [POWERHOUSE E]   |      |
        |  |       T T T (-76..-64,-38)     T T T (64..76,-38)     |   T = transformator
 z=-18  |  |                ===BRIDGE(4,-18)===                    |
        |  | PYL(-104)         river ~~~~~          PYL(104)        |
 z=+88  |  |        ford (-9,88) ~~~ ~~~                            |
        |  | yard W T(-92,64..72)          yard E T(88..94,104..118)|
 z=+200 ^^^^ canyon walls ^^^^  river exits ^^^^
```

## Yon tomondan (z kesimi, x=0)

```
 y=40 |        IT (minora)
 y=24 |  lake       ___crest road___ (parapet 1.3 m, bo'shliqlar)
 y=20 |~~~~~~~~~~~~/|               \\  (quyi oqim yuzi: 66 daraja gacha,
 y= 6 |__lakebed__/ |                \\  mashina chiqa olmaydi)
 y= 0 |                              \\______________ canyon floor
 y=-4 |                                    ~~ river bed (water y=-0.7)
      z=-165     -118  -112  -105   -90      -66 ........ +200
```

## Relyef va yo'llar

- `terrain.flats` endi **kesma (kapsula)** tekisliklarini qo'llaydi: `to` + `toHeight` (`src/levels/terrain.ts`). Shu bilan to'g'on tanasi, plato, ko'l bo'yi yo'li, serpantin va daryo o'zani relyefga o'yilgan. Haydash yuzasi — terrain heightfield; to'g'on devori (beton "teri", asfalt, parapet) uning ustida.
- **Serpantin** (har ikki chekka, ko'zgu): plato (±158,-100,y24) -> (±158,-32,y12.5) -> burilish -> (±116,-24,y6.5) -> (±96,24,y0). Nishab <= 0.26 (~15 daraja), eni 13 m. Birlashmalarda tekis maydonchalar (nishab sakramasin).
- **Daryo** (Colorado): 8 kesmali o'zan (tub y=-4), suv y=-0.7. O'rtasi chuqur (3.3 m). **Brod** (-9,88): tub y=-1.4 (sayoz, 0.6 m). **Ko'prik** (4,-18): po'lat (`bridge`, `variant: steel`), uzunligi 44 m.
- **To'g'on** (`damWall`, `props/damWall.ts`): tana — terrain (24 m, yuzi egilgan S-shakl). Ustiga terrain to'riga mos "teri" (beton, qatlam-qatlam), asfalt + o'rta chiziq, parapet (to'liq kuboid kollayder). Parapet bo'shliqlari: shimol [-8,8]; janub [-100,-88], [-40,-28], [28,40], [88,100] — shu joydan pastga (24 m) sakrash mumkin (to'qnashuv zarari).
- **Elektr stansiyasi** (`powerHouse`) x2 (±70,-66): oynali korpus, tom kranlari, mo'rilar, to'g'on tomon penstoklar.
- **Suv olish minoralari** (`intakeTower`) x4 ko'lda; **qoyalar** (`cliff`, 3 pog'onali qizil mesa) x16; **ustunlar** (`powerPylon`): ikki chiziq x=±104, z=60/110/165, simlar (8 bo'lak, osilgan).

## Tizimlar

- **Suv** (`src/levels/water.ts`, `waterMesh.ts`; JSON `water: [{id, y, rect | path+width}]`): shaffof yuza (bitta material, vertex shader da ikki sinus to'lqin + analitik normal). Mashina g'ildirak sathi suvdan past bo'lsa: chuqurlik < 0.25 — hech narsa; < 0.9 (sayoz) — tezlik `exp(-1.3 t)`; chuqurroq — `exp(-3.2 t)` va 4 hp/s zarar ('damage', `weapon: 'water'`, 0.5 s da bir); >= 2.4 m **2 s** — eng yaqin quruq tekis qirg'oqqa qaytarish (yaw saqlanadi, tezlik 0, jarima 8). Suzish/cho'kish yo'q. Barcha raqamlar `dam.json -> water`.
- **Transformatorlar** (`destructibles.json -> transformer`, `props/transformer.ts`, `src/levels/powerGrid.ts`): HP 14, portlash R=13 zarar 26 (zanjirli). `explosion` manbasi `transformer-N` bo'lsa, radius ichidagi mashinalar `stalled = 1.5` s (+ 'status' eventi); uchqunlar (Points) va yoylar (LineSegments) vizuali. 12 ta: stansiya oldida 2x3, yo'l bo'yida 2x3 (ba'zilaridan sandiq tushadi).
- **Sandiqlar (24)**: to'g'on yo'li, platolar, serpantinlar, ko'l bo'yi, kanyon tubi.
- **Spawn (8)**: 5 ta pastda (45,10), (-48,12), (50,85), (-50,135), (-30,-35); 3 ta tepada (-70,-112), (±158,-112). >=15 m oraliq, proplardan >=15 m, suvdan uzoq.
- Test URL: `#play-hoover_dam`. Testlar: `tests/levelsDam.test.ts` (+ combat e2e: `ARENA=hoover_dam node tests/e2e/combat.mjs`).
