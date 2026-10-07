import type * as THREE from 'three';
import type { GameWorld, VehicleHandle } from '../core/types';
import type { Effects } from './effects';
import type { ProjectileSystem } from './projectiles';

/** Bitta otishda qurolga beriladigan kontekst. */
export interface FireContext {
  world: GameWorld;
  projectiles: ProjectileSystem;
  effects: Effects;
  owner: VehicleHandle;
  forward: THREE.Vector3;
  /** Old (forward bo'yicha) va orqa (mina) otish nuqtalari */
  muzzle: THREE.Vector3;
  rear: THREE.Vector3;
}

/** Har bir qurol shu kontraktni bajaradi; ammo/cooldown ni WeaponSystem boshqaradi. */
export interface Weapon {
  readonly id: string;
  fire(ctx: FireContext): void;
}
