import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef } from '../src/core/data';
import { findHitTarget } from '../src/core/hitTargets';
import { loadArena } from '../src/levels/loader';
import { arenaDef, isAvailable } from '../src/levels/registry';
import { JackpotSystem } from '../src/levels/jackpot';
import { CasinoDecoSystem } from '../src/levels/rouletteSign';
import { garageRamp } from '../src/levels/props/parkingGarage';
import type { Arena, ArenaDef, PropDef } from '../src/levels/types';
import { spawnVehicle } from '../src/vehicles/vehicle';
import type { Controller, GameEvents, GameWorld, InputState, PickupKind, System, VehicleHandle } from '../src/core/types';
import casino from '../data/levels/casino.json';
import casinoCity from '../data/levels/casino_city.json';
import destructibles from '../data/levels/destructibles.json';

const DT = 1 / 60;
const def = casinoCity as unknown as ArenaDef;

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

type Drop = { pos: THREE.Vector3; kind: PickupKind };
async function load(drops?: Drop[]): Promise<{ world: FakeWorld; arena: Arena }> {
  const world = new FakeWorld();
  const arena = await loadArena(world as unknown as GameWorld, def, { onDrop: (pos, kind) => drops?.push({ pos, kind }) });
  world.step(1);
  return { world, arena };
}

const sys = <T>(w: FakeWorld, name: string): T => w.systems.find((s) => s.name === name) as unknown as T;
const car = (world: FakeWorld, arena: Arena, x: number, z: number, yaw: number, speed: number, y?: number): { v: VehicleHandle; pad: Pad } => {
  const pad = new Pad();
  const v = spawnVehicle(world as unknown as GameWorld, vehicleDef('rattler'), pad, { x, y: y ?? arena.heightAt(x, z) + 0.9, z }, yaw);
  v.body.setLinvel({ x: Math.sin(yaw) * speed, y: 0, z: Math.cos(yaw) * speed }, true);
  return { v, pad };
};
const park = (world: FakeWorld, v: VehicleHandle): void => {
  world.systems = world.systems.filter((s) => s !== (v as unknown as System));
  v.body.setTranslation({ x: 0, y: -80, z: 0 }, true);
};
const maxSlope = (a: Arena, x: number, z: number): number =>
  Math.max(Math.abs(a.heightAt(x + 4, z) - a.heightAt(x - 4, z)), Math.abs(a.heightAt(x, z + 4) - a.heightAt(x, z - 4))) / 8;
/** Yuqoridan pastga nur: birinchi urilgan kollayder (handle, balandlik) */
const probe = (w: FakeWorld, x: number, z: number, fromY = 30): { handle: number; y: number } | null => {
  const hit = w.physics.castRay(new RAPIER.Ray({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }), 60, true);
  return hit ? { handle: hit.collider.handle, y: fromY - hit.timeOfImpact } : null;
};

beforeAll(async () => {
  await RAPIER.init();
});

describe('casino_city arenasi', () => {
  it('registry da mavjud; yuklanadi; spawnlar >=15 m oraliqda, tekis, binolardan uzoq; tozalanadi', async () => {
    expect(isAvailable('casino_city')).toBe(true);
    expect(arenaDef('casino_city').id).toBe('casino_city');
    const { world, arena } = await load();
    expect(arena.spawns.length).toBeGreaterThanOrEqual(8);
    expect(new Set(arena.pickupSpawns.map((p) => p.kind)).size).toBe(7);
    for (const t of ['casinoTower', 'garage', 'parkedCar', 'palmTree', 'motel', 'chapel', 'fountain', 'rouletteSign', 'station', 'strip']) {
      expect(def.props.some((p) => p.type === t)).toBe(true);
    }
    for (const t of ['neonSign', 'explosiveCar', 'fuelTank']) expect(def.destructibles.some((d) => d.type === t)).toBe(true);
    expect(def.props.filter((p) => p.type === 'palmTree').length).toBeGreaterThan(50);
    expect(def.props.filter((p) => p.type === 'casinoTower' && p.variant === 'slab').length).toBeGreaterThan(0);
    expect(new Set(def.props.filter((p) => p.type === 'casinoTower').map((p) => p.variant)).size).toBe(3);
    const solid = def.props.filter((p) => ['casinoTower', 'garage', 'motel', 'chapel', 'station', 'fountain'].includes(p.type));
    arena.spawns.forEach((s, i) => {
      expect(s.pos.y).toBeCloseTo(arena.heightAt(s.pos.x, s.pos.z) + def.spawnLift, 5);
      expect(maxSlope(arena, s.pos.x, s.pos.z)).toBeLessThan(0.08);
      for (const p of solid) expect(Math.hypot(s.pos.x - p.pos[0], s.pos.z - p.pos[1])).toBeGreaterThan(14);
      for (const d of def.destructibles) expect(Math.hypot(s.pos.x - d.pos[0], s.pos.z - d.pos[1])).toBeGreaterThan(8);
      for (let j = i + 1; j < arena.spawns.length; j++) expect(s.pos.distanceTo(arena.spawns[j]!.pos)).toBeGreaterThanOrEqual(15);
    });
    expect(def.environment?.fog?.color).toBeDefined();
    // Unumdorlik: sahnadagi alohida chizilishi mumkin bo'lgan meshlar soni (draw call ga yaqin) cheklangan
    let meshes = 0;
    world.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.visible) meshes++;
    });
    expect(meshes).toBeLessThan(450);
    arena.dispose();
    expect(world.physics.colliders.len()).toBe(0);
    expect(world.physics.bodies.len()).toBe(0);
  });

  it('neon viveska otilsa sinadi: kollayder olib tashlanadi, kichik uchqun portlashi, hitscan orqali ham', async () => {
    const { world, arena } = await load();
    const cfg = destructibles.types.neonSign;
    const signs = def.destructibles.filter((d) => d.type === 'neonSign');
    const [a, b] = [signs[0]!, signs[1]!];
    const n0 = world.physics.colliders.len();
    const blasts: GameEvents['explosion'][] = [];
    world.events.on('explosion', (e) => e.sourceId?.startsWith('neonSign') && blasts.push(e));
    // Hitscan: ustun kollayderiga nur -> hitTarget.damage
    const hit = probe(world, a.pos[0], a.pos[1], 2.5)!;
    expect(hit).not.toBeNull();
    const target = findHitTarget(world as unknown as GameWorld, hit.handle)!;
    expect(target.id).toBe('neonSign-1');
    target.damage(100, 'p1', 'rocket');
    world.events.emit('damage', { targetId: 'neonSign-2', sourceId: 'p1', amount: 100, weapon: 'rocket' });
    world.step(30);
    expect(arena.destructibles.isDestroyed('neonSign-1')).toBe(true);
    expect(arena.destructibles.isDestroyed(`neonSign-2`)).toBe(true);
    expect(world.physics.colliders.len()).toBe(n0 - 2);
    expect(probe(world, a.pos[0], a.pos[1], 2.5)?.y ?? -1).toBeLessThan(0.5); // faqat yer
    expect(blasts).toHaveLength(2);
    expect(blasts[0]!.radius).toBe(cfg.explosion.radius);
    expect(cfg.explosion.damage).toBeLessThanOrEqual(8);
    expect(b.type).toBe('neonSign');
    arena.dispose();
  });

  it('portlovchi mashina: otilsa portlaydi va yaqin neon/mashinalarga zanjir', async () => {
    const { world, arena } = await load();
    world.events.emit('damage', { targetId: 'explosiveCar-1', sourceId: null, amount: 100, weapon: 'rocket' });
    world.step(40);
    expect(arena.destructibles.isDestroyed('explosiveCar-1')).toBe(true);
    expect(arena.destructibles.alive).toBeLessThan(def.destructibles.length);
    arena.dispose();
  });

  it('garaj pandusi: qiyalik mashina chiqa oladigan, kollayder balandligi tomgacha ko\'tariladi; mashina tomga chiqadi', async () => {
    const { world, arena } = await load();
    const g = def.props.find((p) => p.type === 'garage') as PropDef;
    const { rampLen, height, angle } = garageRamp(g);
    expect(Math.tan(angle)).toBeLessThan(0.2);
    // Dunyo koordinatalari: yaw=pi/2 -> lokal +x = dunyo -z, pandus pastki uchi z0
    expect(g.yaw).toBeCloseTo(Math.PI / 2, 3);
    const [gx, gz] = g.pos;
    const half = (g.size?.[0] ?? casino.garage.size[0]) / 2;
    const zBottom = gz - (half + rampLen);
    const zTop = gz - half;
    const hs: number[] = [];
    for (let z = zBottom + 0.5; z < zTop - 0.2; z += 1.5) hs.push(probe(world, gx, z)!.y);
    for (let i = 1; i < hs.length; i++) {
      expect(hs[i]! - hs[i - 1]!).toBeGreaterThan(0);
      expect((hs[i]! - hs[i - 1]!) / 1.5).toBeLessThan(0.2);
    }
    expect(hs[0]!).toBeLessThan(0.7);
    expect(hs[hs.length - 1]!).toBeGreaterThan(height - 1.3);
    expect(probe(world, gx, gz + 4)!.y).toBeCloseTo(height, 1); // tom
    const { v, pad } = car(world, arena, gx, zBottom - 4, 0, 0);
    pad.throttle = 1;
    world.step(60 * 9);
    expect(v.body.translation().y).toBeGreaterThan(height - 0.5);
    expect(v.body.translation().z).toBeGreaterThan(zTop - 1);
    park(world, v);
    arena.dispose();
  });

  it('Jackpot: otilsa aylanadi, 3 s dan keyin 3-4 sandiq tashlaydi; cooldown paytida e\'tiborsiz, 30 s dan keyin qayta tayyor', async () => {
    const drops: Drop[] = [];
    const { world, arena } = await load(drops);
    const jp = sys<JackpotSystem>(world, 'jackpot');
    expect(jp.phase).toBe('idle');
    jp.rng = () => 0.1; // yutuq
    const m = def.interactives.find((i) => i.type === 'jackpot')!;
    const hit = probe(world, m.pos[0], m.pos[1])!;
    const target = findHitTarget(world as unknown as GameWorld, hit.handle)!;
    expect(target.id).toBe('jackpot');
    target.damage(5, 'p1', 'mg');
    expect(jp.phase).toBe('spin');
    world.step(Math.floor(60 * (casino.jackpot.spin - 0.3)));
    expect(drops).toHaveLength(0);
    expect(jp.phase).toBe('spin');
    world.step(60);
    expect(jp.phase).toBe('cooldown');
    expect(drops.length).toBeGreaterThanOrEqual(3);
    expect(drops.length).toBeLessThanOrEqual(4);
    for (const d of drops) {
      expect(d.pos.distanceTo(new THREE.Vector3(m.pos[0], d.pos.y, m.pos[1]))).toBeCloseTo(casino.jackpot.dropRadius, 1);
      expect(casino.jackpot.kinds).toContain(d.kind);
    }
    const n = drops.length;
    expect(jp.trigger()).toBe(false);
    target.damage(50, 'p1', 'rocket');
    world.step(120);
    expect(drops).toHaveLength(n);
    world.step(Math.ceil(casino.jackpot.cooldown * 60));
    expect(jp.phase).toBe('idle');
    expect(jp.spins).toBe(1);
    arena.dispose();
  });

  it('Jackpot: yutqazsa kichik portlash (sandiqsiz); \'damage\' eventi va portlash ham ishga tushiradi', async () => {
    const drops: Drop[] = [];
    const { world, arena } = await load(drops);
    const jp = sys<JackpotSystem>(world, 'jackpot');
    jp.rng = () => 0.95;
    const blasts: GameEvents['explosion'][] = [];
    world.events.on('explosion', (e) => e.sourceId === 'jackpot' && blasts.push(e));
    const m = def.interactives.find((i) => i.type === 'jackpot')!;
    world.events.emit('explosion', { pos: new THREE.Vector3(m.pos[0], 2, m.pos[1] + 4), radius: 8, damage: 30, sourceId: 'p1' });
    expect(jp.phase).toBe('spin');
    expect(jp.result).toBe('blast');
    world.step(60 * 3 + 5);
    expect(blasts).toHaveLength(1);
    expect(blasts[0]!.radius).toBe(casino.jackpot.blast.radius);
    expect(drops).toHaveLength(0);
    arena.dispose();
    // damage eventi (alohida arena)
    const again = await load(drops);
    const jp2 = sys<JackpotSystem>(again.world, 'jackpot');
    again.world.events.emit('damage', { targetId: 'jackpot', sourceId: null, amount: 1, weapon: 'rocket' });
    expect(jp2.phase).toBe('spin');
    again.arena.dispose();
  });

  it('favvora hovuzida mashina sekinlashadi (suv), yo\'lda esa emas', async () => {
    const { world, arena } = await load();
    const run = (x: number, z: number, yaw: number): number => {
      const { v } = car(world, arena, x, z, yaw, 12);
      world.step(15);
      const s0 = v.speed();
      world.step(45);
      const s1 = v.speed();
      park(world, v);
      return s1 / s0;
    };
    const w = def.water![0]!;
    const [x0, z0, x1] = w.rect!;
    expect(arena.heightAt(x0 + 3, z0 + 8)).toBeLessThan(w.y - 0.2);
    const inPool = run(x0 + 2, z0 + 1.5, 0);
    const onRoad = run(-9, -60, 0);
    expect(x1).toBeGreaterThan(x0);
    expect(inPool).toBeLessThan(0.6);
    expect(onRoad).toBeGreaterThan(0.85);
    arena.dispose();
  });

  it('dekor: ruletka/zar aylanadi; palmalar InstancedMesh (2 ta) da', async () => {
    const { world, arena } = await load();
    const deco = sys<CasinoDecoSystem>(world, 'casinoDeco');
    const before = deco.spinners.map((s) => s.holder.rotation[s.axis]);
    deco.update(0.5);
    deco.spinners.forEach((s, i) => expect(s.holder.rotation[s.axis]).toBeGreaterThan(before[i]!));
    expect(deco.spinners).toHaveLength(def.props.filter((p) => p.type === 'rouletteSign').length);
    let inst = 0;
    world.scene.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh && o.parent?.name === 'palms') inst++;
    });
    expect(inst).toBe(2);
    arena.dispose();
  });
});
