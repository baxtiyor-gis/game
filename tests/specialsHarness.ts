// Maxsus qurol testlari uchun umumiy xarness: soxta world (Rapier), Pad, setup.
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import { vehicleDef } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { DamageSystem } from '../src/vehicles/damage';
import { WeaponSystem } from '../src/weapons/weaponSystem';
import type { Controller, GameEvents, GameWorld, InputState, System, VehicleHandle } from '../src/core/types';

export const DT = 1 / 60;

export class FakeWorld {
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
    this.physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.physics.timestep = DT;
    this.physics.createCollider(RAPIER.ColliderDesc.cuboid(300, 0.5, 300).setTranslation(0, -0.5, 0).setCollisionGroups((1 << 16) | 0xffff));
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
  special = false;
  sample(): InputState {
    const s: InputState = {
      throttle: 0, steer: 0, handbrake: false, fireMG: false, fireWeapon: false,
      fireSpecial: this.special, cycleWeapon: 0, rearView: false, combo: null,
    };
    this.special = false;
    return s;
  }
}
export const idle: Controller = { id: 'idle', sample: () => new Pad().sample() };

/** `driver` mashinasi (o'z maxsus quroli bilan) origin da; raqiblar fwd/side bo'yicha joylanadi. */
export const setup = (driver: string, ammo = 3) => {
  const world = new FakeWorld();
  const gw = world as unknown as GameWorld;
  const pad = new Pad();
  const me = spawnVehicle(gw, vehicleDef(driver), pad, { x: 0, y: 1, z: 0 }, 0);
  me.inventory.specialAmmo = ammo;
  const fwd = me.forward(new THREE.Vector3());
  const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
  const at = (f: number, s = 0) => ({ x: fwd.x * f + side.x * s, y: 1, z: fwd.z * f + side.z * s });
  const foe = (f: number, s = 0, id = 'jefferson') => spawnVehicle(gw, vehicleDef(id), idle, at(f, s), 0);
  new DamageSystem(gw);
  const ws = new WeaponSystem(gw);
  world.addSystem(ws);
  const events: { damage: GameEvents['damage'][]; explosion: GameEvents['explosion'][]; fire: GameEvents['fire'][]; status: GameEvents['status'][] } =
    { damage: [], explosion: [], fire: [], status: [] };
  for (const k of Object.keys(events) as Array<keyof typeof events>) world.events.on(k, (e) => (events[k] as unknown[]).push(e));
  const press = () => { pad.special = true; };
  const dmg = (v: VehicleHandle, id: string) => events.damage.filter((d) => d.targetId === v.id && d.weapon === `special.${id}`);
  return { world, gw, pad, me, fwd, side, at, foe, ws, events, press, dmg };
};
export const pos = (v: VehicleHandle) => v.position(new THREE.Vector3());

