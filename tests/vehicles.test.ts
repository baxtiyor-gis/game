import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { handling, vehicleDef } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { DamageSystem } from '../src/vehicles/damage';
import type { Controller, GameEvents, GameWorld, InputState, System, VehicleHandle } from '../src/core/types';

const DT = 1 / 60;

class FakeWorld {
  readonly rapier = RAPIER;
  readonly physics: RAPIER.World;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly renderer = {} as THREE.WebGLRenderer;
  readonly events = new EventBus<GameEvents>();
  readonly vehicles: VehicleHandle[] = [];
  readonly eventQueue = new RAPIER.EventQueue(true);
  time = 0;
  private systems: System[] = [];

  constructor() {
    this.physics = new RAPIER.World({ x: 0, y: -handling.world.gravity, z: 0 });
    this.physics.timestep = DT;
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(3000, 0.5, 3000).setTranslation(0, -0.5, 0));
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
      this.physics.step(this.eventQueue);
      this.time += DT;
    }
  }
}

class Pad implements Controller {
  readonly id = 'pad';
  throttle = 0;
  steer = 0;
  handbrake = false;
  sample(): InputState {
    return {
      throttle: this.throttle, steer: this.steer, handbrake: this.handbrake, fireMG: false, fireWeapon: false,
      fireSpecial: false, cycleWeapon: 0, rearView: false, combo: null,
    };
  }
}

const spawn = (world: FakeWorld, id: string, x: number, z: number, yaw = 0) => {
  const pad = new Pad();
  const v = spawnVehicle(world as unknown as GameWorld, vehicleDef(id), pad, { x, y: 1, z }, yaw);
  return { pad, v };
};
const setup = (id = 'rattler') => {
  const world = new FakeWorld();
  return { world, ...spawn(world, id, 0, 0) };
};
const fwdSpeed = (v: VehicleHandle): number => {
  const f = v.forward(new THREE.Vector3());
  const l = v.body.linvel();
  return f.x * l.x + f.y * l.y + f.z * l.z;
};
const KMH100 = 100 / 3.6;
/** Boshlang'ich tezlikka yetguncha gaz beradi; qaytaradi: sarflangan vaqt (s). */
const timeTo = (world: FakeWorld, v: VehicleHandle, speed: number, limit = 60): number => {
  let t = 0;
  while (fwdSpeed(v) < speed && t < limit) {
    world.step(1);
    t += DT;
  }
  return t;
};

beforeAll(async () => {
  await RAPIER.init();
});


describe('vehicle physics', () => {
  it('uses real gravity', () => {
    expect(new FakeWorld().physics.gravity.y).toBeCloseTo(-9.81, 5);
  });

  it('accelerates forward on flat ground', () => {
    const { world, pad, v } = setup();
    pad.throttle = 1;
    world.step(120);
    expect(fwdSpeed(v)).toBeGreaterThan(8);
  });

  it('rattler 0-100 km/h in 5-7 s; heavy moth is far slower (F = ma, P = F*v)', () => {
    const a = setup('rattler');
    a.pad.throttle = 1;
    const tRattler = timeTo(a.world, a.v, KMH100);
    expect(tRattler).toBeGreaterThan(5);
    expect(tRattler).toBeLessThan(7);
    const b = setup('moth');
    b.pad.throttle = 1;
    const tMoth = timeTo(b.world, b.v, 20);
    const tRattler20 = (() => {
      const c = setup('rattler');
      c.pad.throttle = 1;
      return timeTo(c.world, c.v, 20);
    })();
    expect(tMoth).toBeGreaterThan(tRattler20 * 3);
  });

  it('top speed emerges from power vs drag (not a clamp)', () => {
    for (const [id, stat] of [['rattler', 5], ['jefferson', 4]] as const) {
      const { world, pad, v } = setup(id);
      pad.throttle = 1;
      world.step(60 * 60);
      const target = handling.byStat.topSpeed[stat - 1];
      const top = fwdSpeed(v);
      expect(top).toBeGreaterThan(target * 0.9);
      expect(top).toBeLessThan(target * 1.05);
    }
  });

  it('braking distance is close to v^2 / (2 mu g)', () => {
    const { world, pad, v } = setup();
    pad.throttle = 1;
    world.step(60 * 5);
    const v0 = fwdSpeed(v);
    const z0 = v.body.translation().z;
    pad.throttle = -1;
    for (let i = 0; i < 900 && fwdSpeed(v) > 0.3; i++) world.step(1);
    const dist = v.body.translation().z - z0;
    const ideal = (v0 * v0) / (2 * handling.brakes.weightFactor * handling.world.gravity);
    expect(dist).toBeGreaterThan(ideal * 0.85);
    expect(dist).toBeLessThan(ideal * 1.1);
  });

  it('steering changes yaw and lateral grip is about 1 g', () => {
    const { world, pad, v } = setup();
    pad.throttle = 1;
    world.step(90);
    const f0 = v.forward(new THREE.Vector3());
    pad.throttle = 0.3;
    pad.steer = 1;
    world.step(60);
    const f1 = v.forward(new THREE.Vector3());
    expect(f0.angleTo(f1)).toBeGreaterThan(0.2);
    const f2 = v.forward(new THREE.Vector3());
    world.step(10);
    const f3 = v.forward(new THREE.Vector3());
    const yawRate = (f2.angleTo(f3) / (10 * DT));
    const latG = (yawRate * v.speed()) / handling.world.gravity;
    expect(latG).toBeGreaterThan(0.7);
    expect(latG).toBeLessThan(1.6);
  });

  it('jumps off a ramp', () => {
    const { world, pad, v } = setup();
    const ang = 0.3;
    const len = 16;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ang);
    world.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(5, 0.25, len / 2)
        .setTranslation(0, (Math.sin(ang) * len) / 2 - 0.25, 60 + (Math.cos(ang) * len) / 2)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
    );
    pad.throttle = 1;
    let maxY = 0;
    for (let i = 0; i < 600; i++) {
      world.step(1);
      maxY = Math.max(maxY, v.body.translation().y);
    }
    expect(maxY).toBeGreaterThan(4);
  });
});

describe('collisions (momentum, damage)', () => {
  it('heavy moth shoves light strider; momentum roughly conserved; both take collision damage', () => {
    const world = new FakeWorld();
    const sys = new DamageSystem(world as unknown as GameWorld);
    world.addSystem(sys);
    const moth = spawn(world, 'moth', 0, 0);
    const strider = spawn(world, 'strider', 0, 9);
    const sources: Array<string | null> = [];
    world.events.on('damage', (e) => e.weapon === 'collision' && sources.push(e.sourceId));
    world.step(30);
    const m1 = moth.v.def.mass;
    const m2 = strider.v.def.mass;
    moth.v.body.setLinvel({ x: 0, y: 0, z: 15 }, true);
    world.step(90);
    const vm = moth.v.body.linvel().z;
    const vs = strider.v.body.linvel().z;
    expect(vs).toBeGreaterThan(vm);
    const p = m1 * vm + m2 * vs;
    expect(p).toBeGreaterThan(m1 * 15 * 0.8);
    expect(p).toBeLessThan(m1 * 15 * 1.1);
    expect(strider.v.hp).toBeLessThan(strider.v.maxHp);
    expect(moth.v.hp).toBeLessThan(moth.v.maxHp);
    expect(strider.v.maxHp - strider.v.hp).toBeGreaterThan(moth.v.maxHp - moth.v.hp);
    expect(sources).toContain(moth.v.id);
    sys.dispose();
  });

  it('wall crash damages by impact speed', () => {
    const hpAfter = (speed: number): number => {
      const world = new FakeWorld();
      const sys = new DamageSystem(world as unknown as GameWorld);
      world.addSystem(sys);
      world.physics.createCollider(RAPIER.ColliderDesc.cuboid(10, 2, 0.5).setTranslation(0, 2, 30));
      const { v } = spawn(world, 'rattler', 0, 0);
      world.step(30);
      v.body.setLinvel({ x: 0, y: 0, z: speed }, true);
      world.step(120);
      sys.dispose();
      return v.hp;
    };
    const slow = hpAfter(8);
    const fast = hpAfter(25);
    expect(fast).toBeLessThan(slow);
  });
});

describe('damage', () => {
  it('reduces hp and emits destroyed once', () => {
    const { world, v } = setup();
    const dmg = new DamageSystem(world as unknown as GameWorld);
    let destroyed = 0;
    world.events.on('destroyed', () => destroyed++);
    world.events.emit('damage', { targetId: v.id, sourceId: null, amount: 10, weapon: 'missile' });
    expect(v.hp).toBeLessThan(v.maxHp);
    for (let i = 0; i < 5; i++) world.events.emit('damage', { targetId: v.id, sourceId: null, amount: 1000, weapon: 'missile' });
    expect(v.hp).toBe(0);
    expect(v.alive).toBe(false);
    expect(destroyed).toBe(1);
    dmg.dispose();
  });

  it('explosion: damage falls with distance; impulse moves light vehicles more than heavy (dv = J/m)', () => {
    const world = new FakeWorld();
    const dmg = new DamageSystem(world as unknown as GameWorld);
    const light = spawn(world, 'strider', 4, 0);
    const heavy = spawn(world, 'moth', -4, 0);
    world.events.emit('explosion', { pos: new THREE.Vector3(0, 1, 0), radius: 10, damage: 40, sourceId: null });
    expect(light.v.hp).toBeLessThan(light.v.maxHp);
    expect(light.v.body.linvel().x).toBeGreaterThan(0);
    expect(heavy.v.body.linvel().x).toBeLessThan(0);
    expect(Math.abs(light.v.body.linvel().x)).toBeGreaterThan(Math.abs(heavy.v.body.linvel().x) * 3);
    const far = light.v.hp;
    world.events.emit('explosion', { pos: new THREE.Vector3(80, 1, 0), radius: 10, damage: 40, sourceId: null });
    expect(light.v.hp).toBe(far);
    dmg.dispose();
  });
});

describe('self-righting', () => {
  it('flips back upright ~1.2 s after coming to rest on its roof', () => {
    const { world, v } = setup();
    v.body.setRotation({ x: 0, y: 0, z: 1, w: 0 }, true);
    v.body.setTranslation({ x: 0, y: 1, z: 0 }, true);
    world.step(150);
    const r = v.body.rotation();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    expect(up.y).toBeGreaterThan(0.9);
  });
});
