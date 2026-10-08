# Ski Resort (Kolorado tog'lari)

Fayl: `data/levels/ski_resort.json` (+ konstantalar `data/levels/ski.json`). 400x400 m, markaz (0,0), +x o'ngga (sharq), +z pastga (janub). Qishki kun: kulrang-moviy osmon (`#7f9bb9` -> `#d3dde7`), oq tuman (90..430 m), sovuq quyosh (1.8), qor yog'adi (`snowfall`). Yer — qor: `terrain.tint = #dfe8f0` + `tintAbsolute: true` (tint yer teksturasi rangiga bo'linadi, shu rang aynan chiqadi).

## Yuqoridan (reja)

```
 z=-200 ^^^^^^^^ shimoliy tog' tizmasi (55-60 m) ^^^^^^^^
        |   [boshqa tepaliklar]       LIFT TOP (152,-112, y~30)  <- yuqori stansiya
        |      cabin  cabin           |   ^ kabinalar (8 ta) yuqoriga (x=+2.5) va pastga (x=-2.5)
 z=-62  |  cabin    [LODGE 26x13]     P4 P3   P = ustunlar (liftPylon, 5 ta, 11 m)
        |   cabin (propan x3)        P2  P1
        |  cabin                  cabin   ...  cabin(92,62)
 z=+55  |      ~~~~~~~ ICE LAKE ~~~~~~      LIFT BOTTOM (150,55)
        |    (-85,66) r=40, grip 0.25
 z=+120 |           [JUMP 2 (-30,150) ->]       [JUMP 1 (60,120) ^ shimol]
 z=+195 |                                     run-up (60,195..120), qor uyumlari yo'lak bo'ylab
```
Halqa yo'l (qor, grip 0.7, eni 11 m) vodiyni aylanib o'tadi; lojaga qisqa tarmoq (15,-95..-50).

## Relyef
- Atrofda tog'lar (hills), markaz vodiysi deyarli tekis (|nishab| < 0.05 — spawnlar shu yerda). Sharqda "chang'i tepaligi" (150,-85, 26 m): kanat yo'li shu bo'ylab ko'tariladi (pastdan ~0.6 m, yuqorida ~30 m).
- Tekis maydonlar (`flats`): ko'l (y=0.8, r=44), loja maydoni, tramplin yo'laklari (kapsula), ikki stansiya.

## Sirt zonalari (`surfaces`, `src/levels/surfaces.ts`)
- `ice` doira (-85,66) r=40: `ski.json -> grip.ice = 0.25`; `snow` yo'llar: `grip.snow = 0.7`; qolgan joy 1. Eng past qiymat qo'llanadi.
- Mexanizm: `SurfaceSystem` har tick `VehicleHandle.surfaceGrip` (core/types.ts, ixtiyoriy maydon) ni yozadi; `vehicle.ts` g'ildirak `frictionSlip` ni shunga ko'paytiradi (tormoz, tezlanish va yon ishqalanish birga kamayadi). Botlar ham shu orqali sirpanadi.
- Vizual: muz — yaltiroq ko'k doira (`surfaceMesh.ts`), yo'l — relyefga yotqizilgan och lenta.

## Kanat yo'li (`skiLift.ts`, `liftRoute.ts`)
- `skiLift: {bottom, top, cabins}`; ustunlar — `destructibles` dagi `liftPylon` lar (chiziq bo'ylab, yaw = ko'ndalang). Ikki parallel arqon (gap 5 m): yuqoriga va pastga; yopiq halqa, kabinalar `speed` 3.8 m/s da aylanadi (kinematik kollayder, hp 14).
- Kabinani otsangiz (hitTarget / 'damage' / yaqin portlash) yoki ustun portlasa (`liftPylon-N` manbali 'explosion', 45 m ichidagi kabinalar): kabina yiqiladi (g=14 m/s2, aylanib), tushish paytida va yerga urilganda tagidagi mashinaga 'damage' (`weapon: 'lift'`, 30) + impuls + 'shake'; 14 s to'siq bo'lib yotadi, so'ng bo'sh joy bo'lsa pastki stansiyada qayta tiklanadi.

## Boshqa tizimlar va proplar
- **Tramplin** (`skiJump`, `props/skiJump.ts`): qiya plita 18 m uzun, 4.5 m baland (~14 daraja), uchida tik devor; kollayder — qiya kuboid. 2 ta (katta (60,120) shimolga, kichik (-30,150) sharqqa).
- **Propan tanklari** (`destructibles.json -> propaneTank`): HP 10, portlash R=14 zarar 48; 12 ta (loja yonida 3, kabinalar oldida, stansiya yonida; ba'zilaridan sandiq).
- **Qor yog'ishi** (`snowfall.ts`): bitta `Points` (<=1500, hozir 1200), kamera atrofidagi 80x45x80 quti, shamolda og'adi, ShaderMaterial (yumaloq nuqta).
- **Archalar** (`pineTree`, 3 InstancedMesh: tana, toj, qor qalpoqchalari) ~280; **uylar** (`lodge`, `cabin`: yog'och, qorli tom, yoritilgan deraza); **qor uyumlari** (`snowBank`, InstancedMesh, kollayderli).
- **Spawn (8)**: vodiy markazida, >=15 m oraliq, qiyalik < 0.05, muz/yo'l/proplardan uzoq. **Sandiqlar (24)**: tekis joylar, 7 tur.
- Test URL: `#play-ski_resort`. Testlar: `tests/levelsSki.test.ts` (+ `ARENA=ski_resort node tests/e2e/combat.mjs`).
