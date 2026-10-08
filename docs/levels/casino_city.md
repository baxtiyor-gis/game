# Casino City (70-yillar neon kazino shahri, oqshom)

Fayl: `data/levels/casino_city.json` (+ konstantalar `data/levels/casino.json`). 400x400 m, markaz (0,0), +x sharq (o'ngga), +z janub (pastga). Oqshom: to'q binafsha osmon (`#1d0f3f` -> pushti-to'q sariq ufq `#d0487c`), iliq pushti tuman (70..360 m), past quyosh (0.75, `#ff9a70`). Yer — cho'l qumi (`terrain.tint`). Neon: emissive + `toneMapped:false` (bloom ushlaydi), haqiqiy PointLight YO'Q. `mergeCell: 400` — butun statik sahna bitta fazoviy katakka birlashtiriladi (bulvar bo'ylab hammasi ko'rinadi, draw call kam).

## Yuqoridan (reja)

```
 z=-200 ^^^^^^ shimoliy tog'lar (40-55 m) ^^^^^^        [DICE (0,-110) aylanuvchi zar]
        |  W1 ROYAL COBRA (twin)        |  E1 LUCKY COMET (slab)      P = palma, N = neon viveska (destructible)
 z=-120 |  W2 ATLAS 77 (stepped)  P N   B   N P  E2 NOVA PALACE (stepped)
        |                          bulvar x=-16..16, o'rtada median (x=-3..3, neon chegara)
 z=-60  |  [LOT-W: mashinalar]     [JACKPOT (0,-30) slot avtomati]  [AZS + 2 fuelTank]  <- E tomonda
        |  W3 NOVA PALACE (slab)                                  
 z=+10  |                                 ~~~ FAVVORA hovuzi (36,10) 24x16 ~~~   [LOT-E mashinalar]
        |  PANDUS ^ (-80,48..84)   [WHEEL (0,60) aylanuvchi ruletka]   E3 SCARAB GOLD (twin)
 z=+104 |  GARAJ (-80,104) tomga pandus                            E4 PALM ORCHID (slab)
 z=+200 |  MOTEL (-148,-50) cho'l chetida (g'arb)      KAPELLA (150,70) cho'l chetida (sharq)  ^^ janubiy tog'lar
```
Bulvar — shimol-janub yo'nalishida (z), eni 32 m: asfalt, o'rtada median va ikki chetida pushti/ko'k neon chiziqlar; chiroq ustunlari (x=±18.5, har 26 m, kollayderli). Ikki yonda 40 m li yaya plazalari; minoralar x=±(58..100) da, old tomoni bulvarga qaraydi.

## Relyef
Markaz va minoralar ostida tekis (`flats`, h=0: bulvar, ikki yon yo'lak, motel, kapella); atrofda tog'lar (`hills`) va past dyunalar. Hovuz — kapsula `flats` (h=-0.9, r=8.5) + suv yuzasi `water` (y=-0.35, to'rtburchak [24,2,48,18]).

## Proplar (`src/levels/props/`, `populateCasino.ts`)
- **casinoTower**: fasad — protsedural deraza teksturasi (`DataTexture`, takrorlanadi; yoritilgan derazalar emissive), podium + yonib turuvchi soyabon, burchak va belbog' neonlari, tomda neon yozuv paneli (matn `strings.json casino.sign.*`, canvas; test/Nodeda oddiy neon). Variantlar: `slab`, `stepped` (3 pog'ona), `twin` (ikki minora + ko'prik). `scheme` — devor va neon juftligi.
- **garage** (`parkingGarage.ts`): ochiq 1-qavat (ustunlar) + tom (H=6 m, to'siq bilan) + uzun pandus (36 m, qiyalik ~9.5 deg, eni 8 m, yon to'siqlar). Pandus kollayderi — qiya kuboid (kollayder balandligi 0 -> 6 m); tomda va ichida mashinalar, sandiqlar. Pandus lokal +x tomonda (yaw pi/2 da — shimolga).
- **fountain**: havza toshi, markaziy ustun, piyolalar, shaffof suv oqimlari, ko'k chiroqlar; kollayder — silindr (r=3.6). Suv: `water.ts` (sayoz: yurish mumkin, tezlik pasayadi).
- **parkedCar**: statik 70-yillar kupesi (kuboid kollayder; `scheme` — rang, `lift` — poydevor, garaj tomi uchun). Portlovchi variant — destructible `explosiveCar` (HP 12, R=11, zarar 38).
- **palmTree**: 2 InstancedMesh (egilgan tana, barglar), ~70 dona, ingichka silindr kollayder.
- **motel** (L shaklli, rang-barang eshiklar, baland neon viveska), **chapel** (to'y kapellasi, shpil, pushti neon yurak), **station** (mavjud yoqilg'i shoxobchasi) + 2 ta `fuelTank` (destructible), **strip** (yo'l/yaya maydoni/avtoturargoh qoplamalari), `rock` (sahro toshlari).
- **neonSign** (destructible, 12 ta): `destructibles.json -> neonSign` HP 12, kichik 'explosion' (R=6, zarar 5 — "uchqun"). Sinsa: kollayder olib tashlanadi, chiroqli panel va lampochkalar yo'qoladi, qiyshaygan o'chgan panel + ustun qoldig'i. Ba'zilaridan sandiq tushadi.
- **rouletteSign** (`rouletteSign.ts`): aylanuvchi ulkan ruletka g'ildiragi (0,60) va zar (0,-110) + ustun kollayderi; `CasinoDecoSystem` ularni aylantiradi va pushti/ko'k neon intensivligini sinus bilan pulsatsiya qiladi.

## Interaktiv: Jackpot (`jackpot.ts`, `props/jackpotMachine.ts`)
Bulvar o'rtasidagi ulkan o'yin avtomati (0,-30), kollayderi `hitTarget` (`id: 'jackpot'`). Otilsa (to'g'ridan-to'g'ri / `'damage'` targetId='jackpot' / yaqin portlash):
1. `spin` (3 s): 3 reel aylanadi (ketma-ket to'xtaydi), richag tushadi, lampochkalar tez chaqnaydi. Natija spin boshida tanlanadi (`rng`, test uchun almashtiriladi).
2. Natija: 70% — atrofga (R=7.5 m) 3-4 ta tasodifiy qurol sandig'i (`onDrop` -> `PickupSystem.drop`, reellar 7-7-7); 30% — kichik portlash (R=13, zarar 22, `sourceId:'jackpot'`, reellar bomba-bomba-bomba).
3. `cooldown` (30 s): lampalar xiralashadi, otish e'tiborsiz; so'ng qayta tayyor.

## Spawn va sandiqlar
12 spawn: bulvar yo'laklari va plazalarda, >=15 m oraliq, qiyalik < 0.08, binolar/viveskalardan uzoq. 28 sandiq (7 tur): bulvar, plazalar, avtoturargohlar, cho'l chekkasi, garaj ichi va tomi (2 ta, y=+6.4).

## Unumdorlik
Statik proplar `mergeStatic` bilan material bo'yicha birlashadi (porlovchi `toneMapped:false` materiallar soya tashlamaydi); archa/palma — InstancedMesh. Draw call ~450 (soyali o'tish bilan), eng uzun bloklovchi vazifa < 3 s (`SCENARIOS=play-casino_city node tests/e2e/perf.mjs`).

Test URL: `#play-casino_city`. Testlar: `tests/levelsCasino.test.ts` (+ `ARENA=casino_city node tests/e2e/combat.mjs`).
