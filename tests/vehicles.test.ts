import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef } from '../src/core/data';
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
  time = 0;
  private systems: System[] = [];

  constructor() {
    this.physics = new RAPIER.World({ x: 0, y: -9.81 * 1.6, z: 0 });
    this.physics.timestep = DT;
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(300, 0.5, 300).setTranslation(0, -0.5, 0));
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
      for (const s of this.systems) s.fixedUpdate?.(DT);
      this.physics.step();
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

const setup = (id = 'rattler') => {
  const world = new FakeWorld();
  const pad = new Pad();
  const v = spawnVehicle(world as unknown as GameWorld, vehicleDef(id), pad, { x: 0, y: 1, z: 0 }, 0);
  return { world, pad, v };
};

beforeAll(async () => {
  await RAPIER.init();
});

describe('vehicle physics', () => {
  it('accelerates forward on flat ground', () => {
    const { world, pad, v } = setup();
    pad.throttle = 1;
    world.step(120);
    const fwd = v.forward(new THREE.Vector3());
    const vel = v.body.linvel();
    const fv = fwd.x * vel.x + fwd.y * vel.y + fwd.z * vel.z;
    expect(fv).toBeGreaterThan(8);
  });

  it('steering changes yaw', () => {
    const { world, pad, v } = setup();
    pad.throttle = 1;
    world.step(90);
    const f0 = v.forward(new THREE.Vector3());
    pad.steer = 1;
    world.step(60);
    const f1 = v.forward(new THREE.Vector3());
    expect(f0.angleTo(f1)).toBeGreaterThan(0.2);
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

  it('explosion damages by distance and pushes', () => {
    const { world, v } = setup();
    const dmg = new DamageSystem(world as unknown as GameWorld);
    const pos = new THREE.Vector3(3, 1, 0);
    world.events.emit('explosion', { pos, radius: 10, damage: 40, sourceId: null });
    expect(v.hp).toBeLessThan(v.maxHp);
    expect(v.body.linvel().x).toBeLessThan(0);
    const far = v.hp;
    world.events.emit('explosion', { pos: new THREE.Vector3(50, 1, 0), radius: 10, damage: 40, sourceId: null });
    expect(v.hp).toBe(far);
    dmg.dispose();
  });
});

describe('self-righting', () => {
  it('flips back upright after ~1.2 s', () => {
    const { world, v } = setup();
    v.body.setRotation({ x: 0, y: 0, z: 1, w: 0 }, true);
    v.body.setTranslation({ x: 0, y: 1, z: 0 }, true);
    world.step(150);
    const r = v.body.rotation();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    expect(up.y).toBeGreaterThan(0.9);
  });
});
