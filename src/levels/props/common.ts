import * as THREE from 'three';
import { CG } from '../../core/types';
import type { Rapier } from '../../core/types';
import type RAPIER from '@dimforge/rapier3d-compat';
import propsJson from '../../../data/levels/props.json';

/** Rapier: membership WORLD, filter hammasi (main.ts dagi WORLD_GROUPS bilan bir xil). */
export const WORLD_GROUPS = (CG.WORLD << 16) | 0xffff;

export const propCfg = propsJson;
export type Vec3 = [number, number, number];

export interface Origin {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Prop yaratish natijasi: render obyekti + (dunyo koordinatalaridagi) kollayder tavsiflari. */
export interface PropBuild {
  object: THREE.Object3D;
  colliders: RAPIER.ColliderDesc[];
}

const geos = new Map<string, THREE.BufferGeometry>();
const mats = new Map<string, THREE.Material>();

export function cachedGeo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geos.get(key);
  if (!g) geos.set(key, (g = make()));
  return g as T;
}

export function stdMat(key: string, color: string, roughness = 0.75, metalness = 0.15, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  let m = mats.get(key);
  if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })));
  return m as THREE.MeshStandardMaterial;
}

/** Geometriya/material keshini tozalaydi (arena dispose da). */
export function disposePropCaches(): void {
  for (const g of geos.values()) g.dispose();
  for (const m of mats.values()) m.dispose();
  geos.clear();
  mats.clear();
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const q = new THREE.Quaternion();
const lp = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

/** Prop lokal koordinatasidagi (yaw bilan aylangan) kollayderni dunyoga qo'yadi. */
export function placed(desc: RAPIER.ColliderDesc, o: Origin, local: Vec3, localRot?: THREE.Quaternion): RAPIER.ColliderDesc {
  const yawQ = new THREE.Quaternion().setFromAxisAngle(up, o.yaw);
  lp.set(local[0], local[1], local[2]).applyQuaternion(yawQ);
  q.copy(yawQ);
  if (localRot) q.multiply(localRot);
  return desc
    .setTranslation(o.x + lp.x, o.y + lp.y, o.z + lp.z)
    .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
    .setCollisionGroups(WORLD_GROUPS);
}

/** Yaw bilan aylangan kuboid. half = yarim o'lchamlar, local = markaz (prop lokal, y yerdan). */
export function box(R: Rapier, o: Origin, local: Vec3, half: Vec3): RAPIER.ColliderDesc {
  return placed(R.ColliderDesc.cuboid(half[0], half[1], half[2]), o, local);
}
