import * as THREE from 'three';
import type { VehicleHandle, VehicleStatus } from '../../core/types';
import { castSegment } from '../raycast';
import type { SpecialContext } from './types';

const tmp = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** Mashina holatlari (yo'q bo'lsa yaratadi). */
export function statusOf(v: VehicleHandle): VehicleStatus {
  return (v.status ??= { blind: 0, smoke: 0, armorMul: 1 });
}

/** Egasidan boshqa tirik mashinalar. */
export const foes = (ctx: SpecialContext): VehicleHandle[] => ctx.world.vehicles.filter((v) => v !== ctx.owner && v.alive);

/** Gorizontal (XZ) birlik yo'nalish. */
export function flatDir(v: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  out.set(v.x, 0, v.z);
  return out.lengthSq() < 1e-8 ? out.set(0, 0, 1) : out.normalize();
}

/** from dan fwd bo'ylab (halfAngle konus, range masofa) ichidagi eng yaqin raqib. */
export function nearestFoe(ctx: SpecialContext, from: THREE.Vector3, fwd: THREE.Vector3, range: number, halfAngle: number): VehicleHandle | null {
  const cosMin = Math.cos(Math.min(halfAngle, Math.PI));
  let best: VehicleHandle | null = null;
  let bestD = range;
  for (const v of foes(ctx)) {
    tmp.copy(v.position(new THREE.Vector3())).sub(from);
    const d = tmp.length();
    if (d > bestD || d < 1e-3 || tmp.dot(fwd) / d < cosMin) continue;
    best = v;
    bestD = d;
  }
  return best;
}

/** Nuqta (pos) konus ichidami (flat: faqat XZ). */
export function inCone(origin: THREE.Vector3, fwd: THREE.Vector3, pos: THREE.Vector3, range: number, halfAngle: number): boolean {
  tmp.copy(pos).sub(origin);
  tmp.y = 0;
  const d = tmp.length();
  return d <= range && (d < 1e-3 || tmp.dot(flatDir(fwd, new THREE.Vector3())) / d >= Math.cos(halfAngle));
}

export const flatDist = (a: THREE.Vector3, b: THREE.Vector3): number => Math.hypot(a.x - b.x, a.z - b.z);

/** 'damage' eventi: weapon = `special.<id>`. */
export function hurt(ctx: SpecialContext, id: string, target: VehicleHandle, amount: number): void {
  if (!target.alive || amount <= 0) return;
  ctx.world.events.emit('damage', { targetId: target.id, sourceId: ctx.owner.id, amount, weapon: `special.${id}` });
}

export function stall(ctx: SpecialContext, target: VehicleHandle, secs: number): void {
  target.stalled = Math.max(target.stalled, secs);
  ctx.world.events.emit('status', { targetId: target.id, kind: 'stalled', duration: secs });
}

/** Tom ustidagi nuqta (dunyo koordinatalarida, fizika pozitsiyasi). */
export function roof(v: VehicleHandle, out = new THREE.Vector3(), extra = 0.2): THREE.Vector3 {
  return v.position(out).add(tmp.set(0, v.def.size[1] / 2 + extra, 0));
}

/** (x, z) ustidagi yer balandligi (yuqoridan pastga nur); topilmasa fallback. */
export function groundY(ctx: SpecialContext, x: number, z: number, fromY: number, fallback = 0): number {
  const hit = castSegment(ctx.world, tmp.set(x, fromY + 30, z), DOWN, 200);
  return hit ? fromY + 30 - hit.t : fallback;
}

/** Egasining massasiga ko'paytirilgan impuls (m/s birligida). */
export function kick(v: VehicleHandle, d: THREE.Vector3, speed: number): void {
  const k = v.body.mass() * speed;
  v.body.applyImpulse({ x: d.x * k, y: d.y * k, z: d.z * k }, true);
}
