# Aircraft Graveyard (Arizona aviatsiya qabristoni)

Fayl: `data/levels/aircraft_graveyard.json`. 400x400 m, markaz (0,0), +x o'ngga, +z pastga. Quruq cho'l: och moviy-oq osmon, oqish-qumrang tuman, kuchli quyosh (3.3). Asosiy xususiyat: YUK OSILGAN KRANLAR va yo'lakdagi samolyotlar.

```
 z=-200 +--------------------------------------------------------------+
        | H           [fence] fuel depot: FT x6 (100..126,-122/-106) +gate |
        |   HangarA(-100,-105) HangarB(-50,-105)        C3(112,-78)    |
        |   [apron -130..-20]            Tower(35,-72)                 |
 z=-32  |=========================== RUNWAY (z -32..12) ================|
        |   09   ->  samolyot A (z=-12, sharqqa)   <- samolyot B (z=4)   27
 z=12   |=========================================================== |
        |        C1(-20,25)                 C2(110,20)                 |
 z=55   |  B   T   F   A   B   L        1-qator (bomber/transport/...)|
        |                 C4(0,80)  (E-W yo'lak, 1 va 2 qator orasi)  |
 z=105  |  A   T   B   F  F   T   L     2-qator                       |
 z=155  |  B   L   A   T   B   A        3-qator                       |
 z=+200 +--------------------------------------------------------------+
  H = sayoz tepalik (2-4 m), FT = yoqilg'i tanki, C1..C4 = portal kranlar,
  T/B/F/A/L = transport/bomber/fighter/airliner/lightProp (ba'zilari buzilgan).
  Spawn: 8 nuqta (tekis joylar, yo'lakdan >=25 m, samolyotlardan >=18 m).
```

- **Samolyotlar** (`props/airplane.ts`, `type: "airplane"`, `variant` = bomber/transport/fighter/airliner/lightProp, `damage` = wingless/tailless/split/noEngines/belly, `scheme` = bo'yoq): procedural fyuzelyaj + trapetsiya qanot + dum + dvigatel + shassi. Statik to'siq (fyuzelyaj va qanot qutilari; baland qanot tagidan mashina o'tadi). Parametrlar: `data/levels/props.json` -> `air.planes`.
- **Angar** (`hangar`): kamar tom, 3 devor, old tomon (+z) ochiq — ichiga kirish mumkin; ichida sandiq uyumlari va 4 ta qurol sandig'i.
- **Nazorat minorasi** (`controlTower`), **yo'lak/perron/taksi yo'li** (`runway`, variant runway/apron/taxiway; belgilar va raqamlar relyefga yopishgan decal), **tikanli sim** (`barbedFence`, InstancedMesh + yupqa kollayder).
- **Kranlar** (`interactives: crane`, `src/levels/crane.ts`, `data/levels/crane.json`): portal kran, yuk (container/engine) kinematik jism. Tsikl: `idle` -> tagida mashina (yuk +2.4 m) -> `warn` 0.6 s (yuk tebranadi) -> `fall` (tezlanib) -> zarba: `damage` weapon `crane` (50) + impuls + `shake` -> `hold` 1.4 s (yuk to'siq) -> `rise` 3 m/s -> `cool` 2 s. Bonus: yukni otib uzish (hp 40; MG 0.2x) — yuk tushib qoladi, kran o'chadi, sandiq tushadi.
- **Yo'lakdagi samolyotlar** (`planes` bloki, `src/levels/planes.ts`, `data/levels/planes.json`): transport (z=-12, sharqqa, 32 m/s) va fighter (z=4, g'arbga, 42 m/s); sekin tezlanadi, `liftAt` dan keyin ko'tariladi; arena chetidan chetigacha, `interval` s kutib takrorlanadi. Kinematik; qutiga tegsa `damage` weapon `plane` (45) + impuls, 1.5 s sovutish.
- **Yoqilg'i tanklari** (`destructibles.json` -> `fuelTank`: hp 20, portlash R=16 / 60, fitil 0.3 s): zanjir bo'lib portlaydi; 2 tasidan va 2 yakka tankdan sandiq (`drop`). Bochkalar (12) ham bor.
- **Sandiq joylari (20)**: angarlarda, perronda, kran yuklari tagida (xavf/mukofot), yo'lak markazida, qatorlar orasida.
- Test URL: `#play-aircraft_graveyard`. Testlar: `tests/levelsGraveyard.test.ts`.
