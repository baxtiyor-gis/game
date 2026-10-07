import * as THREE from 'three';
import { World } from './core/world';
import { vehicleDef } from './core/data';
import { CG } from './core/types';
import type { Controller, PickupKind } from './core/types';
import { Keyboard } from './input/keyboard';
import { Gamepad } from './input/gamepad';
import { PlayerController, emptyInput } from './input/playerController';
import { ChaseCamera } from './render/chaseCamera';
import { installPS1 } from './render/ps1';
import { VfxSystem } from './render/vfx';
import { ShakeSystem } from './render/shake';
import { spawnVehicle } from './vehicles/vehicle';
import { DamageSystem } from './vehicles/damage';
import { WeaponSystem } from './weapons/weaponSystem';
import { PickupSystem, type PickupSpawn } from './weapons/pickups';

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
  scene.background = new THREE.Color('#d9a066');
  scene.fog = new THREE.Fog('#d9a066', 60, 260);
  scene.add(new THREE.HemisphereLight('#fff3d6', '#6b4a2b', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(50, 80, 30);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#b5835a' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  physics.createCollider(rapier.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0).setCollisionGroups(WORLD_GROUPS));

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

/** Harakatsiz nishon mashinalar uchun controller. */
const idleController = (id: string): Controller => ({ id, sample: () => emptyInput() });

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const keyboard = new Keyboard();
  const world = await World.create({ canvas, afterFixed: () => keyboard.endTick() });
  const player = new PlayerController('p1', keyboard, new Gamepad(0));

  buildScene(world);
  world.addSystem(new DamageSystem(world));
  const handle = spawnVehicle(world, vehicleDef('rattler'), player, { x: 0, y: 1, z: 0 }, 0);
  handle.inventory.slots.push({ weapon: 'rocket', ammo: 12 }, { weapon: 'missile', ammo: 8 });
  spawnVehicle(world, vehicleDef('jefferson'), idleController('dummy1'), { x: 3, y: 1, z: 22 }, Math.PI);
  spawnVehicle(world, vehicleDef('van'), idleController('dummy2'), { x: -4, y: 1, z: 34 }, Math.PI);
  const spawns: PickupSpawn[] = TEST_PICKUPS.map(([x, z, kind]) => ({ pos: [x, 0, z], kind }));
  world.addSystem(new WeaponSystem(world));
  world.addSystem(new PickupSystem(world, spawns));
  world.addSystem(new ChaseCamera(world.camera, { object: handle.object, rearView: () => handle.input.rearView }));
  world.addSystem(new VfxSystem(world));
  world.addSystem(new ShakeSystem(world));
  installPS1(world);
  world.start();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${String(e)}</pre>`);
});
