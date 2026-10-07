import * as THREE from 'three';
import cfgJson from '../../data/render.json';

const mc = cfgJson.materials;
const gc = cfgJson.ground;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value-noise (0..1) bilan size*size RGBA piksel buferi. DOM kerak emas. */
export function generateGroundPixels(size: number = gc.textureSize, seed: number = gc.seed): Uint8Array {
  const rnd = mulberry32(seed);
  const grids: Float32Array[] = [];
  const lat: number[] = [];
  for (let o = 0; o < gc.octaves; o++) {
    const n = gc.lattice * 2 ** o;
    lat.push(n);
    grids.push(Float32Array.from({ length: n * n }, rnd));
  }
  const base = new THREE.Color(gc.base).convertLinearToSRGB();
  const out = new Uint8Array(size * size * 4);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 1, tot = 0;
      for (let o = 0; o < grids.length; o++) {
        const n = lat[o]!, g = grids[o]!;
        const fx = (x / size) * n, fy = (y / size) * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = smooth(fx - x0), ty = smooth(fy - y0);
        const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        const a = g[y0 % n * n + x0 % n]!, b = g[y0 % n * n + x1]!;
        const c = g[y1 * n + x0 % n]!, d = g[y1 * n + x1]!;
        v += amp * (a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty);
        tot += amp;
        amp *= 0.5;
      }
      const k = 1 + (v / tot - 0.5) * 2 * gc.variation + (rnd() - 0.5) * gc.speckle;
      const i = (y * size + x) * 4;
      out[i] = Math.max(0, Math.min(255, base.r * 255 * k));
      out[i + 1] = Math.max(0, Math.min(255, base.g * 255 * k));
      out[i + 2] = Math.max(0, Math.min(255, base.b * 255 * k));
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Yer uchun procedural qum/tuproq materiali. `sizeMeters` — plane o'lchami (tekstura takrorlanishi uchun). */
export function makeGroundMaterial(sizeMeters = 400): THREE.MeshStandardMaterial {
  const tex = new THREE.DataTexture(generateGroundPixels(), gc.textureSize, gc.textureSize, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.repeat.setScalar(sizeMeters * gc.repeatPerMeter);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: gc.roughness, metalness: 0 });
}

function toStandard(m: THREE.MeshLambertMaterial): THREE.MeshStandardMaterial {
  const s = new THREE.MeshStandardMaterial({
    color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap,
    flatShading: m.flatShading, transparent: m.transparent, opacity: m.opacity,
    side: m.side, roughness: mc.roughness, metalness: mc.metalness,
  });
  s.name = m.name;
  return s;
}

/**
 * Juda silliq (roughness ~0.1) xrom/lak yuzalarda quyosh specular cho'qqisi HDR da yuzlab marta yorqin bo'ladi
 * va bloom uni katta oq dog'ga aylantiradi (masalan orqa bamper ostida). Cho'qqini yumshatamiz;
 * bloom faqat emissive (toneMapped:false) materiallar uchun qoladi.
 */
function softenSpecular(m: THREE.Material): void {
  if (!(m instanceof THREE.MeshStandardMaterial) || !m.toneMapped) return;
  const floor = m.metalness >= mc.metalThreshold ? mc.metalRoughnessMin : mc.roughnessMin;
  if (m.roughness < floor) m.roughness = floor;
  if (m instanceof THREE.MeshPhysicalMaterial && m.clearcoat > 0 && m.clearcoatRoughness < mc.clearcoatRoughnessMin) {
    m.clearcoatRoughness = mc.clearcoatRoughnessMin;
  }
}

/** Sahnadagi MeshLambertMaterial -> MeshStandardMaterial (vaqtinchalik) va soya bayroqlari. */
export function upgradeMaterials(scene: THREE.Object3D): void {
  const cache = new Map<THREE.Material, THREE.Material>();
  const up = (m: THREE.Material): THREE.Material => {
    if (!(m instanceof THREE.MeshLambertMaterial)) return m;
    let n = cache.get(m);
    if (!n) {
      n = toStandard(m);
      cache.set(m, n);
      m.dispose();
    }
    return n;
  };
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.material = Array.isArray(o.material) ? o.material.map(up) : up(o.material);
    if (Array.isArray(o.material)) o.material.forEach(softenSpecular);
    else softenSpecular(o.material);
    if (!o.userData.fxShadow) {
      o.userData.fxShadow = true;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}
