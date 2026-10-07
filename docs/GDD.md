# GDD — qisqa spetsifikatsiya (agentlar uchun asosiy manba)

Namuna: Vigilante 8 (1998, PS1). Mexanika 1:1 takrorlanadi; barcha assetlar va nomlar original bo'ladi (PLAN.md §0).
`?` bilan belgilanganlar tasdiqlanmagan — o'ylab topmang, data fayllarida TODO qoldiring.

## Asosiy sikl
Haydovchini tanlash → arena → barcha raqiblarni yo'q qilish. Cheksiz pulemyot + 3 tagacha topilgan qurol + mashinaning 1 ta maxsus quroli.
Sog'liq tiklash (kalit/wrench). Buziladigan binolar ichida qurol sandiqlari bor. Ochko: o'ldirishlar + Whammy.

## Boshqaruv (standart)
| Harakat | Klaviatura | Gamepad |
|---|---|---|
| Gaz / Tormoz-orqaga | W / S | RT / LT |
| Burilish | A / D | Chap stik |
| Pulemyot | Space | A |
| Tanlangan qurolni otish | J | X |
| Qurolni almashtirish | Q / E | LB / RB |
| Orqaga qarash | R | Y |
| Kombo | Strelkalar ketma-ketligi (3 yo'nalish) + 400 ms ichida pulemyot | D-pad + A |

## Mashina statlari (1–5 shkala) → fizika
Tezlanish → dvigatel kuchi; Maks. tezlik → tezlik chegarasi; Zirh → maks. HP va massa; Chetlab o'tish → raketa nishonga olishi qiyinligi + rul sezgirligi.
Shikast bosqichlari: 100–60% toza, 60–30% oq tutun, 30–10% qora tutun, <10% olov. 0 → portlash + mashina qoldig'i.

## Standart qurollar (bir sandiqdagi o'q soni `?`)
| Qurol | Xatti-harakati |
|---|---|
| Interceptor Missiles | nishonni quvadi, o'rtacha zarar |
| Bull's Eye Rockets | to'g'ri, tez, ketma-ket |
| Sky Hammer Mortar | ballistik yoy, sachratib zarar, mashinani ag'daradi |
| Bruiser Cannon | og'ir to'g'ri o'q, orqaga itaradi |
| Roadkill Mines | orqaga tashlanadi, yaqinlashganda portlaydi |

## Maxsus harakatlar (ketma-ketlik + pulemyot). Nomlar seriyadan; V8 dagi aniq tugmalar `?` — T0.3 da tekshiriladi
| Qurol | Harakatlar |
|---|---|
| Raketalar (Missiles) | Halo Decoy (↑↑↓), Afterburner (↑↑↑), Missile Swarm (↑↑→) |
| Rockets | Road Runner (↑↓↓), Stampede (↑↓↑), Bastion Rockets (↑↓→) |
| Mortira | Turtle Turnover (↓↓↓), Crater Maker (↓↓↑), Tire Buster (↓↓→) |
| To'p (Cannon) | Cow Puncher (↓↑↓), Buckshot (↓↑↑), Ricochet (↓↑→) |
| Minalar | Bear Hug (←→↓), Cactus Patch (←→↑), Hovering Mines (←→→) |
Maxsus harakatlar ko'proq o'q sarflaydi.

## Whammy
Bitta nishonga 500 ms ichida ≥2 xil quroldan tegsa → Whammy x2..x6; qo'shimcha ochko.

## Personajlar
| Fraksiya | Haydovchi | Mashina | Maxsus qurol |
|---|---|---|---|
| Vigilante | Chassey Blue | '67 Rattler | Gridlock: kengayuvchi flare to'ri, dvigatellarni o'chiradi |
| Vigilante | John Torque | '69 Jefferson | Bass Quake: atrofga zilzila to'lqini |
| Vigilante | Slick Clyde | '70 Clydesdale | White Lightning: chaqmoq, dvigatelni o'chiradi |
| Vigilante | Sheila | '74 Strider? | 24mm Tantrum Gun: avtomatik turret |
| Vigilante (yopiq) | Convoy | '72 Moth Truck? | ? |
| Vigilante (yopiq) | Dave | '70 Stag Pickup? | ? |
| Coyote | Loki | '73 Glenn 4x4 | ? |
| Coyote | Houston 3 | '75 Palamino? | ? |
| Coyote | Boogie | '76 Leprechaun? | ? |
| Coyote | Beezwax | '70 Van? | ? |
| Coyote (yopiq) | Sid Burn | ? | ? |
| Coyote (yopiq) | Molo | '66 School Bus | ? |
| Yashirin | Y the Alien | NUJ (UFO) | ? |

## Arenalar
Oil Fields (portlovchi rezervuarlar), Valley Farms (poyezd — vagonni otsang qurol tushadi), Aircraft Graveyard (samolyotlar, yuk osilgan kranlar, angarlar),
Secret Base / Area 51 (uchiriladigan samolyotlar), Hoover Dam, Ski Resort (sirpanchiq), Casino City, Canyonlands, Ghost Town, Super Dreamland 64 (bonus).
Har biri: ~300×300 m, chegaralar, 15–30 sandiq joyi, 1–3 interaktiv obyekt. Xarita sxemalari `docs/levels/*.md` da.

## Rejimlar
Quest (har haydovchiga missiyalar zanjiri: yo'q qilish / himoya qilish / yig'ish; raqiblar 1→N; personaj ochiladi), Arcade, Survival, 2 o'yinchi Versus, 2 o'yinchi Co-op (ekran ikkiga bo'linadi).

## Vizual / audio
PS1 ko'rinishi: 320×240 ichki render, vertex snapping, affine UV, 64–128px teksturalar, uzoqlikda tuman, dithering. 1970-yillar funk musiqasi, pozitsion ovoz effektlari, dvigatel ovozi aylanishlarga bog'liq.

## Unumdorlik chegaralari
O'rta noutbukda 60 FPS; ≤ 8 mashina; ≤ 300 snaryad (pool); draw call < 300; birinchi yuklanish < 30 MB.
