import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { combos, vehicleDef } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { DamageSystem } from '../src/vehicles/damage';
import { WeaponSystem } from '../src/weapons/weaponSystem';
import { WhammySystem } from '../src/weapons/whammy';
import { SPECIALS } from '../src/weapons/specials';
import scoring from '../data/scoring.json';
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

/** combo / fireMG qo'lda boshqariladi; combo bir sample dan keyin tozalanadi. */
class Pad implements Controller {
  readonly id = 'pad';
  mg = false;
  combo: string | null = null;
  sample(): InputState {
    const s: InputState = {
      throttle: 0, steer: 0, handbrake: false, fireMG: this.mg, fireWeapon: false,
      fireSpecial: false, cycleWeapon: 0, rearView: false, combo: this.combo,
    };
    this.combo = null;
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
  const target = (f: number) => spawnVehicle(gw, vehicleDef('jefferson'), idle, { x: fwd.x * f, y: 1, z: fwd.z * f }, 0);
  const dmg = new DamageSystem(gw);
  const ws = new WeaponSystem(gw);
  world.addSystem(ws);
  world.step(60);
  const fires: GameEvents['fire'][] = [];
  world.events.on('fire', (e) => fires.push(e));
  return { world, gw, pad, me, fwd, target, dmg, ws, fires };
};

const give = (v: VehicleHandle, weapon: WeaponId, ammo: number) => v.inventory.slots.push({ weapon, ammo });
const cost = (id: string) => combos.find((c) => c.id === id)!.ammoCost;

beforeAll(async () => {
  await RAPIER.init();
});

describe('special moves', () => {
  it('registry covers every combo in combos.json', () => {
    expect(combos.length).toBe(15);
    for (const c of combos) expect(SPECIALS.has(c.id)).toBe(true);
  });

  it('afterburner boosts speed, spends ammo and emits fire with the combo id', () => {
    const { world, pad, me, fires } = setup();
    give(me, 'missile', 8);
    const before = me.speed();
    pad.combo = 'missile.afterburner';
    let peak = 0;
    for (let i = 0; i < 30; i++) {
      world.step(1);
      peak = Math.max(peak, me.speed());
    }
    expect(peak).toBeGreaterThan(before + 5);
    expect(me.inventory.slots[0].ammo).toBe(8 - cost('missile.afterburner'));
    expect(fires.map((f) => f.weapon)).toContain('missile.afterburner');
  });

  it('insufficient ammo or missing weapon: combo is skipped and the machine gun fires', () => {
    const { world, pad, me, fires } = setup();
    give(me, 'missile', cost('missile.afterburner') - 1);
    pad.mg = true;
    pad.combo = 'missile.afterburner';
    world.step(2);
    expect(me.inventory.slots[0].ammo).toBe(cost('missile.afterburner') - 1);
    expect(fires.map((f) => f.weapon)).toEqual(['mg']);
    const other = setup();
    other.pad.mg = true;
    other.pad.combo = 'cannon.buckshot';
    other.world.step(2);
    expect(other.fires.map((f) => f.weapon)).toEqual(['mg']);
  });

  it('a successful combo suppresses the machine gun that tick', () => {
    const { world, pad, me, fires } = setup();
    give(me, 'cannon', 6);
    pad.mg = true;
    pad.combo = 'cannon.buckshot';
    world.step(1);
    expect(fires.map((f) => f.weapon)).toEqual(['cannon.buckshot']);
    expect(me.inventory.slots[0].ammo).toBe(6 - cost('cannon.buckshot'));
  });

  it('spending the last ammo removes the slot', () => {
    const { world, pad, me } = setup();
    give(me, 'rocket', cost('rocket.stampede'));
    pad.combo = 'rocket.stampede';
    world.step(1);
    expect(me.inventory.slots.length).toBe(0);
  });

  it('stampede and swarm and buckshot launch several projectiles at once', () => {
    for (const [weapon, id, min] of [['rocket', 'rocket.stampede', 5], ['missile', 'missile.missile_swarm', 4], ['cannon', 'cannon.buckshot', 5]] as const) {
      const { world, pad, me, ws } = setup();
      give(me, weapon, 10);
      pad.combo = id;
      world.step(1);
      expect(ws.projectiles.activeCount).toBeGreaterThanOrEqual(min);
    }
  });

  it('tire buster stalls the target', () => {
    const { world, pad, me, target } = setup();
    const t = target(25);
    give(me, 'mortar', 5);
    world.events.on('explosion', (e) => t.body.setTranslation({ x: e.pos.x, y: 1, z: e.pos.z }, true));
    pad.combo = 'mortar.tire_buster';
    world.step(200);
    expect(t.stalled).toBeGreaterThan(0);
  });

  it('halo decoy absorbs a missile homing on the owner', () => {
    const { world, gw, me, ws, fwd } = setup();
    const enemy = spawnVehicle(gw, vehicleDef('jefferson'), idle, { x: fwd.x * 40, y: 1, z: fwd.z * 40 }, 0);
    ws.projectiles.spawn({
      weapon: 'missile', owner: enemy, pos: new THREE.Vector3(fwd.x * 30, 1.3, fwd.z * 30),
      vel: new THREE.Vector3(-fwd.x * 20, 0, -fwd.z * 20), homing: { target: me, rate: 2 },
    });
    give(me, 'missile', 3);
    const hp = me.hp;
    (me.controller as Pad).combo = 'missile.halo_decoy';
    world.step(200);
    expect(me.hp).toBe(hp);
    expect(ws.projectiles.activeCount).toBe(0);
  });

  it('ricochet bounces off a wall instead of exploding', () => {
    const { world, pad, me, fwd, ws } = setup();
    const half = { x: Math.abs(fwd.z) * 20 + Math.abs(fwd.x) * 0.5, z: Math.abs(fwd.x) * 20 + Math.abs(fwd.z) * 0.5 };
    world.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(half.x, 5, half.z).setTranslation(fwd.x * 30, 2, fwd.z * 30).setCollisionGroups((1 << 16) | 0xffff),
    );
    give(me, 'cannon', 6);
    pad.combo = 'cannon.ricochet';
    let exploded = 0;
    world.events.on('explosion', () => exploded++);
    world.step(40);
    expect(exploded).toBe(0);
    expect(ws.projectiles.activeCount).toBe(1);
  });
});

describe('whammy', () => {
  const make = () => {
    const events = new EventBus<GameEvents>();
    const world = { events, time: 0 } as unknown as GameWorld;
    const wh = new WhammySystem(world);
    const out: GameEvents['whammy'][] = [];
    events.on('whammy', (e) => out.push(e));
    const hit = (weapon: string, source = 'a', target = 'b') => events.emit('damage', { targetId: target, sourceId: source, amount: 5, weapon });
    return { world, wh, out, hit, events };
  };

  it('two different weapons within the window emit whammy', () => {
    const { world, out, hit, wh } = make();
    hit('rocket');
    world.time = 0.2;
    hit('mg');
    expect(out).toEqual([{ sourceId: 'a', targetId: 'b', count: 2 }]);
    expect(wh.score('a')).toBe(2 * scoring.whammy.bonusPerCount);
  });

  it('combo ids count as distinct weapons', () => {
    const { world, out, hit } = make();
    hit('cannon');
    world.time = 0.1;
    hit('cannon.buckshot');
    expect(out.length).toBe(1);
  });

  it('the same weapon repeatedly does not emit', () => {
    const { world, out, hit } = make();
    for (let i = 0; i < 5; i++) {
      world.time = i * 0.05;
      hit('rocket');
    }
    expect(out.length).toBe(0);
  });

  it('hits outside the window do not combine', () => {
    const { world, out, hit } = make();
    hit('rocket');
    world.time = (scoring.whammy.windowMs + 100) / 1000;
    hit('mg');
    expect(out.length).toBe(0);
  });

  it('count grows with more weapons, is capped, and splash damage is ignored', () => {
    const { world, out, hit } = make();
    for (const [i, w] of ['mg', 'rocket', 'missile', 'mortar', 'cannon', 'mine', 'cannon.ricochet', 'explosion'].entries()) {
      world.time = i * 0.01;
      hit(w);
    }
    expect(out.map((e) => e.count)).toEqual([2, 3, 4, 5, 6]);
  });

  it('different victims are tracked separately; kills score', () => {
    const { out, hit, events, wh } = make();
    hit('rocket', 'a', 'b');
    hit('mg', 'a', 'c');
    expect(out.length).toBe(0);
    events.emit('destroyed', { targetId: 'b', sourceId: 'a' });
    expect(wh.score('a')).toBe(scoring.kill);
    expect(wh.score('b')).toBe(0);
  });
});
