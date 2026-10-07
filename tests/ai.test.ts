import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { BotController } from '../src/ai/botController';
import { blendLead, chooseWeapon, leadPoint, pickCombo } from '../src/ai/aim';
import { aiProfile, difficultyCfg, steeringCfg, utilityCfg, type AiProfile } from '../src/ai/config';
import { avoidSteer, headingError, seek, StuckDetector, type Drive } from '../src/ai/steering';
import { decide, type UtilContext } from '../src/ai/utility';
import type { Controller, GameEvents, GameWorld, InputState, System, VehicleHandle } from '../src/core/types';
import vehiclesJson from '../data/vehicles.json';

const DT = 1 / 60;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

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
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(300, 0.5, 300).setTranslation(0, -0.5, 0));
  }
  addSystem(s: System): void { this.systems.push(s); }
  removeSystem(s: System): void { this.systems = this.systems.filter((x) => x !== s); }
  step(n: number): void {
    for (let i = 0; i < n; i++) {
      for (const s of this.systems) s.fixedUpdate?.(DT);
      this.physics.step();
      this.time += DT;
    }
  }
}

class Pad implements Controller {
  readonly id = 'pad';
  steer = 0;
  sample(): InputState {
    return { throttle: 1, steer: this.steer, handbrake: false, fireMG: false, fireWeapon: false, fireSpecial: false, cycleWeapon: 0, rearView: false, combo: null };
  }
}

beforeAll(async () => { await RAPIER.init(); });

describe('aim', () => {
  it('lead point intercepts a moving target', () => {
    const shooter = V(0, 0, 0), target = V(40, 0, 0), vel = V(0, 0, 10), speed = 90;
    const p = leadPoint(shooter, target, vel, speed, V(0, 0, 0), 10);
    const t = p.distanceTo(shooter) / speed;
    expect(p.distanceTo(target.clone().addScaledVector(vel, t))).toBeLessThan(0.05);
    expect(p.z).toBeGreaterThan(0);
  });

  it('falls back to the target when projectile cannot catch up or speed is 0', () => {
    const target = V(20, 0, 0);
    expect(leadPoint(V(0, 0, 0), target, V(50, 0, 0), 10, V(0, 0, 0)).x).toBeCloseTo(20, 5);
    expect(leadPoint(V(0, 0, 0), target, V(0, 0, 5), 0, V(0, 0, 0)).equals(target)).toBe(true);
    expect(blendLead(target, V(20, 0, 10), 0, V(0, 0, 0)).equals(target)).toBe(true);
  });

  it('chooses weapon by range; mine only with a chaser behind', () => {
    const slots = [{ weapon: 'mortar' as const, ammo: 3 }, { weapon: 'cannon' as const, ammo: 3 }, { weapon: 'mine' as const, ammo: 3 }];
    const p: AiProfile = { aggression: 0.5, caution: 0.5, comboChance: 0, preferredWeapons: [] };
    expect(chooseWeapon(slots, 0, 100, false, p, 0.25)).toBe(0);
    expect(chooseWeapon(slots, 0, 30, false, p, 0.25)).toBe(1);
    expect(chooseWeapon(slots, 0, 10, true, p, 0.25)).toBe(2);
    expect(chooseWeapon([], 0, 10, true, p, 0.25)).toBe(-1);
  });

  it('combo is offered only for the weapon, with enough ammo', () => {
    const always = { aggression: 1, caution: 0, comboChance: 1, preferredWeapons: [] as AiProfile['preferredWeapons'] };
    const hard = difficultyCfg('hard');
    expect(pickCombo({ weapon: 'missile', ammo: 8 }, always, hard, () => 0)).toBe('missile.missile_swarm');
    expect(pickCombo({ weapon: 'missile', ammo: 1 }, always, hard, () => 0)).toBeNull();
    expect(pickCombo({ weapon: 'missile', ammo: 8 }, { ...always, comboChance: 0 }, hard, () => 0)).toBeNull();
  });
});

describe('utility', () => {
  const profile = aiProfile('rattler');
  const base = (): UtilContext => ({
    pos: V(0, 0, 0), hpFrac: 1, totalAmmo: 10, current: null,
    enemies: [{ id: 'e', pos: V(30, 0, 0), hpFrac: 1 }], pickups: [],
  });

  it('attacks at full health with ammo', () => {
    expect(decide(base(), profile, utilityCfg).action).toBe('attack');
  });
  it('evades at low hp without a health pickup', () => {
    const c = base();
    c.hpFrac = 0.1;
    expect(decide(c, aiProfile('moth'), utilityCfg).action).toBe('evade');
  });
  it('heals at low hp when a health pickup exists', () => {
    const c = base();
    c.hpFrac = 0.15;
    c.pickups = [{ pos: V(-15, 0, 0), kind: 'health', available: true }];
    const d = decide(c, profile, utilityCfg);
    expect(d.action).toBe('heal');
    expect(d.pickup).toBe(0);
  });
  it('collects when out of weapons', () => {
    const c = base();
    c.totalAmmo = 0;
    c.pickups = [{ pos: V(0, 0, 20), kind: 'rocket', available: true }, { pos: V(0, 0, 5), kind: 'rocket', available: false }];
    const d = decide(c, profile, utilityCfg);
    expect(d.action).toBe('collect');
    expect(d.pickup).toBe(0);
  });
  it('targets the weaker enemy when distances are equal', () => {
    const c = base();
    c.enemies = [{ id: 'a', pos: V(30, 0, 0), hpFrac: 1 }, { id: 'b', pos: V(0, 0, 30), hpFrac: 0.2 }];
    expect(decide(c, profile, utilityCfg).enemy).toBe(1);
  });
  it('prefers the human player over a slightly closer bot', () => {
    const c = base();
    c.enemies = [{ id: 'bot', pos: V(25, 0, 0), hpFrac: 1 }, { id: 'p1', pos: V(35, 0, 0), hpFrac: 1, human: true }];
    expect(decide(c, profile, utilityCfg).enemy).toBe(1);
  });
  it('wanders when there is nothing to do', () => {
    expect(decide({ ...base(), enemies: [] }, profile, utilityCfg).action).toBe('wander');
  });
  it('has a profile for every vehicle', () => {
    for (const v of vehiclesJson as { id: string }[]) expect(aiProfile(v.id).preferredWeapons.length).toBeGreaterThan(0);
  });
});

describe('steering', () => {
  const out: Drive = { throttle: 0, steer: 0, err: 0 };

  it('steers right (steer > 0) toward a target on the vehicle right, using real forward()', () => {
    for (const yaw of [0, 1.1, Math.PI, -2.3]) {
      const world = new FakeWorld();
      const v = spawnVehicle(world as unknown as GameWorld, vehicleDef('rattler'), new Pad(), { x: 5, y: 1, z: -3 }, yaw);
      const fwd = v.forward(V(0, 0, 0));
      const pos = v.position(V(0, 0, 0));
      const right = fwd.clone().cross(V(0, 1, 0)); // haydovchining o'ngi
      seek(fwd, pos, pos.clone().addScaledVector(right, 10).addScaledVector(fwd, 10), steeringCfg, false, out);
      expect(out.steer).toBeGreaterThan(0.2);
      seek(fwd, pos, pos.clone().addScaledVector(right, -10).addScaledVector(fwd, 10), steeringCfg, false, out);
      expect(out.steer).toBeLessThan(-0.2);
    }
  });

  it('physical steer > 0 reduces heading error to a right-side target', () => {
    const world = new FakeWorld();
    const pad = new Pad();
    const v = spawnVehicle(world as unknown as GameWorld, vehicleDef('rattler'), pad, { x: 0, y: 1, z: 0 }, 0);
    world.step(60);
    const right = v.forward(V(0, 0, 0)).cross(V(0, 1, 0));
    const target = v.position(V(0, 0, 0)).addScaledVector(right, 40).add(V(0, 0, 40));
    const before = Math.abs(headingError(v.forward(V(0, 0, 0)), v.position(V(0, 0, 0)), target));
    pad.steer = 1;
    world.step(40);
    const after = Math.abs(headingError(v.forward(V(0, 0, 0)), v.position(V(0, 0, 0)), target));
    expect(after).toBeLessThan(before);
  });

  it('whiskers steer away from the blocked side', () => {
    const n = steeringCfg.whiskerAngles.length;
    const d = new Array<number>(n).fill(0);
    d[0] = 1; // eng chap
    const o = { steer: 0, front: 0, max: 0 };
    expect(avoidSteer(d, steeringCfg, o).steer).toBeGreaterThan(0);
    d.fill(0);
    d[n - 1] = 1;
    expect(avoidSteer(d, steeringCfg, o).steer).toBeLessThan(0);
  });

  it('stuck detector reverses, then recovers; flipped waits', () => {
    const sd = new StuckDetector();
    let mode = 'ok';
    for (let t = 0; t < steeringCfg.stuckTime + 0.1; t += DT) mode = sd.update(DT, 0, true, 1, steeringCfg);
    expect(mode).toBe('reverse');
    for (let t = 0; t < steeringCfg.reverseTime + 0.1; t += DT) mode = sd.update(DT, 5, true, 1, steeringCfg);
    expect(mode).toBe('ok');
    expect(sd.update(DT, 0, true, 0.1, steeringCfg)).toBe('flipped');
  });
});

describe('BotController', () => {
  it('drives toward an enemy, fires, and stays alive within budget', () => {
    const world = new FakeWorld();
    const gw = world as unknown as GameWorld;
    let me: VehicleHandle | undefined;
    const bot = new BotController(gw, () => me, { profile: 'rattler', difficulty: 'hard' });
    me = spawnVehicle(gw, vehicleDef('rattler'), bot, { x: 0, y: 1, z: 0 }, 0);
    me.inventory.slots.push({ weapon: 'rocket', ammo: 12 });
    const dummy = spawnVehicle(gw, vehicleDef('van'), { id: 'd', sample: () => ({ throttle: 0, steer: 0, handbrake: false, fireMG: false, fireWeapon: false, fireSpecial: false, cycleWeapon: 0, rearView: false, combo: null }) }, { x: 10, y: 1, z: 60 }, Math.PI);
    const start = me.position(V(0, 0, 0)).distanceTo(dummy.position(V(0, 0, 0)));
    let fired = false;
    world.events.on('fire', () => { fired = true; });
    const t0 = performance.now();
    for (let i = 0; i < 600; i++) {
      world.step(1);
      if (me.input.fireMG || me.input.fireWeapon) fired = true;
    }
    const ms = performance.now() - t0;
    expect(me.position(V(0, 0, 0)).distanceTo(dummy.position(V(0, 0, 0)))).toBeLessThan(start);
    expect(fired).toBe(true);
    expect(ms / 600).toBeLessThan(5); // butun fizika+bot kadri
    const t1 = performance.now();
    for (let i = 0; i < 600; i++) bot.sample(DT);
    expect((performance.now() - t1) / 600).toBeLessThan(0.5); // bot byudjeti: kadrga <= 0.5 ms
  });
});
