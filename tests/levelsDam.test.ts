import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { loadArena } from '../src/levels/loader';
import { makeHeightFn } from '../src/levels/terrain';
import type { Arena, ArenaDef } from '../src/levels/types';
import { CG } from '../src/core/types';
import type { GameEvents, GameWorld, System, VehicleHandle } from '../src/core/types';
import hooverDam from '../data/levels/hoover_dam.json';
import dam from '../data/levels/dam.json';
import { arenaDef, isAvailable } from '../src/levels/registry';
import { WaterSystem } from '../src/levels/water';
import { PowerGridSystem } from '../src/levels/powerGrid';

const DT = 1 / 60;
const def = hooverDam as unknown as ArenaDef;
const W = dam.water;

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
  const body = world.physics.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).lockRotations());
  world.physics.createCollider(RAPIER.ColliderDesc.roundCuboid(0.8, 0.3, 1.8, 0.2).setDensity(1).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setCollisionGroups((CG.VEHICLE << 16) | 0xffff), body);
  const v = {
    id, alive: true, stalled: 0, def: { mass: 1000 }, body,
    position: (o: THREE.Vector3) => o.set(body.translation().x, body.translation().y, body.translation().z),
    forward: (o: THREE.Vector3) => o.set(0, 0, 1),
  } as unknown as VehicleHandle;
  world.vehicles.push(v);
  return v;
}

const sys = <T>(w: FakeWorld, name: string): T => w.systems.find((s) => s.name === name) as unknown as T;
const speedOf = (v: VehicleHandle): number => Math.hypot(v.body.linvel().x, v.body.linvel().z);

beforeAll(async () => {
  await RAPIER.init();
});

describe('terrain: kesma (kapsula) tekisliklari', () => {
  it('`to` bilan tekislik balandligi kesma bo\'ylab chiziqli o\'zgaradi, tashqarisi o\'z holicha', () => {
    const h = makeHeightFn({
      resolution: 8, seed: 1, noise: { amplitude: 0, frequency: 1, octaves: 1 }, hills: [],
      flats: [{ pos: [0, 0], radius: 3, blend: 4, height: 10, to: [40, 0], toHeight: 0 }],
    });
    expect(h(0, 0)).toBeCloseTo(10, 5);
    expect(h(20, 2)).toBeCloseTo(5, 5);
    expect(h(40, -3)).toBeCloseTo(0, 5);
    expect(h(20, 30)).toBeCloseTo(0, 5);
  });
});

describe('hoover_dam arenasi', () => {
  it('registry da mavjud; yuklanadi; spawnlar (tepada ham, pastda ham) terrain ustida, >=15 m oraliqda, suvdan va proplardan uzoq', async () => {
    expect(isAvailable('hoover_dam')).toBe(true);
    expect(arenaDef('hoover_dam').id).toBe('hoover_dam');
    const { world, arena } = await load();
    const water = sys<WaterSystem>(world, 'water');
    expect(arena.spawns).toHaveLength(8);
    expect(arena.pickupSpawns.length).toBeGreaterThanOrEqual(20);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    for (const t of ['damWall', 'powerHouse', 'powerPylon', 'intakeTower', 'cliff', 'bridge']) expect(def.props.some((p) => p.type === t)).toBe(true);
    expect(def.destructibles.filter((d) => d.type === 'transformer').length).toBeGreaterThanOrEqual(10);
    expect(def.water!.map((w) => w.id)).toEqual(['lake', 'river']);
    const solid = def.props.filter((p) => ['powerPylon', 'intakeTower', 'cliff'].includes(p.type)).map((p) => p.pos);
    const high = arena.spawns.filter((s) => s.pos.y > 15);
    const low = arena.spawns.filter((s) => s.pos.y < 5);
    expect(high.length).toBeGreaterThanOrEqual(2);
    expect(low.length).toBeGreaterThanOrEqual(4);
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      expect(water.groundDepth(s.pos.x, s.pos.z)).toBeLessThan(-1);
      for (const [x, z] of solid) expect(Math.hypot(s.pos.x - x, s.pos.z - z)).toBeGreaterThan(15);
      for (const d of def.destructibles) expect(Math.hypot(s.pos.x - d.pos[0], s.pos.z - d.pos[1])).toBeGreaterThan(15);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
    });
    // Issiq kunduzgi kanyon: yorqin quyosh, zich bo'lmagan tuman
    expect(def.environment?.sun?.intensity).toBeGreaterThan(2.5);
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.physics.bodies.len()).toBe(0);
  });

  it('to\'g\'on yo\'li balandda, kanyon tubi pastda; devor kollayderi relyef bilan mos, parapetda bo\'shliqlar bor', async () => {
    const { world, arena } = await load();
    const crest = arena.heightAt(0, -112);
    expect(crest).toBeGreaterThan(22);
    expect(arena.heightAt(0, -60)).toBeLessThan(2);
    expect(arena.heightAt(0, -140)).toBeLessThan(crest - 10); // quyi oqim/yuqori oqim farqi
    for (const [x, z] of [[-60, -112], [30, -100], [60, -92], [-50, -125]]) {
      const hit = world.physics.castRay(new RAPIER.Ray({ x, y: 60, z }, { x: 0, y: -1, z: 0 }), 100, true)!;
      expect(60 - hit.timeOfImpact).toBeCloseTo(arena.heightAt(x, z), 0);
    }
    // Parapet: -60 da qovurg'a bor (z yo'nalishida ~5.7 m da uriladi), -94 da (bo'shliq) yo'q
    const y = crest + 0.65;
    const ray = (x: number) => world.physics.castRay(new RAPIER.Ray({ x, y, z: -112 }, { x: 0, y: 0, z: 1 }), 20, true);
    expect(ray(-60)?.timeOfImpact).toBeCloseTo(dam.wall.half - dam.wall.parapetT / 2, 0);
    expect(ray(-94)).toBeNull();
    arena.dispose();
  });

  it('to\'g\'on yo\'lidan pastga yo\'l bor: nishab mashina o\'ta oladigan, dinamik quti yo\'l bo\'ylab kanyon tubigacha tushadi', async () => {
    const { world, arena } = await load();
    const route: Array<[number, number]> = [[0, -112], [158, -112], [158, -100], [158, -24], [112, -24], [96, 24], [90, 40]];
    let maxSlope = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i]!;
      const [bx, bz] = route[i + 1]!;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az));
      for (let k = 0; k < n; k++) {
        const t0 = k / n;
        const t1 = (k + 1) / n;
        const h0 = arena.heightAt(ax + (bx - ax) * t0, az + (bz - az) * t0);
        const h1 = arena.heightAt(ax + (bx - ax) * t1, az + (bz - az) * t1);
        maxSlope = Math.max(maxSlope, Math.abs(h1 - h0));
      }
    }
    expect(maxSlope).toBeLessThan(0.3); // < ~17 daraja
    expect(arena.heightAt(90, 40)).toBeLessThan(1);
    const car = addVehicle(world, 'c', 0, arena.heightAt(0, -112) + 1.2, -112);
    let leg = 1;
    for (let i = 0; i < 60 * 70 && leg < route.length; i++) {
      const p = car.body.translation();
      const [tx, tz] = route[leg]!;
      const d = Math.hypot(tx - p.x, tz - p.z);
      if (d < 4) leg++;
      else car.body.setLinvel({ x: ((tx - p.x) / d) * 9, y: car.body.linvel().y, z: ((tz - p.z) / d) * 9 }, true);
      world.step(1);
    }
    expect(leg).toBe(route.length);
    expect(car.body.translation().y).toBeLessThan(3);
    arena.dispose();
  });

  it('daryo: sayozda (brod) yurish mumkin — sekinlashadi, zarar yo\'q; chuqurda kuchli sekinlashadi, zarar oladi va qirg\'oqqa qaytariladi', async () => {
    const { world, arena } = await load();
    const water = sys<WaterSystem>(world, 'water');
    const dmg: Array<GameEvents['damage']> = [];
    world.events.on('damage', (e) => dmg.push(e));
    // Quruqlikda tezlik saqlanadi
    const dry = addVehicle(world, 'dry', 45, arena.heightAt(45, 10) + 0.6, 10);
    dry.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    world.step(30);
    expect(speedOf(dry)).toBeGreaterThan(9);
    // Brod: chuqurlik sayoz, yurish mumkin
    const fx = -9.3;
    expect(water.groundDepth(fx, 88)).toBeGreaterThan(W.wade);
    expect(water.groundDepth(fx, 88)).toBeLessThan(W.shallow);
    const ford = addVehicle(world, 'ford', fx, arena.heightAt(fx, 88) + 0.7, 88);
    ford.body.setLinvel({ x: 0, y: 0, z: 10 }, true);
    world.step(60);
    expect(speedOf(ford)).toBeLessThan(5);
    expect(dmg.filter((d) => d.targetId === 'ford')).toHaveLength(0);
    world.step(60 * 5);
    expect(water.respawns).toBe(0);
    dry.alive = false;
    ford.alive = false;
    // Chuqur: daryo o'rtasi
    const cx = -4;
    const deepY = arena.heightAt(cx, 10) + 0.7;
    expect(water.depthFor(cx, deepY, 10)).toBeGreaterThan(W.deep);
    const deep = addVehicle(world, 'deep', cx, deepY, 10);
    deep.body.setLinvel({ x: 10, y: 0, z: 0 }, true);
    world.step(40);
    expect(speedOf(deep)).toBeLessThan(2);
    expect(dmg.filter((d) => d.targetId === 'deep' && d.weapon === 'water').length).toBeGreaterThanOrEqual(1);
    world.step(60 * 3);
    expect(water.respawns).toBe(1);
    const p = deep.body.translation();
    expect(water.groundDepth(p.x, p.z)).toBeLessThan(-W.dryMargin);
    expect(dmg.some((d) => d.targetId === 'deep' && d.amount === W.respawnDamage)).toBe(true);
    arena.dispose();
  });

  it('ko\'lga tushgan mashina to\'g\'on yo\'liga/qirg\'oqqa qaytariladi; ko\'prik ustidagi mashina suvda hisoblanmaydi', async () => {
    const { world, arena } = await load();
    const water = sys<WaterSystem>(world, 'water');
    const lake = addVehicle(world, 'lake', 0, arena.heightAt(0, -140) + 1, -140);
    world.step(60 * 6);
    expect(water.respawns).toBe(1);
    expect(lake.body.translation().y).toBeGreaterThan(arena.heightAt(0, -140) + 10);
    // Ko'prik (4,-18): daryo ustida, sath yuqorida
    const bridgeY = arena.heightAt(-30, -18) + 0.9;
    expect(water.depthFor(4, bridgeY, -18)).toBe(0);
    expect(water.findShore(0, -60)).not.toBeNull();
    arena.dispose();
  });

  it('transformator o\'qdan portlaydi: radius ichidagi mashina dvigateli 1.5 s o\'chadi (stalled), uzoqdagi emas; qo\'shni transformatorlar zanjir bo\'lib portlaydi', async () => {
    const { world, arena } = await load();
    const grid = sys<PowerGridSystem>(world, 'powerGrid');
    expect(grid).toBeDefined();
    const booms: Array<GameEvents['explosion']> = [];
    const status: Array<GameEvents['status']> = [];
    world.events.on('explosion', (e) => booms.push(e));
    world.events.on('status', (e) => status.push(e));
    const [tx, tz] = def.destructibles.find((d) => d.type === 'transformer')!.pos;
    const near = addVehicle(world, 'near', tx + 3, arena.heightAt(tx, tz) + 1, tz + 3);
    const far = addVehicle(world, 'far', tx + 60, arena.heightAt(tx + 60, tz) + 1, tz + 60);
    expect(near.stalled).toBe(0);
    world.events.emit('damage', { targetId: 'transformer-1', sourceId: 'near', amount: 100, weapon: 'rocket' });
    world.step(75);
    const mine = booms.filter((b) => b.sourceId === 'transformer-1');
    expect(mine).toHaveLength(1);
    expect(arena.destructibles.isDestroyed('transformer-1')).toBe(true);
    expect(near.stalled).toBeCloseTo(dam.grid.stall, 5);
    expect(far.stalled).toBe(0);
    expect(status.some((s) => s.targetId === 'near' && s.kind === 'stalled' && s.duration === dam.grid.stall)).toBe(true);
    expect(status.some((s) => s.targetId === 'far')).toBe(false);
    expect(arena.destructibles.isDestroyed('transformer-2')).toBe(true);
    // Transformator bo'lmagan manbadagi portlash mashinani o'chirmaydi
    far.stalled = 0;
    world.events.emit('explosion', { pos: new THREE.Vector3(tx + 60, 5, tz + 60), radius: 10, damage: 1, sourceId: 'barrel-1' });
    expect(far.stalled).toBe(0);
    // Uchqun vizuali yangilanadi
    grid.update(DT);
    arena.dispose();
  });

  it('draw call soni chegarada: statik proplar birlashtirilgan', async () => {
    const { world, arena } = await load();
    let meshes = 0;
    world.scene.traverse((o) => (o as THREE.Mesh).isMesh && meshes++);
    expect(meshes).toBeLessThan(220);
    arena.dispose();
  });
});
