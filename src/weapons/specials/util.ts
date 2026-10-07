import * as THREE from 'three';
import type { VehicleHandle, WeaponId } from '../../core/types';
import { weaponDef } from '../params';
import type { SpawnOpts } from '../projectiles';
import type { SpecialContext } from './types';

const UP = new THREE.Vector3(0, 1, 0);

/** v ni Y o'qi atrofida `angle` radianga burilgan nusxasi. */
export function yawed(v: THREE.Vector3, angle: number): THREE.Vector3 {
  return v.clone().applyAxisAngle(UP, angle);
}

/** [-half, +half] oralig'ida n ta teng taqsimlangan burchak. */
export function fanAngles(n: number, half: number): number[] {
  return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : -half + (2 * half * i) / (n - 1)));
}

/** Qurolning def tezligi * speedScale bilan dir bo'ylab snaryad otadi (muzzle dan, yoki `pos`). */
export function launch(
  ctx: SpecialContext, weapon: WeaponId, tag: string, dir: THREE.Vector3,
  extra: Partial<SpawnOpts> = {}, speedScale = 1,
): void {
  const vel = dir.clone().normalize().multiplyScalar(weaponDef(weapon).speed * speedScale);
  ctx.projectiles.spawn({ weapon, tag, owner: ctx.owner, pos: ctx.muzzle, vel, ...extra });
}

/** pos atrofida `radius` ichidagi tirik mashinalar. */
export function vehiclesNear(ctx: SpecialContext, pos: THREE.Vector3, radius: number): VehicleHandle[] {
  const p = new THREE.Vector3();
  return ctx.world.vehicles.filter((v) => v.alive && v.position(p).distanceTo(pos) < radius);
}
