import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef, vehicles, weapons } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { DamageSystem } from '../src/vehicles/damage';
import { PickupSystem, type PickupSpawn } from '../src/weapons/pickups';
import { WeaponSystem } from '../src/weapons/weaponSystem';
import type { Controller, GameEvents, GameWorld, InputState, System, VehicleHandle, WeaponId } from '../src/core/types';

const DT = 1 / 60;

class FakeWorld {
  readonly rapier = RAPIER;
  readonly physics: RAPIER.World;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly renderer = {} as THREE.WebGLRenderer;
  readonly events = new EventBus<GameEvents>();
  readonly vehicles: VehicleHandle[] = [];
  time = 0;
  private systems: System[] = [];

  constructor() {
    this.physics = new RAPIER.World({ x: 0, y: -9.81 * 1.6, z: 0 });
    this.physics.timestep = DT;
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(300, 0.5, 300).setTranslation(0, -0.5, 0).setCollisionGroups((1 << 16) | 0xffff));
  }
  addSystem(s: System): void {
    this.systems.push(s);
  }
  removeSystem(s: System): void {
    this.systems = this.systems.filter((x) => x !== s);
  }
  step(n: number): void {
    for (let i = 0; i < n; i++) {
      for (const s of this.systems) s.fixedUpdate?.(DT);
      this.physics.step();
      this.time += DT;
    }
  }
}

/** Tugmalar qo'lda boshqariladi; edge (fireWeapon) bir sample dan keyin tozalanadi. */
class Pad implements Controller {
  readonly id = 'pad';
  mg = false;
  fire = false;
  cycle: -1 | 0 | 1 = 0;
  sample(): InputState {
    const s: InputState = {
      throttle: 0, steer: 0, handbrake: false, fireMG: this.mg, fireWeapon: this.fire,
      fireSpecial: false, cycleWeapon: this.cycle, rearView: false, combo: null,
    };
    this.fire = false;
    this.cycle = 0;
    return s;
  }
}

const idle: Controller = { id: 'idle', sample: () => ({ ...new Pad().sample() }) };

const setup = () => {
  const world = new FakeWorld();
  const gw = world as unknown as GameWorld;
  const pad = new Pad();
  const me = spawnVehicle(gw, vehicleDef('rattler'), pad, { x: 0, y: 1, z: 0 }, 0);
  const fwd = me.forward(new THREE.Vector3());
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  const at = (f: number, s = 0) => ({ x: fwd.x * f + side.x * s, y: 1, z: fwd.z * f + side.z * s });
  const target = (f: number, s = 0, id = 'jefferson') => spawnVehicle(gw, vehicleDef(id), idle, at(f, s), 0);
  const dmg = new DamageSystem(gw);
  const ws = new WeaponSystem(gw);
  world.addSystem(ws);
  world.step(60); // mashinalar o'rnashsin
  const events: Record<string, unknown[]> = { damage: [], explosion: [], fire: [], pickup: [] };
  for (const k of Object.keys(events)) world.events.on(k as 'damage', (e) => events[k].push(e));
  return { world, gw, pad, me, fwd, side, at, target, dmg, ws, events };
};
const give = (v: VehicleHandle, weapon: WeaponId, ammo = weapons[weapon].ammoPerPickup) => v.inventory.slots.push({ weapon, ammo });
const hits = (events: Record<string, unknown[]>, targetId: string, weapon: string) =>
  (events.damage as GameEvents['damage'][]).filter((d) => d.targetId === targetId && d.weapon === weapon);

beforeAll(async () => {
  await RAPIER.init();
});

describe('weapons', () => {
  it('rocket flies straight and damages target', () => {
    const { world, pad, me, target, events } = setup();
    const t = target(30);
    give(me, 'rocket');
    world.step(5);
    pad.fire = true;
    world.step(70);
    const d = hits(events, t.id, 'rocket');
    expect(d.length).toBe(1);
    expect(d[0].amount).toBe(weapons.rocket.damage);
    expect(d[0].sourceId).toBe(me.id);
    expect(me.inventory.slots[0].ammo).toBe(weapons.rocket.ammoPerPickup - 1);
  });

  it('missile curves into a lateral target; rocket misses it', () => {
    const run = (w: WeaponId) => {
      const { world, pad, me, target, side, events } = setup();
      const t = target(28, 8);
      give(me, w);
      world.step(5);
      pad.fire = true;
      for (let i = 0; i < 100; i++) {
        t.body.setLinvel({ x: side.x * 4, y: 0, z: side.z * 4 }, true);
        world.step(1);
      }
      return hits(events, t.id, w).length;
    };
    expect(run('missile')).toBeGreaterThan(0);
    expect(run('rocket')).toBe(0);
  });

  it('missile homing rate is damped by target avoidance', () => {
    const rate = (id: string) => {
      const { me, target, ws, world, pad } = setup();
      target(25, 0, id);
      const rates: number[] = [];
      const orig = ws.projectiles.spawn.bind(ws.projectiles);
      ws.projectiles.spawn = (o) => (rates.push(o.homing?.rate ?? -1), orig(o));
      give(me, 'missile');
      pad.fire = true;
      world.step(2);
      return rates[0];
    };
    const byAvoid = [...vehicles].sort((x, y) => x.stats.avoidance - y.stats.avoidance);
    const lo = rate(byAvoid[0].id);
    const hi = rate(byAvoid[byAvoid.length - 1].id);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeLessThan(lo);
  });

  it('cannon hit pushes the target back', () => {
    const { world, pad, me, target, fwd } = setup();
    const t = target(25);
    give(me, 'cannon');
    pad.fire = true;
    let peak = -Infinity;
    for (let i = 0; i < 40; i++) {
      world.step(1);
      const v = t.body.linvel();
      peak = Math.max(peak, v.x * fwd.x + v.z * fwd.z);
    }
    expect(peak).toBeGreaterThan(2);
  });

  it('mortar follows a ballistic arc and explodes on the ground', () => {
    const { world, pad, me, fwd, events } = setup();
    give(me, 'mortar');
    pad.fire = true;
    world.step(240);
    const ex = events.explosion as GameEvents['explosion'][];
    expect(ex.length).toBe(1);
    const range = ex[0].pos.x * fwd.x + ex[0].pos.z * fwd.z;
    expect(range).toBeGreaterThan(35);
    expect(range).toBeLessThan(75);
    expect(ex[0].pos.y).toBeLessThan(1);
  });

  it('mine is thrown backwards and detonates on proximity', () => {
    const { world, pad, me, fwd, events } = setup();
    const t = spawnVehicle(world as unknown as GameWorld, vehicleDef('van'), idle, { x: 0, y: 1, z: 0 }, 0);
    t.body.setTranslation({ x: 500, y: 1, z: 500 }, true);
    give(me, 'mine');
    pad.fire = true;
    world.step(150);
    expect(events.explosion.length).toBe(0);
    const behind = me.position(new THREE.Vector3()).addScaledVector(fwd, -5.5);
    t.body.setTranslation({ x: behind.x, y: 1, z: behind.z }, true);
    world.step(10);
    expect(events.explosion.length).toBe(1);
  });

  it('machine gun hitscan damages target with infinite ammo', () => {
    const { world, pad, me, target, events } = setup();
    const t = target(20);
    pad.mg = true;
    world.step(60);
    expect(hits(events, t.id, 'mg').length).toBeGreaterThan(5);
    expect(me.inventory.slots.length).toBe(0);
  });

  it('cooldown limits fire rate and empty slot is removed', () => {
    const { world, pad, me } = setup();
    give(me, 'rocket', 2);
    for (let i = 0; i < 10; i++) {
      pad.fire = true;
      world.step(1);
    }
    expect(me.inventory.slots[0].ammo).toBe(1);
    world.step(Math.ceil(weapons.rocket.cooldown / DT));
    pad.fire = true;
    world.step(1);
    expect(me.inventory.slots.length).toBe(0);
  });

  it('cycleWeapon rotates selected slot', () => {
    const { world, pad, me } = setup();
    give(me, 'rocket');
    give(me, 'cannon');
    pad.cycle = 1;
    world.step(1);
    expect(me.inventory.selected).toBe(1);
    pad.cycle = 1;
    world.step(1);
    expect(me.inventory.selected).toBe(0);
  });
});

describe('pickups', () => {
  it('adds ammo to existing slot, caps at 3 slots, leaves crate when full', () => {
    const { world, gw, me, events } = setup();
    const p = (kind: PickupSpawn['kind']): PickupSpawn => ({ pos: [0, 0, 0], kind });
    const ps = new PickupSystem(gw, [p('rocket'), p('rocket'), p('missile'), p('mortar'), p('cannon')]);
    world.addSystem(ps);
    world.step(3);
    const s = me.inventory.slots;
    expect(s.length).toBe(3);
    expect(s.find((x) => x.weapon === 'rocket')?.ammo).toBe(weapons.rocket.ammoPerPickup * 2);
    expect(events.pickup.length).toBe(4);
    expect(ps.isAvailable(4)).toBe(true);
    expect(ps.isAvailable(0)).toBe(false);
  });

  it('drop(): bir martalik sandiq, olinguncha qoladi, respawn yo\'q, maxDropped bilan cheklangan', () => {
    const { world, gw, me, events } = setup();
    const ps = new PickupSystem(gw, []);
    world.addSystem(ps);
    ps.drop(new THREE.Vector3(500, 0, 500), 'rocket');
    world.step(5 * 60);
    expect(ps.droppedCount).toBe(1);
    ps.drop(new THREE.Vector3(0, 0, 0), 'rocket');
    world.step(3);
    expect(events.pickup.length).toBe(1);
    expect(ps.droppedCount).toBe(1);
    world.step(30 * 60);
    expect(ps.droppedCount).toBe(1);
    for (let i = 0; i < 20; i++) ps.drop(new THREE.Vector3(500 + i, 0, 500), 'mine');
    expect(ps.droppedCount).toBeLessThanOrEqual(8);
    expect(me.inventory.slots.length).toBeGreaterThan(0);
  });

  it('health heals only when damaged; crate respawns after timer', () => {
    const { world, gw, me, events } = setup();
    const ps = new PickupSystem(gw, [{ pos: [0, 0, 0], kind: 'health' }]);
    world.addSystem(ps);
    world.step(3);
    expect(events.pickup.length).toBe(0);
    me.hp = me.maxHp * 0.2;
    world.step(2);
    expect(me.hp).toBeGreaterThan(me.maxHp * 0.5);
    expect(events.pickup.length).toBe(1);
    expect(ps.isAvailable(0)).toBe(false);
    world.step(25 * 60);
    expect(ps.isAvailable(0)).toBe(true);
  });
});
