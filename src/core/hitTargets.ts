// Hitscan / to'g'ridan-to'g'ri tegish nishonlari: collider handle -> zarar qabul qiluvchi (mashinadan boshqa obyektlar).
// Registr Rapier World ga bog'liq (WeakMap): world.reset() yangi physics yaratganda eski yozuvlar o'z-o'zidan yo'qoladi.
import type { GameWorld } from './types';

export interface HitTarget {
  id: string;
  damage(amount: number, sourceId: string | null, weapon: string): void;
}

const registries = new WeakMap<object, Map<number, HitTarget>>();

function reg(world: GameWorld): Map<number, HitTarget> {
  let m = registries.get(world.physics);
  if (!m) registries.set(world.physics, (m = new Map()));
  return m;
}

export function registerHitTarget(world: GameWorld, colliderHandle: number, target: HitTarget): void {
  reg(world).set(colliderHandle, target);
}

export function unregisterHitTarget(world: GameWorld, colliderHandle: number): void {
  reg(world).delete(colliderHandle);
}

export function findHitTarget(world: GameWorld, colliderHandle: number): HitTarget | null {
  return registries.get(world.physics)?.get(colliderHandle) ?? null;
}
