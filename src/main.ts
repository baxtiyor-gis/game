import * as THREE from 'three';
import { World } from './core/world';
import { vehicleDef } from './core/data';
import type { VehicleHandle } from './core/types';
import { Keyboard } from './input/keyboard';
import { Gamepad } from './input/gamepad';
import { PlayerController } from './input/playerController';
import { ChaseCamera } from './render/chaseCamera';
import { VfxSystem } from './render/vfx';
import { installRenderMode } from './render/modern';
import { installEnvironment } from './render/environment';
import { loadArena } from './levels/loader';
import type { ArenaDef } from './levels/types';
import oilFields from '../data/levels/oil_fields.json';
import { ShakeSystem } from './render/shake';
import { spawnVehicle } from './vehicles/vehicle';
import { DamageSystem } from './vehicles/damage';
import { WeaponSystem } from './weapons/weaponSystem';
import { PickupSystem } from './weapons/pickups';
import { WhammySystem } from './weapons/whammy';
import { BotController } from './ai/botController';
import { Hud } from './ui/hud';
import { AudioSystem } from './audio/audioSystem';

/** Raqiblar (mashina/profil id). */
const BOTS = ['sidburn', 'van', 'leprechaun'];

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const keyboard = new Keyboard();
  const world = await World.create({ canvas, afterFixed: () => keyboard.endTick() });
  const player = new PlayerController('p1', keyboard, new Gamepad(0));

  const env = installEnvironment(world);
  const arena = await loadArena(world, oilFields as unknown as ArenaDef);
  world.addSystem(new DamageSystem(world));
  const s0 = arena.spawns[0]!;
  const handle = spawnVehicle(world, vehicleDef('rattler'), player, s0.pos, s0.yaw);
  handle.inventory.slots.push({ weapon: 'rocket', ammo: 12 }, { weapon: 'missile', ammo: 8 });
  const spawns = arena.pickupSpawns;
  const pickups = new PickupSystem(world, spawns);
  const pickupView = spawns.map((s) => ({ pos: new THREE.Vector3(...s.pos), kind: s.kind, available: true }));
  const getPickups = () => {
    pickupView.forEach((p, i) => (p.available = pickups.isAvailable(i)));
    return pickupView;
  };
  for (const [i, id] of BOTS.entries()) {
    const sp = arena.spawns[i + 1]!;
    let self: VehicleHandle | undefined;
    const bot = new BotController(world, () => self, { profile: id, difficulty: 'normal', getPickups });
    self = spawnVehicle(world, vehicleDef(id), bot, sp.pos, sp.yaw);
    self.inventory.slots.push({ weapon: 'rocket', ammo: 12 });
  }
  const whammy = new WhammySystem(world);
  world.addSystem(new WeaponSystem(world));
  world.addSystem(pickups);
  world.addSystem(whammy);
  world.addSystem(new ChaseCamera(world.camera, { object: handle.object, rearView: () => handle.input.rearView }));
  world.addSystem(new VfxSystem(world));
  env.follow(handle.object);
  installRenderMode(world);
  world.addSystem(new ShakeSystem(world));
  world.addSystem(new AudioSystem(world, () => handle.object));
  world.addSystem(new Hud(world, document.getElementById('ui')!, () => handle, (id) => whammy.score(id)));
  // Testlar uchun (Playwright): holatni o'qish
  (window as unknown as { __game: unknown }).__game = { world, player: handle, whammy, arena };
  world.start();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${String(e)}</pre>`);
});
