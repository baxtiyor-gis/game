import type * as THREE from 'three';
import { CG } from '../core/types';
import type { GameWorld, VehicleHandle } from '../core/types';
import type RAPIER from '@dimforge/rapier3d-compat';

export interface SegmentHit {
  t: number; // masofa (dir birlik vektor)
  vehicle: VehicleHandle | null; // null = dunyo (yer/bino)
}

const GROUPS = (CG.PROJECTILE << 16) | CG.WORLD | CG.VEHICLE;

/** from dan dir (birlik) bo'ylab len masofagacha eng yaqin to'qnashuv. `exclude` (o'z mashinasi) hisobga olinmaydi. */
export function castSegment(
  world: GameWorld, from: THREE.Vector3, dir: THREE.Vector3, len: number, exclude?: RAPIER.RigidBody,
): SegmentHit | null {
  const ray = new world.rapier.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z });
  const hit = world.physics.castRay(ray, len, true, undefined, GROUPS, undefined, exclude);
  if (!hit) return null;
  const handle = hit.collider.parent()?.handle;
  const vehicle = handle === undefined ? null : (world.vehicles.find((v) => v.body.handle === handle) ?? null);
  return { t: hit.timeOfImpact, vehicle };
}
