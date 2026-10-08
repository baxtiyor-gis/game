import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef } from '../src/core/data';
import { findHitTarget } from '../src/core/hitTargets';
import { loadArena } from '../src/levels/loader';
import { arenaDef, isAvailable } from '../src/levels/registry';
import { SurfaceSystem } from '../src/levels/surfaces';
import { SkiLiftSystem } from '../src/levels/skiLift';
import { SnowfallSystem } from '../src/levels/snowfall';
import type { Arena, ArenaDef } from '../src/levels/types';
import { spawnVehicle } from '../src/vehicles/vehicle';
import type { Controller, GameEvents, GameWorld, InputState, System, VehicleHandle } from '../src/core/types';
import ski from '../data/levels/ski.json';
import skiResort from '../data/levels/ski_resort.json';

const DT = 1 / 60;
const def = skiResort as unknown as ArenaDef;

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
  step(n: number, each?: () => void): void {
    for (let i = 0; i < n; i++) {
      for (const s of [...this.systems]) s.fixedUpdate?.(DT);
      this.physics.step();
      this.time += DT;
      each?.();
    }
  }
}

class Pad implements Controller {
  readonly id = 'pad';
  throttle = 0;
  sample(): InputState {
    return { throttle: this.throttle, steer: 0, handbrake: false, fireMG: false, fireWeapon: false, fireSpecial: false, cycleWeapon: 0, rearView: false, combo: null };
  }
}

async function load(): Promise<{ world: FakeWorld; arena: Arena }> {
  const world = new FakeWorld();
  const arena = await loadArena(world as unknown as GameWorld, def);
  world.step(1);
  return { world, arena };
}

const sys = <T>(w: FakeWorld, name: string): T => w.systems.find((s) => s.name === name) as unknown as T;
const car = (world: FakeWorld, arena: Arena, x: number, z: number, yaw: number, speed: number): { v: VehicleHandle; pad: Pad } => {
  const pad = new Pad();
  const v = spawnVehicle(world as unknown as GameWorld, vehicleDef('rattler'), pad, { x, y: arena.heightAt(x, z) + 0.9, z }, yaw);
  v.body.setLinvel({ x: Math.sin(yaw) * speed, y: 0, z: Math.cos(yaw) * speed }, true);
  return { v, pad };
};
const maxSlope = (a: Arena, x: number, z: number): number =>
  Math.max(Math.abs(a.heightAt(x + 4, z) - a.heightAt(x - 4, z)), Math.abs(a.heightAt(x, z + 4) - a.heightAt(x, z - 4))) / 8;

beforeAll(async () => {
  await RAPIER.init();
});

describe('ski_resort arenasi', () => {
  it('registry da mavjud; yuklanadi; spawnlar >=15 m oraliqda, qiyalikda emas, muz/proplardan uzoq; tozalanadi', async () => {
    expect(isAvailable('ski_resort')).toBe(true);
    expect(arenaDef('ski_resort').id).toBe('ski_resort');
    const { world, arena } = await load();
    expect(arena.spawns.length).toBeGreaterThanOrEqual(8);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    for (const t of ['pineTree', 'lodge', 'cabin', 'skiJump', 'snowBank']) expect(def.props.some((p) => p.type === t)).toBe(true);
    for (const t of ['propaneTank', 'liftPylon']) expect(def.destructibles.some((d) => d.type === t)).toBe(true);
    expect(def.props.filter((p) => p.type === 'pineTree').length).toBeGreaterThan(150);
    const surf = sys<SurfaceSystem>(world, 'surfaces');
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      expect(maxSlope(arena, s.pos.x, s.pos.z)).toBeLessThan(0.08);
      expect(surf.gripAt(s.pos.x, s.pos.z)).toBe(1);
      for (const p of def.props.filter((q) => q.type !== 'pineTree' && q.type !== 'snowBank')) expect(Math.hypot(s.pos.x - p.pos[0], s.pos.z - p.pos[1])).toBeGreaterThan(12);
      for (const d of def.destructibles) expect(Math.hypot(s.pos.x - d.pos[0], s.pos.z - d.pos[1])).toBeGreaterThan(12);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
    });
    expect(sys<SnowfallSystem>(world, 'snowfall').count).toBeLessThanOrEqual(1500);
    expect(def.environment?.fog?.color).toBeDefined();
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.physics.bodies.len()).toBe(0);
  });

  it('sirt zonalari: muz 0.25, qor yo\'li 0.7, qolgan joy 1; mashinaga surfaceGrip yoziladi', async () => {
    const { world, arena } = await load();
    const surf = sys<SurfaceSystem>(world, 'surfaces');
    const lake = def.surfaces!.find((s) => s.type === 'ice')!;
    expect(surf.gripAt(lake.pos![0], lake.pos![1])).toBe(ski.grip.ice);
    expect(surf.gripAt(lake.pos![0] + lake.radius! + 3, lake.pos![1])).toBe(1);
    const road = def.surfaces!.find((s) => s.type === 'snow')!;
    expect(surf.gripAt(road.path![1]![0], road.path![1]![1])).toBe(ski.grip.snow);
    const { v } = car(world, arena, lake.pos![0], lake.pos![1], 0, 0);
    world.step(2);
    expect(v.surfaceGrip).toBe(ski.grip.ice);
    v.body.setTranslation({ x: 0, y: 2, z: 0 }, true);
    world.step(2);
    expect(v.surfaceGrip).toBe(1);
    arena.dispose();
  });

  it('muzda mashina ancha sekin tormozlanadi (ishqalanish ko\'paytiruvchisi ta\'sir qiladi)', async () => {
    const { world, arena } = await load();
    const brake = (x: number, z: number, yaw: number): number => {
      const { v, pad } = car(world, arena, x, z, yaw, 14);
      world.step(20); // yo'lga o'rnashish (zona/yer)
      pad.throttle = -1;
      const x0 = v.body.translation();
      let n = 0;
      while (v.speed() > 1 && n++ < 900) world.step(1);
      const x1 = v.body.translation();
      world.systems = world.systems.filter((s) => s !== (v as unknown as System));
      v.body.setTranslation({ x: 0, y: -50, z: 0 }, true);
      return Math.hypot(x1.x - x0.x, x1.z - x0.z);
    };
    const lake = def.surfaces!.find((s) => s.type === 'ice')!;
    const onIce = brake(lake.pos![0] - 36, lake.pos![1], Math.PI / 2);
    const onGround = brake(-48, -30, Math.PI / 2);
    expect(onIce).toBeGreaterThan(onGround * 1.5);
    arena.dispose();
  });

  it('kanat yo\'li: kabinalar arqon bo\'ylab harakatlanadi; otilsa yiqiladi, tagidagi mashinaga \'lift\' zarari, keyin qayta tiklanadi', async () => {
    const { world, arena } = await load();
    const lift = sys<SkiLiftSystem>(world, 'skiLift');
    expect(lift.cabins).toHaveLength(def.skiLift!.cabins);
    const c = lift.cabins[0]!;
    const p0 = c.pos.clone();
    world.step(60);
    expect(c.pos.distanceTo(p0)).toBeGreaterThan(ski.lift.speed * 0.9);
    expect(c.body.translation().y).toBeCloseTo(c.pos.y - 2.15, 1);
    const dmg: GameEvents['damage'][] = [];
    world.events.on('damage', (e) => e.weapon === 'lift' && dmg.push(e));
    const { v } = car(world, arena, c.pos.x, c.pos.z, 0, 0);
    findHitTarget(world as unknown as GameWorld, c.collider.handle)!.damage(500, 'p', 'rocket');
    expect(c.phase).toBe('fall');
    world.step(120);
    expect(c.phase).toBe('wreck');
    expect(dmg.some((e) => e.targetId === v.id && e.amount === ski.lift.fall.damage)).toBe(true);
    world.step(Math.ceil((ski.lift.wreckTime + 1) / DT));
    expect(c.phase).toBe('ride');
    expect(c.hp).toBe(ski.lift.cabin.hp);
    arena.dispose();
  });

  it('ustun portlasa atrofdagi kabinalar yiqiladi; propan tanki portlaydi', async () => {
    const { world, arena } = await load();
    const lift = sys<SkiLiftSystem>(world, 'skiLift');
    const explosions: string[] = [];
    world.events.on('explosion', (e) => e.sourceId && explosions.push(e.sourceId));
    world.events.emit('damage', { targetId: 'liftPylon-3', sourceId: null, amount: 100, weapon: 'rocket' });
    world.events.emit('damage', { targetId: 'propaneTank-1', sourceId: null, amount: 100, weapon: 'rocket' });
    world.step(40);
    expect(arena.destructibles.isDestroyed('liftPylon-3')).toBe(true);
    expect(arena.destructibles.isDestroyed('propaneTank-1')).toBe(true);
    expect(explosions).toContain('liftPylon-3');
    expect(lift.falls).toBeGreaterThanOrEqual(1);
    expect(lift.cabins.filter((c) => c.phase !== 'ride').length).toBe(lift.falls);
    arena.dispose();
  });

  it('tramplindan mashina sakraydi (tekis yerdagidan ancha balandroq ko\'tariladi)', async () => {
    const { world, arena } = await load();
    const run = (x: number, z: number): number => {
      const { v, pad } = car(world, arena, x, z, Math.PI, 22);
      pad.throttle = 1;
      let top = -Infinity;
      world.step(150, () => (top = Math.max(top, v.body.translation().y - arena.heightAt(v.body.translation().x, v.body.translation().z))));
      v.body.setTranslation({ x: 0, y: -50, z: 0 }, true);
      return top;
    };
    const jump = def.props.find((p) => p.type === 'skiJump')!;
    const high = run(jump.pos[0], jump.pos[1] + 24);
    const flat = run(-20, -20);
    expect(high).toBeGreaterThan(flat + 3);
    arena.dispose();
  });

  it('qor yog\'ishi: zarralar kamera atrofidagi quti ichida qoladi va tushadi', async () => {
    const { world, arena } = await load();
    const snow = sys<SnowfallSystem>(world, 'snowfall');
    const [bx, by] = ski.snowfall.box;
    const y0 = snow.points.geometry.getAttribute('position').getY(0);
    for (let i = 0; i < 120; i++) snow.update(DT);
    const pos = snow.points.geometry.getAttribute('position');
    expect(pos.getY(0)).not.toBeCloseTo(y0, 3);
    for (let i = 0; i < pos.count; i++) {
      expect(Math.abs(pos.getX(i))).toBeLessThanOrEqual(bx / 2 + 1e-3);
      expect(Math.abs(pos.getY(i))).toBeLessThanOrEqual(by / 2 + 1e-3);
    }
    arena.dispose();
  });
});
