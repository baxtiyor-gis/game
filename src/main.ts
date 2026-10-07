import * as THREE from 'three';
import { World } from './core/world';
import { vehicleDef } from './core/data';
import { CG } from './core/types';
import type { PickupKind, VehicleHandle } from './core/types';
import { Keyboard } from './input/keyboard';
import { Gamepad } from './input/gamepad';
import { PlayerController } from './input/playerController';
import { ChaseCamera } from './render/chaseCamera';
import { VfxSystem } from './render/vfx';
import { installRenderMode } from './render/modern';
import { installEnvironment } from './render/environment';
import { makeGroundMaterial } from './render/materials';
import { ShakeSystem } from './render/shake';
import { spawnVehicle } from './vehicles/vehicle';
import { DamageSystem } from './vehicles/damage';
import { WeaponSystem } from './weapons/weaponSystem';
import { PickupSystem, type PickupSpawn } from './weapons/pickups';
import { WhammySystem } from './weapons/whammy';
import { BotController } from './ai/botController';
import { Hud } from './ui/hud';

const WORLD_GROUPS = (CG.WORLD << 16) | 0xffff;

/** Sinov sahnasi: statik kollayder + mesh juftligi. */
function addBlock(world: World, size: [number, number, number], pos: [number, number, number], pitch: number, color: string): void {
  const { scene, physics, rapier } = world;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, 0));
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  mesh.position.set(...pos);
  mesh.quaternion.copy(q);
  scene.add(mesh);
  const desc = rapier.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2)
    .setTranslation(...pos)
    .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    .setCollisionGroups(WORLD_GROUPS);
  physics.createCollider(desc);
}

/** Rampa: yuqori qirrasi yerdan `rise` metr balandlikda, pastki qirrasi z0 da. */
function addRamp(world: World, x: number, z0: number, length: number, rise: number, color: string): void {
  const angle = Math.atan2(rise, length);
  const run = Math.hypot(length, rise);
  const thick = 0.5;
  const cy = rise / 2 - (thick / 2) * Math.cos(angle);
  const cz = z0 + length / 2 + (thick / 2) * Math.sin(angle);
  addBlock(world, [9, thick, run], [x, cy, cz], -angle, color);
}

function buildScene(world: World): void {
  const { scene, physics, rapier } = world;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), makeGroundMaterial(400));
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  physics.createCollider(rapier.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0).setCollisionGroups(WORLD_GROUPS));

  // Arena chegarasi: 4 ta devor (maydon 400x400 m)
  for (const [w, d, x, z] of [[400, 2, 0, 199], [400, 2, 0, -199], [2, 400, 199, 0], [2, 400, -199, 0]] as const) {
    addBlock(world, [w, 6, d], [x, 3, z], 0, '#7a5a3c');
  }
  addRamp(world, 0, 45, 16, 4.5, '#8a8f98');
  addRamp(world, -22, 40, 12, 3, '#8a8f98');
  addRamp(world, 24, 70, 18, 5.5, '#8a8f98');
  addBlock(world, [3, 2, 3], [-8, 1, 20], 0, '#6e6a60');
  addBlock(world, [3, 2, 3], [9, 1, 28], 0, '#6e6a60');
  addBlock(world, [14, 1.5, 1.2], [0, 0.75, -20], 0, '#a05a3a');
  addBlock(world, [1.2, 1.5, 14], [-14, 0.75, 4], 0, '#a05a3a');
}

/** Sinov: 10 ta sandiq joyi (5 qurol, 2 health, 1 special, 2 qo'shimcha qurol). */
const TEST_PICKUPS: Array<[number, number, PickupKind]> = [
  [4, 0, 'rocket'], [-4, 8, 'missile'], [6, 14, 'cannon'], [-6, 22, 'mortar'], [0, 30, 'mine'],
  [-12, 34, 'health'], [14, 38, 'health'], [8, -8, 'special'], [-10, -8, 'rocket'], [18, 10, 'missile'],
];

/** Sinov raqiblari: [mashina/profil, x, z]. */
const TEST_BOTS: Array<[string, number, number]> = [['sidburn', 25, 60], ['van', -30, 70]];

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const keyboard = new Keyboard();
  const world = await World.create({ canvas, afterFixed: () => keyboard.endTick() });
  const player = new PlayerController('p1', keyboard, new Gamepad(0));

  const env = installEnvironment(world);
  buildScene(world);
  world.addSystem(new DamageSystem(world));
  const handle = spawnVehicle(world, vehicleDef('rattler'), player, { x: 0, y: 1, z: 0 }, 0);
  handle.inventory.slots.push({ weapon: 'rocket', ammo: 12 }, { weapon: 'missile', ammo: 8 });
  const spawns: PickupSpawn[] = TEST_PICKUPS.map(([x, z, kind]) => ({ pos: [x, 0, z], kind }));
  const pickups = new PickupSystem(world, spawns);
  const pickupView = spawns.map((s) => ({ pos: new THREE.Vector3(...s.pos), kind: s.kind, available: true }));
  const getPickups = () => {
    pickupView.forEach((p, i) => (p.available = pickups.isAvailable(i)));
    return pickupView;
  };
  for (const [id, x, z] of TEST_BOTS) {
    let self: VehicleHandle | undefined;
    const bot = new BotController(world, () => self, { profile: id, difficulty: 'normal', getPickups });
    self = spawnVehicle(world, vehicleDef(id), bot, { x, y: 1, z }, Math.PI);
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
  world.addSystem(new Hud(world, document.getElementById('ui')!, () => handle, (id) => whammy.score(id)));
  // Testlar uchun (Playwright): holatni o'qish
  (window as unknown as { __game: unknown }).__game = { world, player: handle, whammy };
  world.start();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${String(e)}</pre>`);
});
