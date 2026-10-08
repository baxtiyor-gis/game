// Hoover Dam proplari uchun umumiy yordamchilar: ranglar (data/levels/dam.json), material kesh, kichik geometriyalar.
import * as THREE from 'three';
import { cachedGeo, stdMat } from './common';
import damJson from '../../../data/levels/dam.json';

export const dam = damJson;
const colors = dam.colors as Record<string, string>;

/** Oddiy material (kesh bilan): rang kaliti dam.json colors dan. */
export const dmat = (key: string, rough = 0.85, metal = 0.05, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  stdMat(`dam.${key}:${rough}:${metal}:${Object.keys(extra).join()}`, colors[key] ?? key, rough, metal, extra);

/** Ingichka silindr (sim, ustun): 6 yoqli, balandligi 1, o'qi y. */
export const thinCyl = (): THREE.CylinderGeometry => cachedGeo('dam.thinCyl', () => new THREE.CylinderGeometry(1, 1, 1, 6));

const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();

/** a dan b gacha ingichka silindr mesh (dunyo koordinatalarida), radius r. */
export function strut(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  dir.subVectors(b, a);
  const len = dir.length();
  const o = new THREE.Mesh(thinCyl(), m);
  o.position.copy(a).addScaledVector(dir, 0.5);
  o.quaternion.setFromUnitVectors(up, dir.divideScalar(len || 1));
  o.scale.set(r, len, r);
  o.castShadow = true;
  return o;
}

export const hash2 = (x: number, z: number): number => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
