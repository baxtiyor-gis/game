// Ferma proplari uchun umumiy yordamchilar: birlik geometriyalar, qo'yish, beshburchak tom (gable).
import * as THREE from 'three';
import { cachedGeo, mesh, propCfg, stdMat } from './common';
import type { Vec3 } from './common';

export const farm = propCfg.farm;
export const fc = farm.colors;

export const unitBox = (): THREE.BoxGeometry => cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
export const unitCyl = (): THREE.CylinderGeometry => cachedGeo('unitCyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));

/** Rangli oddiy material (kesh bilan). */
export const mat = (key: string, color: string, rough = 0.8, metal = 0.1): THREE.MeshStandardMaterial => stdMat(`farm.${key}`, color, rough, metal);

/** Mesh ni guruhga qo'yadi: pozitsiya, o'lcham, ixtiyoriy aylanish (Euler). */
export function put(g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, p: Vec3, s: Vec3 = [1, 1, 1], rot?: Vec3): THREE.Mesh {
  const o = mesh(geo, m, ...p);
  o.scale.set(...s);
  if (rot) o.rotation.set(...rot);
  g.add(o);
  return o;
}

/** Uchburchak prizma (tom): eni w, balandligi rh, uzunligi d (z bo'ylab), asosi y=0 da. */
export function gable(w: number, rh: number, d: number): THREE.BufferGeometry {
  return cachedGeo(`gable:${w}:${rh}:${d}`, () => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0);
    sh.lineTo(w / 2, 0);
    sh.lineTo(0, rh);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  });
}
