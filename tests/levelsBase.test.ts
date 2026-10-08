import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { findHitTarget } from '../src/core/hitTargets';
import { loadArena } from '../src/levels/loader';
import type { Arena, ArenaDef } from '../src/levels/types';
import { CG } from '../src/core/types';
import type { GameEvents, GameWorld, System, VehicleHandle } from '../src/core/types';
import secretBase from '../data/levels/secret_base.json';
import base from '../data/levels/base.json';
import { arenaDef } from '../src/levels/registry';
import { LaunchSystem } from '../src/levels/launchSite';
import { RadarSystem } from '../src/levels/radar';
import { SearchlightSystem } from '../src/levels/searchlights';

const DT = 1 / 60;
const def = secretBase as unknown as ArenaDef;
const L = base.launch;
const B = base.bunker;

class FakeWorld {
  readonly rapier = RAPIER;
  readonly physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly renderer = {} as THREE.WebGLRenderer;
  readonly events = new EventBus<GameEvents>();
  readonly vehicles: VehicleHandle[] = [];
  time = 0;
  systems: System[] = [];
  constructor() {
    this.physics.timestep = DT;
  }
  addSystem(s: System): void {
    this.systems.push(s);
  }
  removeSystem(s: System): void {
    this.systems = this.systems.filter((x) => x !== s);
    s.dispose?.();
  }
  step(n: number): void {
    for (let i = 0; i < n; i++) {
      for (const s of [...this.systems]) s.fixedUpdate?.(DT);
      this.physics.step();
      this.time += DT;
    }
  }
}

async function load(): Promise<{ world: FakeWorld; arena: Arena }> {
  const world = new FakeWorld();
  const arena = await loadArena(world as unknown as GameWorld, def);
  world.step(1);
  return { world, arena };
}

function addVehicle(world: FakeWorld, id: string, x: number, y: number, z: number): VehicleHandle {
  const body = world.physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z));
  world.physics.createCollider(RAPIER.ColliderDesc.cuboid(1, 0.5, 2).setDensity(1).setCollisionGroups((CG.VEHICLE << 16) | 0xffff), body);
  const v = {
    id, alive: true, def: { mass: 1000 }, body,
    position: (o: THREE.Vector3) => o.set(body.translation().x, body.translation().y, body.translation().z),
  } as unknown as VehicleHandle;
  world.vehicles.push(v);
  return v;
}

const sys = <T>(w: FakeWorld, name: string): T => w.systems.find((s) => s.name === name) as unknown as T;
const bunker = def.props.find((p) => p.type === 'bunker')!;

beforeAll(async () => {
  await RAPIER.init();
});

describe('secret_base arenasi', () => {
  it('registry da mavjud va yuklanadi: spawnlar terrain ustida, >=15 m oraliqda, proplardan uzoq', async () => {
    expect(arenaDef('secret_base').id).toBe('secret_base');
    const { world, arena } = await load();
    expect(arena.spawns).toHaveLength(8);
    expect(arena.pickupSpawns.length).toBeGreaterThanOrEqual(20);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    for (const t of ['hangar', 'controlTower', 'guardTower', 'bunker', 'militaryTruck', 'ufoWreck', 'runway', 'barbedFence']) expect(def.props.some((p) => p.type === t)).toBe(true);
    expect(def.interactives.map((i) => i.type).sort()).toEqual(['launchSite', 'radar', 'radar']);
    const solid = def.props.filter((p) => ['hangar', 'controlTower', 'guardTower', 'bunker', 'militaryTruck', 'ufoWreck'].includes(p.type)).map((p) => p.pos);
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      for (const [x, z] of solid) expect(Math.hypot(s.pos.x - x, s.pos.z - z)).toBeGreaterThan(15);
      for (const i2 of def.interactives) expect(Math.hypot(s.pos.x - i2.pos[0], s.pos.z - i2.pos[1])).toBeGreaterThan(20);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
    });
    // Tunda: qorong'i osmon, sovuq tuman; haqiqiy SpotLight lar kam (unumdorlik)
    expect(def.environment?.sun?.intensity).toBeLessThan(1.5);
    let spots = 0;
    world.scene.traverse((o) => (o as THREE.SpotLight).isSpotLight && spots++);
    expect(spots).toBeGreaterThanOrEqual(1);
    expect(spots).toBeLessThanOrEqual(3);
    expect(sys<SearchlightSystem>(world, 'searchlights').rigs).toHaveLength(def.props.filter((p) => p.light).length);
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.physics.bodies.len()).toBe(0);
  });

  it('bunker pandusi qiyaligi mashina o\'ta oladigan, ichida sandiqlar; devorlar chuqurchani o\'rab turadi', async () => {
    const { world, arena } = await load();
    const [bx, bz] = bunker.pos;
    const h = (lx: number): number => arena.heightAt(bx + lx, bz);
    const floor = h(0);
    expect(floor).toBeLessThan(-3.5);
    let maxSlope = 0;
    for (let x = B.pitFront; x < B.rampEnd; x += 1) maxSlope = Math.max(maxSlope, Math.abs(h(x + 1) - h(x)));
    expect(maxSlope).toBeLessThan(0.3); // < ~17 daraja
    expect(h(B.rampEnd + 4)).toBeGreaterThan(-0.6);
    // Kollayder relyef bilan mos: nur pandus ustiga tushadi
    for (const x of [14, 22, 30]) {
      const hit = world.physics.castRay(new RAPIER.Ray({ x: bx + x, y: 50, z: bz }, { x: 0, y: -1, z: 0 }), 100, true)!;
      expect(50 - hit.timeOfImpact).toBeCloseTo(h(x), 1);
    }
    // Mashina (dinamik quti) tepadan pastga yuradi va devorlarga tiqilmaydi
    const car = addVehicle(world, 'c', bx + B.rampEnd - 2, h(B.rampEnd - 2) + 1.2, bz);
    for (let i = 0; i < 60 * 8; i++) {
      car.body.setLinvel({ x: -6, y: car.body.linvel().y, z: 0 }, true); // dvigatel o'rnida: doimiy tezlik
      world.step(1);
    }
    expect(car.body.translation().x).toBeLessThan(bx + B.pitFront);
    expect(car.body.translation().y).toBeLessThan(floor + 2);
    // Chuqurcha yon devori: ichkaridan yon tomonga otilgan nur devorga uriladi
    for (const dir of [1, -1]) {
      const hit = world.physics.castRay(new RAPIER.Ray({ x: bx - 5, y: floor + 1.5, z: bz }, { x: 0, y: 0, z: dir }), 40, true)!;
      expect(hit.timeOfImpact).toBeLessThan(B.pitHalfW + 1);
    }
    const inside = arena.pickupSpawns.filter((p) => p.pos[0] > bx + B.pitBack && p.pos[0] < bx + B.pitFront && Math.abs(p.pos[2] - bz) < B.pitHalfW);
    expect(inside.length).toBeGreaterThanOrEqual(4);
    for (const p of inside) expect(p.pos[1]).toBeLessThan(floor + 1);
    arena.dispose();
  });

  it('radar antennasi aylanadi', async () => {
    const { world, arena } = await load();
    const radars = sys<RadarSystem>(world, 'radars');
    expect(radars.rigs).toHaveLength(2);
    const r = radars.rigs[0]!;
    const a0 = r.angle;
    world.step(60);
    expect(r.angle - a0).toBeCloseTo(r.speed, 2);
    radars.update(DT, 1);
    expect(r.rotor.rotation.y).toBeCloseTo(r.angle, 5);
    expect(radars.rigs[1]!.speed).not.toBe(r.speed);
    arena.dispose();
  });

  it('terminal otilganda ogohlantirish, raketa uchadi, portlash manbasi — ishga tushirgan mashina; cooldown ishlaydi', async () => {
    const { world, arena } = await load();
    const launch = sys<LaunchSystem>(world, 'launch');
    const rig = launch.rigs[0]!;
    const boom: Array<GameEvents['explosion']> = [];
    const fires: string[] = [];
    world.events.on('explosion', (e) => boom.push(e));
    world.events.on('fire', (e) => fires.push(e.weapon));
    // v1 — ishga tushiradi; v2 — yaqin raqib; v3 — uzoq raqib
    addVehicle(world, 'v1', -40, 3, 20);
    addVehicle(world, 'v2', 30, 3, 10);
    addVehicle(world, 'v3', -140, 3, -150);
    const hit = findHitTarget(world as unknown as GameWorld, rig.collider.handle)!;
    expect(hit).not.toBeNull();
    expect(rig.phase).toBe('idle');
    hit.damage(5, 'v1', 'mg');
    expect(rig.phase).toBe('warn');
    expect(rig.source).toBe('v1');
    expect(fires).toContain('siren');
    expect(Math.hypot(rig.target.x - 30, rig.target.z - 10)).toBeLessThan(6);
    expect(rig.mark.group.position.y).toBeGreaterThan(-100); // qizil belgi ko'rinadi
    world.step(Math.round(L.warn * 60) - 6);
    expect(rig.phase).toBe('warn');
    expect(boom.filter((b) => b.sourceId === 'v1')).toHaveLength(0);
    world.step(12);
    expect(rig.phase).toBe('flight');
    expect(fires).toContain('rocket');
    world.step(60);
    expect(rig.curP.y).toBeGreaterThan(rig.pad.y + 20); // raketa ko'tarilgan
    world.step(Math.round(L.flightTime * 60));
    const ours = boom.filter((b) => b.sourceId === 'v1');
    expect(ours).toHaveLength(1);
    expect(ours[0]!.radius).toBe(L.explosion.radius);
    expect(ours[0]!.damage).toBe(L.explosion.damage);
    expect(Math.hypot(ours[0]!.pos.x - rig.target.x, ours[0]!.pos.z - rig.target.z)).toBeLessThan(0.5);
    expect(rig.phase).toBe('cool');
    expect(rig.mark.group.position.y).toBeLessThan(-100);
    // Cooldown: qayta urilsa e'tibor berilmaydi
    hit.damage(5, 'v2', 'mg');
    expect(rig.phase).toBe('cool');
    world.step(60 * 15);
    expect(launch.trigger(rig, 'v2')).toBe(false);
    world.step(60 * Math.ceil(L.cooldown - 15 - L.warn - L.flightTime + 1));
    expect(rig.phase).toBe('idle');
    world.events.emit('damage', { targetId: rig.id, sourceId: 'v2', amount: 3, weapon: 'rocket' });
    expect(rig.phase).toBe('warn');
    expect(rig.source).toBe('v2');
    expect(rig.launches).toBe(1);
    arena.dispose();
  });

  it('mashina plita ustidan o\'tsa ishga tushadi; yolg\'iz bo\'lsa tasodifiy nuqta (arena ichida, maydonchadan uzoq)', async () => {
    const { world, arena } = await load();
    const rig = sys<LaunchSystem>(world, 'launch').rigs[0]!;
    addVehicle(world, 'a', rig.plate.x + 20, 2, rig.plate.y + 20);
    world.step(30);
    expect(rig.phase).toBe('idle');
    const v = world.vehicles[0]!;
    v.body.setTranslation({ x: rig.plate.x, y: arena.heightAt(rig.plate.x, rig.plate.y) + 1, z: rig.plate.y }, true);
    v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    world.step(3);
    expect(rig.phase).toBe('warn');
    expect(rig.source).toBe('a');
    const half = def.size / 2;
    expect(Math.abs(rig.target.x)).toBeLessThanOrEqual(half - L.target.margin);
    expect(Math.abs(rig.target.z)).toBeLessThanOrEqual(half - L.target.margin);
    expect(Math.hypot(rig.target.x - rig.pad.x, rig.target.z - rig.pad.z)).toBeGreaterThanOrEqual(L.target.minPadDist);
    arena.dispose();
  });

  it('tashqi portlash (raketa/mina) terminal yonida ishga tushiradi; manba mashina emas bo\'lsa — hech narsa', async () => {
    const { world, arena } = await load();
    const rig = sys<LaunchSystem>(world, 'launch').rigs[0]!;
    addVehicle(world, 'p', 0, 3, 0);
    world.events.emit('explosion', { pos: rig.terminal.clone().add(new THREE.Vector3(0, 1, 0)), radius: 6, damage: 30, sourceId: 'fuelTank-1' });
    expect(rig.phase).toBe('idle');
    world.events.emit('explosion', { pos: rig.terminal.clone().add(new THREE.Vector3(2, 1, 0)), radius: 6, damage: 30, sourceId: 'p' });
    expect(rig.phase).toBe('warn');
    expect(rig.source).toBe('p');
    arena.dispose();
  });
});
