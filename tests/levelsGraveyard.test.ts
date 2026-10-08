import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { loadArena } from '../src/levels/loader';
import type { Arena, ArenaDef } from '../src/levels/types';
import { CG } from '../src/core/types';
import type { GameEvents, GameWorld, PickupKind, System, VehicleHandle } from '../src/core/types';
import graveyard from '../data/levels/aircraft_graveyard.json';
import craneCfg from '../data/levels/crane.json';
import { arenaDef } from '../src/levels/registry';
import { CraneSystem } from '../src/levels/crane';
import { PlaneSystem } from '../src/levels/planes';
import { buildPlane, planeSpecs } from '../src/levels/props/airplane';

const DT = 1 / 60;
const def = graveyard as unknown as ArenaDef;

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

async function load(onDrop?: (p: THREE.Vector3, k: PickupKind) => void): Promise<{ world: FakeWorld; arena: Arena }> {
  const world = new FakeWorld();
  const arena = await loadArena(world as unknown as GameWorld, def, { onDrop });
  world.step(1);
  return { world, arena };
}

const rayDownY = (world: FakeWorld, x: number, z: number): number | null => {
  const hit = world.physics.castRay(new RAPIER.Ray({ x, y: 200, z }, { x: 0, y: -1, z: 0 }), 400, true);
  return hit ? 200 - hit.timeOfImpact : null;
};

/** Haqiqiy dinamik jismli soxta mashina */
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

beforeAll(async () => {
  await RAPIER.init();
});

describe('aircraft_graveyard arenasi', () => {
  it('registry da mavjud va yuklanadi: spawnlar terrain ustida, >=15 m oraliqda, proplardan uzoq', async () => {
    expect(arenaDef('aircraft_graveyard').id).toBe('aircraft_graveyard');
    const { world, arena } = await load();
    expect(arena.spawns).toHaveLength(8);
    expect(arena.pickupSpawns.length).toBeGreaterThanOrEqual(18);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    for (const t of ['airplane', 'hangar', 'controlTower', 'runway', 'barbedFence']) expect(def.props.some((p) => p.type === t)).toBe(true);
    expect(def.interactives.filter((i) => i.type === 'crane').length).toBeGreaterThanOrEqual(3);
    expect(def.destructibles.filter((d) => d.type === 'fuelTank').length).toBeGreaterThanOrEqual(4);
    const solid = def.props.filter((p) => ['airplane', 'hangar', 'controlTower'].includes(p.type)).map((p) => p.pos);
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      for (const [x, z] of solid) expect(Math.hypot(s.pos.x - x, s.pos.z - z)).toBeGreaterThan(15);
      for (const i2 of def.interactives) expect(Math.hypot(s.pos.x - i2.pos[0], s.pos.z - i2.pos[1])).toBeGreaterThan(20);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
      expect(rayDownY(world, s.pos.x, s.pos.z)!).toBeLessThan(s.pos.y);
    });
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.physics.bodies.len()).toBe(0);
  });

  it('samolyot fyuzelyaji mashinani o\'tkazmaydi, angar ichiga kirish mumkin', async () => {
    const { world, arena } = await load();
    const bomber = def.props.find((p) => p.type === 'airplane' && p.variant === 'bomber' && !p.damage && p.pos[1] > 90)!;
    const [bx, bz] = bomber.pos;
    const along = (a: number) => world.physics.castRay(new RAPIER.Ray({ x: bx, y: 2.5, z: bz + a }, { x: 0, y: 0, z: -1 }), 100, true);
    // fyuzelyaj (yaw ~ pi/2: x bo'ylab) markazidan kesib o'tuvchi nur to'siqqa uriladi
    expect(world.physics.castRay(new RAPIER.Ray({ x: bx, y: 2.5, z: bz + 12 }, { x: 0, y: 0, z: -1 }), 100, true)).not.toBeNull();
    expect(along(12)!.timeOfImpact).toBeLessThan(14);
    // angar: old tomon (+z) ochiq, orqa devor bor
    const h = def.props.find((p) => p.type === 'hangar')!;
    const inward = world.physics.castRay(new RAPIER.Ray({ x: h.pos[0], y: 2, z: h.pos[1] + 40 }, { x: 0, y: 0, z: -1 }), 100, true)!;
    expect(inward.timeOfImpact).toBeGreaterThan(40 + 8); // kirish ochiq: ichkarida birinchi to'siq orqa devor (yoki sandiq)
    expect(inward.timeOfImpact).toBeLessThan(40 + 17);
    arena.dispose();
  });

  it('fuel tank portlaydi, zanjir bo\'ladi va sandiq tushiradi', async () => {
    const drops: Array<[THREE.Vector3, PickupKind]> = [];
    const { world, arena } = await load((p, k) => drops.push([p.clone(), k]));
    const tanks = def.destructibles.filter((d) => d.type === 'fuelTank');
    const first = tanks[1]!; // drop: missile
    const boom: Array<GameEvents['explosion']> = [];
    world.events.on('explosion', (e) => e.sourceId?.startsWith('fuelTank-') && boom.push(e));
    expect(rayDownY(world, first.pos[0], first.pos[1])!).toBeGreaterThan(6);
    world.events.emit('damage', { targetId: 'fuelTank-2', sourceId: 'p', amount: 100, weapon: 'rocket' });
    world.step(10);
    expect(arena.destructibles.isDestroyed('fuelTank-2')).toBe(false); // fitil
    world.step(240);
    expect(arena.destructibles.isDestroyed('fuelTank-2')).toBe(true);
    expect(boom.length).toBeGreaterThanOrEqual(3); // qo'shni tanklar zanjirda
    expect(drops.some(([, k]) => k === 'missile')).toBe(true);
    expect(rayDownY(world, first.pos[0], first.pos[1])!).toBeLessThan(2);
    arena.dispose();
  });

  it('kran yuki tagidagi mashinaga ogohlantirishdan keyin zarar va impuls beradi, keyin ko\'tariladi', async () => {
    const { world, arena } = await load();
    const cranes = sys<CraneSystem>(world, 'cranes');
    expect(cranes.rigs.length).toBeGreaterThanOrEqual(3);
    const rig = cranes.rigs[0]!;
    const dmg: Array<GameEvents['damage']> = [];
    world.events.on('damage', (e) => e.weapon === 'crane' && dmg.push(e));
    world.step(120);
    expect(rig.phase).toBe('idle');
    expect(dmg).toHaveLength(0);
    const v = addVehicle(world, 'v1', rig.x, arena.heightAt(rig.x, rig.z) + 1.2, rig.z + 8);
    world.step(30); // tagida emas: tinch
    expect(rig.phase).toBe('idle');
    v.body.setTranslation({ x: rig.x, y: arena.heightAt(rig.x, rig.z) + 1.2, z: rig.z }, true);
    v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    world.step(2);
    expect(rig.phase).toBe('warn');
    let maxSway = 0;
    for (let i = 0; i < Math.round(craneCfg.warn * 60) - 10; i++) {
      world.step(1);
      maxSway = Math.max(maxSway, Math.abs(rig.sway));
    }
    expect(dmg).toHaveLength(0); // ogohlantirish davrida zarar yo'q
    expect(maxSway).toBeGreaterThan(craneCfg.sway.amplitude * 0.5);
    world.step(90);
    expect(dmg).toHaveLength(1);
    expect(dmg[0]!.targetId).toBe('v1');
    expect(dmg[0]!.amount).toBeGreaterThan(0);
    const l = v.body.linvel();
    expect(Math.hypot(l.x, l.y, l.z)).toBeGreaterThan(2);
    expect(rig.drop).toBeGreaterThan(craneCfg.restClearance - 0.5);
    world.step(60 * 12);
    expect(rig.phase === 'cool' || rig.phase === 'idle').toBe(true);
    expect(rig.drop).toBeLessThan(0.01);
    arena.dispose();
  });

  it('kran yukini otib uzish mumkin: tushadi, kran ishdan chiqadi va sandiq tushadi', async () => {
    const drops: Array<[THREE.Vector3, PickupKind]> = [];
    const { world, arena } = await load((p, k) => drops.push([p.clone(), k]));
    const rig = sys<CraneSystem>(world, 'cranes').rigs[0]!;
    world.events.emit('damage', { targetId: rig.id, sourceId: 'p', amount: 1000, weapon: 'rocket' });
    world.step(120);
    expect(rig.phase).toBe('dead');
    expect(rig.drop).toBeCloseTo(craneCfg.restClearance, 3);
    expect(drops).toHaveLength(1);
    world.step(600);
    expect(rig.phase).toBe('dead');
    arena.dispose();
  });

  it('taksi qiluvchi samolyot yo\'lak bo\'ylab harakatlanadi, tsikl qiladi va urilgan mashinaga zarar beradi', async () => {
    const { world, arena } = await load();
    const planes = sys<PlaneSystem>(world, 'planes');
    expect(planes.routes).toHaveLength(def.planes!.length);
    const r = planes.routes[0]!;
    const route = def.planes![0]!;
    expect(r.active).toBe(false);
    world.step(Math.round(route.delay * 60) + 5);
    expect(r.active).toBe(true);
    const x0 = r.cur.p.x;
    world.step(60);
    expect(r.cur.p.x - x0).toBeGreaterThan(route.speed * 0.4);
    for (let i = 0; i < 40 && r.cur.p.x < -100; i++) world.step(30);
    expect(Math.abs(r.cur.p.z - route.path[0]![1])).toBeLessThan(0.5);
    const dmg: Array<GameEvents['damage']> = [];
    world.events.on('damage', (e) => e.weapon === 'plane' && dmg.push(e));
    // mashinani samolyotning yo'liga qo'yamiz (qanot ostiga)
    const target = r.cur.p.clone();
    const v = addVehicle(world, 'v2', target.x + 22, 1.2, target.z);
    world.step(90);
    expect(dmg.length).toBeGreaterThanOrEqual(1);
    expect(dmg[0]!.targetId).toBe('v2');
    expect(v.body.linvel().x ** 2 + v.body.linvel().z ** 2).toBeGreaterThan(1);
    for (let i = 0; i < 30 && r.cycle === 0; i++) world.step(60);
    expect(r.cycle).toBe(1);
    expect(r.active).toBe(false);
    world.step(Math.round(route.interval * 60) + 5);
    expect(r.active).toBe(true);
    arena.dispose();
  });

  it('samolyot turlari va buzilish variantlari quriladi (qanotsiz, bo\'lingan, dumsiz)', () => {
    for (const kind of Object.keys(planeSpecs)) {
      const whole = buildPlane(kind);
      expect(whole.boxes.length).toBeGreaterThanOrEqual(3);
      for (const dmgKind of ['wingless', 'tailless', 'split', 'noEngines', 'belly']) {
        const m = buildPlane(kind, dmgKind, 1);
        expect(m.group.children.length).toBeGreaterThan(5);
        expect(m.boxes.length).toBeGreaterThanOrEqual(2);
      }
      expect(buildPlane(kind, 'wingless').boxes.length).toBe(whole.boxes.length - 2);
    }
  });
});
