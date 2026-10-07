import * as THREE from 'three';

/** Umumiy (shablon) materiallar. Har bir mashina nusxasi ularni clone() qiladi (shikast uchun). */
const cache = new Map<string, THREE.Material>();

function get(key: string, make: () => THREE.Material): THREE.Material {
  let m = cache.get(key);
  if (!m) {
    m = make();
    m.name = key;
    cache.set(key, m);
  }
  return m;
}

/** Kuzov bo'yog'i: clearcoat lak. */
export function paint(color: string, matte = false): THREE.Material {
  return get(`paint:${color}:${matte}`, () =>
    new THREE.MeshPhysicalMaterial({
      color,
      metalness: matte ? 0.1 : 0.5,
      roughness: matte ? 0.7 : 0.34,
      clearcoat: matte ? 0 : 1,
      clearcoatRoughness: 0.08,
    }),
  );
}

/** Bo'yoqning to'qroq varianti (pastki panel, ichki qismlar). */
export function darker(color: string, k = 0.5): string {
  return `#${new THREE.Color(color).multiplyScalar(k).getHexString()}`;
}

const std = (o: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial(o);

export const chrome = (): THREE.Material => get('chrome', () => std({ color: '#e4e8ee', metalness: 1, roughness: 0.12 }));
export const steel = (): THREE.Material => get('steel', () => std({ color: '#8d939c', metalness: 0.85, roughness: 0.4 }));
export const gunmetal = (): THREE.Material => get('gunmetal', () => std({ color: '#2a2d33', metalness: 0.9, roughness: 0.35 }));
export const trim = (): THREE.Material => get('trim', () => std({ color: '#141417', metalness: 0.1, roughness: 0.65 }));
export const rubber = (): THREE.Material => get('rubber', () => std({ color: '#0d0d0f', metalness: 0, roughness: 0.92 }));
export const interior = (): THREE.Material => get('interior', () => std({ color: '#2a2220', metalness: 0, roughness: 0.9 }));
export const glass = (): THREE.Material =>
  get('glass', () =>
    new THREE.MeshPhysicalMaterial({ color: '#0e1a26', metalness: 0.2, roughness: 0.04, transparent: true, opacity: 0.82, clearcoat: 1 }),
  );
/** Faralar: bloom ushlaydi (toneMapped:false, emissive > 1). */
export const lamp = (): THREE.Material =>
  get('lamp', () => std({ color: '#fff6d8', emissive: '#fff0b8', emissiveIntensity: 2.4, toneMapped: false, roughness: 0.2 }));
export const tail = (): THREE.Material =>
  get('tail', () => std({ color: '#ff2a1c', emissive: '#ff1a0e', emissiveIntensity: 1.8, toneMapped: false, roughness: 0.3 }));
export const amber = (): THREE.Material =>
  get('amber', () => std({ color: '#ff9a1a', emissive: '#ff8a00', emissiveIntensity: 1.5, toneMapped: false, roughness: 0.3 }));
export const glow = (color: string): THREE.Material =>
  get(`glow:${color}`, () => std({ color, emissive: color, emissiveIntensity: 3, toneMapped: false, roughness: 0.3 }));
export const matte = (color: string): THREE.Material => get(`matte:${color}`, () => std({ color, metalness: 0.05, roughness: 0.8 }));
