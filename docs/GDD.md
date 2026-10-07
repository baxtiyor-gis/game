# GDD — compact spec (source of truth for agents)

Reference: Vigilante 8 (1998, PS1). Recreate mechanics 1:1; all assets/names original (see PLAN.md §0).
Items marked `?` are unverified — do not invent; leave TODO in data files.

## Core loop
Pick driver → arena → destroy all opponents. Unlimited machine gun + up to 3 pickup weapons + 1 vehicle special.
Health pickups (wrench). Destructible scenery hides crates. Score via kills + Whammies.

## Controls (default)
| Action | Keyboard | Gamepad |
|---|---|---|
| Accelerate / Brake-Reverse | W / S | RT / LT |
| Steer | A / D | L-stick |
| Machine gun | Space | A |
| Fire selected weapon | J | X |
| Cycle weapon | Q / E | LB / RB |
| Rear view | R | Y |
| Combo input | Arrow keys sequence (3 dirs) + Machine gun within 400 ms | D-pad + A |

## Vehicle stats (1–5 scale) → physics
accel → engine force; topSpeed → max velocity; armor → maxHP & mass; avoidance → homing-lock difficulty + steering response.
Damage states: 100–60% clean, 60–30% white smoke, 30–10% black smoke, <10% fire. 0 → explosion + wreck.

## Standard weapons (ammo per pickup `?`)
| Weapon | Behaviour |
|---|---|
| Interceptor Missiles | homing, medium dmg |
| Bull's Eye Rockets | straight, fast, salvo |
| Sky Hammer Mortar | ballistic arc, splash, flips cars |
| Bruiser Cannon | heavy direct shot, knockback |
| Roadkill Mines | dropped behind, proximity |

## Special moves (sequence + MG). Names from series; exact V8 inputs `?` — verify T0.3
| Weapon | ↑↑↓ / etc. |
|---|---|
| Missiles | Halo Decoy (↑↑↓), Afterburner (↑↑↑), Missile Swarm (↑↑→) |
| Rockets | Road Runner (↑↓↓), Stampede (↑↓↑), Bastion Rockets (↑↓→) |
| Mortar | Turtle Turnover (↓↓↓), Crater Maker (↓↓↑), Tire Buster (↓↓→) |
| Cannon | Cow Puncher (↓↑↓), Buckshot (↓↑↑), Ricochet (↓↑→) |
| Mines | Bear Hug (←→↓), Cactus Patch (←→↑), Hovering Mines (←→→) |
Specials cost extra ammo.

## Whammy
Hits from ≥2 different weapons on same target within 500 ms → Whammy x2..x6; bonus score.

## Roster
| Faction | Driver | Vehicle | Special |
|---|---|---|---|
| Vigilante | Chassey Blue | '67 Rattler | Gridlock: expanding flare grid, stalls engines |
| Vigilante | John Torque | '69 Jefferson | Bass Quake: radial shockwave |
| Vigilante | Slick Clyde | '70 Clydesdale | White Lightning: bolt, stalls engine |
| Vigilante | Sheila | '74 Strider? | 24mm Tantrum Gun: auto-turret |
| Vigilante (locked) | Convoy | '72 Moth Truck? | ? |
| Vigilante (locked) | Dave | '70 Stag Pickup? | ? |
| Coyote | Loki | '73 Glenn 4x4 | ? |
| Coyote | Houston 3 | '75 Palamino? | ? |
| Coyote | Boogie | '76 Leprechaun? | ? |
| Coyote | Beezwax | '70 Van? | ? |
| Coyote (locked) | Sid Burn | ? | ? |
| Coyote (locked) | Molo | '66 School Bus | ? |
| Secret | Y the Alien | UFO | ? |

## Arenas
Oil Fields (explosive tanks), Valley Farms (train — shoot cars for weapons), Aircraft Graveyard (planes, cranes w/ weights, hangars),
Secret Base / Area 51 (launchable aircraft), Hoover Dam, Ski Resort (low grip), Casino City, Canyonlands, Ghost Town, Super Dreamland 64 (bonus).
Each: ~300×300 m, walls/edges, 15–30 crate spawns, 1–3 interactive set pieces. Layouts in `docs/levels/*.md`.

## Modes
Quest (per-driver mission chain with objectives: destroy / protect / collect; opponents 1→N; unlocks), Arcade, Survival, 2P Versus, 2P Co-op (split-screen).

## Visual / audio
PS1 look: 320×240 internal RT, vertex snapping, affine UVs, 64–128px textures, distance fog, dithering. 1970s funk music, positional SFX, engine pitch ∝ RPM.

## Perf budget
60 FPS mid laptop; ≤ 8 vehicles; ≤ 300 projectiles pooled; draw calls < 300; initial download < 30 MB.
