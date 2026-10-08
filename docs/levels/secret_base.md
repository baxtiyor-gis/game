# Secret Base (Nevada, Area 51)

Fayl: `data/levels/secret_base.json` (+ konstantalar `data/levels/base.json`). 400x400 m, markaz (0,0), +x o'ngga, +z pastga. Tun: to'q ko'k-binafsha osmon, sovuq tuman (70..330 m), zaif oy yorug'i (0.9). Qumli quruq ko'l tubi, atrofda tog'lar.

```
 z=-200 ^^^^ tog' ^^^^ ^^^^ tog' ^^^^ ^^^^ tog' ^^^^
        |  HangarA(-100,-125) HangarB(-52,-125) HangarC(60,-125)+UFO     FT x4 (160..172,-110/-98)|
        |  [apron/runway z=-97, x -120..80]   Tower(5,-75)  GT(130,-85)                             |
        |  GT(-135,-70)   trucks(-75..-62,-70)  trucks(40,-70)                                      |
        |  Radar-dish(-155,-5)                       Radar-bar(150,-30)                             |
 z=0    |  ^                                                                                  ^     |
        |  GT(-120,30)                                             GT(140,30)                       |
        |  [wire] BUNKER pit (-139..-115,95) ===ramp===> (-85,95)  [wire]   GT(145,105)             |
        |  trucks(-70,58..72)                        LAUNCH: terminal(84,132) pad(115,100)          |
 z=+200 ^^^^ ^^^^ ^^^^ tog'lar ^^^^ ^^^^ ^^^^
  GT = qo'riqlash minorasi (spot = SpotLight, beam = faqat nur), ^ = tog'/qoya.
  Spawn: 8 nuqta (>=15 m oraliq, proplardan >=15 m, interaktivlardan >=20 m).
```

- **Angarlar** (`hangar`) va **NUJ qoldig'i** (`ufoWreck`, `props/ufoWreck.ts`): C angar yonida qiyshaygan disk, yashil porlovchi chiroq.
- **Radarlar** (`interactives: radar`, `src/levels/radar.ts`, `props/radarDish.ts`): `variant` bar/dish; antenna dinamik, 60 Hz burchak + render interpolatsiyasi, tezlik `base.json -> radar`.
- **Yer osti bunkeri** (`bunker`, `props/bunker.ts`): relyefga o'yilgan chuqurcha (`flats.height` < 0), g'arbdan sharqqa pandus (qiyalik < 17 daraja, mashina o'ta oladi), devorlar, ustun-chiroqlar; ichida 4 ta qurol sandig'i, chiqish bitta.
- **Qo'riqlash minoralari** (`guardTower`, `src/levels/searchlights.ts`): proyektor nuri yer bo'ylab supuradi. Haqiqiy SpotLight faqat 2 ta (`light: "spot"`), qolganlari ko'rinadigan nur (`beam`) — unumdorlik.
- **Harbiy yuk mashinalari** (`militaryTruck`, cargo/tanker), **chiroq ustunlari** (`lampPost`, emissive), **tikanli sim** (`barbedFence`), yonilg'i tanklari (`fuelTank`, zanjirli portlash), bochkalar.
- **Uchirish tizimi** (`interactives: launchSite`, `src/levels/launchSite.ts`, `props/{launchPad,rocket}.ts`): terminalni otish (hitTarget) / portlash yoki plita ustidan o'tish -> `idle` -> `warn` 1.5 s (sirena, qizil yer belgisi, olov) -> `flight` 3 s (iz bilan, parabolik) -> 'explosion' (R=24, zarar 85, manba — ishga tushirgan mashina) -> `cool`. Nishon: manbaga eng yaqin raqib (<=170 m, maydonchadan >=30 m), bo'lmasa tasodifiy nuqta. Cooldown 25 s (`base.json -> launch`).
- **Sandiq joylari (24)**: bunker ichida, angarlarda, perronda, uchirish maydonchasi yonida va ochiq joylarda.
- Test URL: `#play-secret_base`. Testlar: `tests/levelsBase.test.ts`.
