# Valley Farms (Kaliforniya fermer vodiysi)

Fayl: `data/levels/valley_farms.json`. 400x400 m, markaz (0,0), +x o'ngga, +z pastga. Asosiy xususiyat: arenani kesib o'tuvchi temir yo'l va POYEZD.

```
 z=-200 +--------------------------------------------------------------+
        |  H            Barn1+silo(-110,-100)  WT(-20,-130) WT(78,-122) |
        |  pasture(-140,-135)  WM(-62,-122)  corn(-62,-52) Barn2(110,-105)
        |  FH(-142,-72) wheat(-122,-50)   WM(20,-75) wheat(60,-62)  WM(140,-50)
 z=0    |==rels============================\_____________ /=========== |
        |  (-240,-14)  -> (-70,-8) -> (0,8) -> (70,16) -> (240,-6)  (poyezd ->)
        |  WM(-100,40)  corn(-22,68)  plowed(32,78)  wheat(98,70)       |
        |  Barn3(-155,60)  FH(-132,82)                                 |
        |~~~~~~~~~~~~ ariq (z~108, chuqurligi ~2 m) ~~[ko'prik x=40]~~~|
 z=+200 +--------------------------------------------------------------+
  H = yumshoq tepalik, WT = suv minorasi, WM = shamol tegirmoni, FH = ferma uyi.
  Spawn: 8 nuqta, R=150 aylanada, markazga qaragan (rels koridoridan >=40 m).
```

- **Poyezd** (`train` bloki, `src/levels/train.ts`): lokomotiv + 5 vagon (box/tank/flat/hopper/tank), 17 m/s, Catmull-Rom iz arena chetidan chetigacha (chegaradan tashqarida paydo bo'ladi/yo'qoladi). Kinematik Rapier jismlari; izdan chiqqach 8 s dan keyin yangi tsikl (vagonlar tiklanadi). Boshlanganda iz uzunligining 40% ida (kadrda).
- **Vagon HP** (45): `explosion` (vagon qutisigacha masofa) va `damage` (`targetId: wagon-N`) dan shikastlanadi; MG vagonga tegmaydi (faqat snaryad portlashi). HP 0 -> vayrona + o'z portlashi (R=9, 18) + 1-2 sandiq iz yoniga (`onDrop` -> `PickupSystem.drop`). Lokomotiv yo'q qilinmaydi.
- **Mashinaga urish**: vagon qutisi (+0.7 m) ichida bo'lsa `damage` (weapon `train`, 35) + yon/oldinga impuls, 1 s sovutish.
- **Ferma**: 3 ombor, 4 silos, 3 ferma uyi, 2 suv minorasi, 4 shamol tegirmoni (interaktiv, aylanadi), 6 dala (makkajo'xori/bug'doy/haydalgan, mashina ustidan o'tadi), ~75 daraxt (InstancedMesh), yog'och to'siqlar, ko'prik (ariq ustida), ariq (relyefdagi chuqurlik + suv lentasi).
- **Bochkalar (16)** — omborlar/uylar yonida to'plangan portlovchi yoqilg'i.
- **Sandiq joylari (20)** + poyezddan tushadiganlari.
- Parametrlar: `data/levels/props.json` ("farm" bo'limi), `data/levels/train.json` (o'lchamlar, zarar, drop).
- Test URL: `#play-valley_farms`.
