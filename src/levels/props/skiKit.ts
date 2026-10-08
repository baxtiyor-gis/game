// Ski Resort proplari uchun umumiy yordamchilar: ranglar va o'lchamlar (data/levels/ski.json), material kesh.
import * as THREE from 'three';
import { stdMat } from './common';
import skiJson from '../../../data/levels/ski.json';

export const ski = skiJson;
const colors = ski.colors as Record<string, string>;

/** Oddiy material (kesh bilan): rang kaliti ski.json colors dan. */
export const smat = (key: string, rough = 0.85, metal = 0.05, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  stdMat(`ski.${key}:${rough}:${metal}:${Object.keys(extra).join()}`, colors[key] ?? key, rough, metal, extra);

/** Deraza materiali: iliq yoritilgan oyna */
export const glowMat = (): THREE.MeshStandardMaterial =>
  smat('window', 0.3, 0.1, { emissive: new THREE.Color(colors.windowGlow ?? '#ffb347'), emissiveIntensity: ski.chalet.windowGlow });
