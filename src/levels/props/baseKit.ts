// Secret Base proplari uchun umumiy yordamchilar: ranglar, porlovchi (emissive, bloom) materiallar, ekstruziyasiz geometriyalar.
import * as THREE from 'three';
import { stdMat } from './common';
import baseJson from '../../../data/levels/base.json';

export const base = baseJson;
const colors = base.colors as Record<string, string>;
const glows = base.glow as Record<string, { color: string; intensity: number }>;

/** Oddiy (yorug'lik oladigan) material, rang kaliti base.json colors dan. */
export const bmat = (key: string, rough = 0.8, metal = 0.2, double = false): THREE.MeshStandardMaterial =>
  stdMat(`base.${key}:${rough}:${metal}:${double}`, colors[key] ?? key, rough, metal, double ? { side: THREE.DoubleSide } : {});

/** Porlovchi material: toneMapped=false va yuqori emissive — bloom shuni ushlaydi. */
export const glow = (key: string): THREE.MeshStandardMaterial => {
  const g = glows[key]!;
  return stdMat(`base.glow.${key}`, '#000000', 0.5, 0, { emissive: new THREE.Color(g.color), emissiveIntensity: g.intensity, toneMapped: false });
};

/** Asos o'qi y bo'lgan yarim silindr tomi (brezent): +z o'qi bo'ylab yotadi, ochiq tomoni pastda. */
export const halfCyl = (): THREE.CylinderGeometry => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true, -Math.PI / 2, Math.PI);
  g.rotateX(-Math.PI / 2);
  return g;
};
