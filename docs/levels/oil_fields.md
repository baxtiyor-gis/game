# Oil Fields (Texas neft koni)

Fayl: `data/levels/oil_fields.json`. 400x400 m, markaz (0,0), +x o'ngga, +z pastga (sxemada). Yumshoq tepaliklar (H = tepalik, balandligi 6.5–9 m).

```
 z=-200 +--------------------------------------------------------------+
        |  H(-120,-110)         ^c(10,-155)        H(115,-125)        |
        |   P P(-80,-70)  ====pipe====  P(40,-92)     P(78,-70)         |
        |      P(-50,-88)      T1  T2  T3 (zanjir)   B(52,-30) ombor    |
        |                      (-12,-30)(0,-36)(12,-30)                 |
        |    ~~~~~~ quvur ko'prigi (lift 3.6 m, ostidan o'tiladi) ~~~~~ |
 z=0    |  T6(-90,20)         (0,0) kichik tepa        P(104,28)        |
        |      B(-52,42) ofis                          T4 T5 (70,60)    |
        |   P(-105,62)   ~quvur~   B(20,84) boshqaruv   (80,64)  H(130,105)
        |      P(-70,100)                        P(58,112)             |
        |  H(-130,125)      S(-12,118) yoqilg'i shoxobchasi             |
 z=+200 +--------------------------------------------------------------+
  Spawn: 8 nuqta, R=150 aylanada (22.5° + 45°·k), markazga qaragan.
```

- **Pumpjack (8)** — animatsiyali (`PumpjackSystem`), to'siq kollayderli. `interactives` ro'yxatida.
- **Sferik rezervuarlar (6)** — destructible `tank` (HP 30, portlash R=18 m, 60 zarar). T1–T3 orasi ~13 m: chetkilari portlasa o'rtadagisini zanjirda yo'q qiladi; T4–T5 juftlik (10.8 m) zanjir; T6 yakka. Har biri o'lganda `drop` sandig'i (missile/special/mortar/health/cannon/rocket) `onDrop` orqali chiqadi.
- **Bochkalar (28)** — destructible `barrel` (HP 6, kichik portlash R=5 m), InstancedMesh; yoqilg'i shoxobchasi, bino va rezervuarlar yonida to'plangan.
- **Binolar (3)**, **yoqilg'i shoxobchasi (1)**, **quvurlar (7)**: ikkitasi ko'tarilgan (lift 3.6 m), qolganlari yerda; **qoyalar (12)** + chegarada 64 ta instansli qoya.
- **Sandiq joylari (20)**: 15 qurol (missile 4, rocket 4, mortar 3, cannon 2, mine 2), 3 health, 2 special; `pos` = [x, yerdan offset, z].
- Chegara: 4 ta ko'rinmas devor (kollayder), oldida qoya halqasi.
- Parametrlar: `data/levels/props.json` (ranglar, nasos), `data/levels/destructibles.json` (HP, portlash, zanjir limiti).
