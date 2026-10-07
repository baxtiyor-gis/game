import * as THREE from 'three';
import type { VehicleHandle } from '../core/types';
import { tuning, weaponDef } from './params';
import type { FireContext, Weapon } from './weapon';

const to = new THREE.Vector3();
const pos = new THREE.Vector3();

/** Eng yaqin, old konusdagi tirik raqib (egasidan tashqari). */
export function acquireTarget(ctx: FireContext): VehicleHandle | null {
  const t = tuning.missile;
  const cosMin = Math.cos(t.lockCone);
  let best: VehicleHandle | null = null;
  let bestD = t.lockRange;
  for (const v of ctx.world.vehicles) {
    if (v === ctx.owner || !v.alive) continue;
    to.copy(v.position(pos)).sub(ctx.muzzle);
    const d = to.length();
    if (d > bestD || d < 1e-3 || to.dot(ctx.forward) / d < cosMin) continue;
    best = v;
    bestD = d;
  }
  return best;
}

/** Nishonga homing parametri; avoidance burilish tezligini susaytiradi. */
export function homingFor(target: VehicleHandle | null, baseRate: number): { target: VehicleHandle; rate: number } | undefined {
  if (!target) return undefined;
  const t = tuning.missile;
  const damp = Math.max(t.minHoming, 1 - t.avoidanceDamp * (target.def.stats.avoidance - 1));
  return { target, rate: baseRate * damp };
}

/** Interceptor Missiles: eng yaqin oldidagi nishonga homing; avoidance homing ni susaytiradi. */
export const missile: Weapon = {
  id: 'missile',
  fire(ctx) {
    const def = weaponDef('missile');
    const vel = ctx.forward.clone().multiplyScalar(def.speed);
    const homing = homingFor(acquireTarget(ctx), def.homingTurnRate ?? 0);
    ctx.projectiles.spawn({ weapon: 'missile', owner: ctx.owner, pos: ctx.muzzle, vel, homing });
  },
};
