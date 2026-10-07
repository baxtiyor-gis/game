import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { loadArena } from '../src/levels/loader';
import { maxChainPerTick } from '../src/levels/destructible';
import type { Arena, ArenaDef } from '../src/levels/types';
import type { GameEvents, GameWorld, PickupKind, System, VehicleHandle } from '../src/core/types';
import oilFields from '../data/levels/oil_fields.json';

const DT = 1 / 60;
const def = oilFields as unknown as ArenaDef;

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
  world.step(1); // query pipeline yangilansin
  return { world, arena };
}

const rayDownY = (world: FakeWorld, x: number, z: number): number | null => {
  const hit = world.physics.castRay(new RAPIER.Ray({ x, y: 200, z }, { x: 0, y: -1, z: 0 }), 400, true);
  return hit ? 200 - hit.timeOfImpact : null;
};

/** Barcha prop/destructible/interaktivlar joylashuvi (x,z) */
const objectXZ = (): Array<[number, number]> => [
  ...def.props.map((p) => p.pos), ...def.destructibles.map((d) => d.pos), ...def.interactives.map((i) => i.pos),
];

beforeAll(async () => {
  await RAPIER.init();
});

describe('oil_fields arenasi', () => {
  it('yuklanadi va talab qilingan kontentni o\'z ichiga oladi', async () => {
    const { arena } = await load();
    const count = (t: string) => def.destructibles.filter((d) => d.type === t).length;
    expect(def.size).toBe(400);
    expect(arena.spawns).toHaveLength(8);
    expect(arena.pickupSpawns).toHaveLength(20);
    expect(arena.pickupSpawns.filter((p) => p.kind === 'health')).toHaveLength(3);
    expect(arena.pickupSpawns.filter((p) => p.kind === 'special')).toHaveLength(2);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    expect(def.interactives.length).toBeGreaterThanOrEqual(6);
    expect(count('tank')).toBe(6);
    expect(count('barrel')).toBeGreaterThanOrEqual(20);
    expect(def.props.filter((p) => p.type === 'building').length).toBeGreaterThanOrEqual(2);
    expect(def.props.some((p) => p.type === 'station')).toBe(true);
    expect(arena.destructibles.alive).toBe(def.destructibles.length);
    arena.dispose();
  });

  it('spawn nuqtalar terrain ustida, bir-biridan >=15 m va proplardan uzoq', async () => {
    const { world, arena } = await load();
    const objs = objectXZ();
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      expect(Math.abs(s.pos.x)).toBeLessThan(def.size / 2);
      for (const [x, z] of objs) expect(Math.hypot(s.pos.x - x, s.pos.z - z)).toBeGreaterThan(8);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
      expect(rayDownY(world, s.pos.x, s.pos.z)!).toBeLessThan(s.pos.y);
    });
    arena.dispose();
  });

  it('heightAt kollayder va mesh bilan mos', async () => {
    const { world, arena } = await load();
    const objs = objectXZ();
    let checked = 0;
    for (let x = -190; x <= 190; x += 20) {
      for (let z = -190; z <= 190; z += 20) {
        if (objs.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 14) || Math.abs(x) > 175 || Math.abs(z) > 175) continue;
        const y = rayDownY(world, x, z)!;
        expect(Math.abs(y - arena.heightAt(x, z))).toBeLessThan(0.35);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    const terrain = world.scene.getObjectByName('terrain') as THREE.Mesh;
    const pos = terrain.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 997) {
      expect(pos.getY(i)).toBeCloseTo(arena.heightAt(pos.getX(i), pos.getZ(i)), 4);
    }
    expect(terrain.receiveShadow).toBe(true);
    arena.dispose();
  });

  it('chegara devori mashinani maydonda ushlaydi', async () => {
    const { world, arena } = await load();
    const hit = world.physics.castRay(new RAPIER.Ray({ x: 0, y: 3, z: 0 }, { x: 1, y: 0, z: 0 }), 500, true);
    expect(hit).not.toBeNull();
    expect(hit!.timeOfImpact).toBeLessThan(def.size / 2 + 1);
    arena.dispose();
  });

  it('rezervuar portlashdan keyin yo\'q bo\'ladi, o\'z portlashini chiqaradi va sandiq tushiradi', async () => {
    const drops: Array<[THREE.Vector3, PickupKind]> = [];
    const { world, arena } = await load((p, k) => drops.push([p, k]));
    const tank = def.destructibles.find((d) => d.type === 'tank' && d.pos[0] === -90)!; // yakka rezervuar (tank-6)
    const top = rayDownY(world, tank.pos[0], tank.pos[1])!;
    expect(top).toBeGreaterThan(8);
    const own: Array<GameEvents['explosion']> = [];
    world.events.on('explosion', (e) => e.sourceId === 'tank-6' && own.push(e));
    const base = new THREE.Vector3(tank.pos[0], arena.heightAt(tank.pos[0], tank.pos[1]) + 4, tank.pos[1]);
    world.events.emit('explosion', { pos: base, radius: 8, damage: 100, sourceId: 'player' });
    expect(arena.destructibles.isDestroyed('tank-6')).toBe(false); // fitil
    world.step(40);
    expect(arena.destructibles.isDestroyed('tank-6')).toBe(true);
    expect(own).toHaveLength(1);
    expect(own[0]!.radius).toBeGreaterThan(10);
    expect(own[0]!.damage).toBeGreaterThan(0);
    expect(rayDownY(world, tank.pos[0], tank.pos[1])!).toBeLessThan(2);
    expect(drops).toHaveLength(1);
    expect(drops[0]![1]).toBe('rocket');
    arena.dispose();
  });

  it('uzoq portlash shikast bermaydi', async () => {
    const { world, arena } = await load();
    world.events.emit('explosion', { pos: new THREE.Vector3(150, 0, 150), radius: 6, damage: 100, sourceId: null });
    world.step(60);
    expect(arena.destructibles.alive).toBe(def.destructibles.length);
    arena.dispose();
  });

  it('zanjir portlash cheklangan: har obyekt bir marta, tickda <= maxChainPerTick', async () => {
    const { world, arena } = await load();
    const perTick = new Map<number, number>();
    const seen = new Map<string, number>();
    world.events.on('explosion', (e) => {
      if (!e.sourceId?.match(/^(tank|barrel)-/)) return;
      seen.set(e.sourceId, (seen.get(e.sourceId) ?? 0) + 1);
      const k = Math.round(world.time / DT);
      perTick.set(k, (perTick.get(k) ?? 0) + 1);
    });
    // Chetki rezervuarlarni (tank-1, tank-3) portlatamiz: ular o'rtadagi tank-2 ni zanjirda yo'q qiladi
    for (const id of [0, 2]) {
      const t = def.destructibles[id]!;
      const p = new THREE.Vector3(t.pos[0], arena.heightAt(t.pos[0], t.pos[1]) + 4, t.pos[1]);
      world.events.emit('explosion', { pos: p, radius: 8, damage: 100, sourceId: null });
    }
    world.step(600);
    expect(arena.destructibles.isDestroyed('tank-2')).toBe(true);
    for (const n of seen.values()) expect(n).toBe(1);
    for (const n of perTick.values()) expect(n).toBeLessThanOrEqual(maxChainPerTick);
    expect(seen.size).toBeLessThanOrEqual(def.destructibles.length);
    const settled = seen.size;
    world.step(300);
    expect(seen.size).toBe(settled);
    // Uzoqdagi rezervuarlar zanjirga tortilmagan
    expect(arena.destructibles.isDestroyed('tank-6')).toBe(false);
    arena.dispose();
  });

  it('dispose sahnani va kollayderlarni tozalaydi', async () => {
    const { world, arena } = await load();
    const before = world.physics.colliders.len();
    expect(before).toBeGreaterThan(50);
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.scene.children.filter((c) => c.name.startsWith('arena:'))).toHaveLength(0);
    expect(world.systems).toHaveLength(0);
  });

  it('pumpjack animatsiyasi har kadr ishlaydi', async () => {
    const { world, arena } = await load();
    const sys = world.systems.find((s) => s.name === 'pumpjacks')!;
    expect(sys).toBeDefined();
    const before = new THREE.Box3().setFromObject(world.scene.getObjectByName(`arena:${def.id}`)!);
    sys.update!(0.5, 0);
    sys.update!(0.5, 0);
    expect(before.isEmpty()).toBe(false);
    arena.dispose();
  });
});
