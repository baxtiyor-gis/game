// Casino City proplari uchun umumiy yordamchilar: ranglar, neon (emissive, bloom) materiallar, fasad teksturasi, yozuv paneli.
import * as THREE from 'three';
import { t } from '../../core/data';
import { cachedGeo, onCacheDispose, stdMat } from './common';
import casinoJson from '../../../data/levels/casino.json';

export const casino = casinoJson;
const colors = casino.colors as unknown as Record<string, string | string[]>;
const glows = casino.glow as Record<string, { color: string; intensity: number }>;
const F = casino.facade;

/** Oddiy material (kesh bilan): rang kaliti casino.json colors dan (yoki to'g'ridan-to'g'ri #hex). */
export const cmat = (key: string, rough = 0.8, metal = 0.1, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  stdMat(`casino.${key}:${rough}:${metal}:${Object.keys(extra).join()}`, (colors[key] as string | undefined) ?? key, rough, metal, extra);

/** Neon: toneMapped=false va yuqori emissive — bloom shuni ushlaydi. `tag` — alohida (animatsiyalanadigan) nusxa uchun. */
export const neon = (key: string, tag = ''): THREE.MeshStandardMaterial => {
  const g = glows[key]!;
  return stdMat(`casino.neon.${key}${tag}`, '#000000', 0.5, 0, { emissive: new THREE.Color(g.color), emissiveIntensity: g.intensity, toneMapped: false });
};

const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

interface FacadeTex {
  map: THREE.DataTexture;
  glow: THREE.DataTexture;
}
let facadeTex: FacadeTex | null = null;

function dataTex(data: Uint8Array, n: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Fasad teksturalari: deraza to'ri (4x4 deraza) va yoritilgan derazalar niqobi (emissive). */
function facadeTextures(): FacadeTex {
  if (facadeTex) return facadeTex;
  const n = F.tex;
  const cs = n / F.grid;
  const a = new Uint8Array(n * n * 4);
  const b = new Uint8Array(n * n * 4);
  const [wall, win, lit] = [hex(F.wall), hex(F.window), hex(F.lit)];
  let s = F.seed;
  const rand = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let cy = 0; cy < F.grid; cy++) {
    for (let cx = 0; cx < F.grid; cx++) {
      const on = rand() < F.litChance;
      for (let y = 0; y < cs; y++) {
        for (let x = 0; x < cs; x++) {
          const inside = x >= cs * 0.2 && x < cs * 0.8 && y >= cs * 0.22 && y < cs * 0.78;
          const i = ((cy * cs + y) * n + cx * cs + x) * 4;
          const c = inside ? win : wall;
          a.set([c[0], c[1], c[2], 255], i);
          b.set(inside && on ? [lit[0], lit[1], lit[2], 255] : [0, 0, 0, 255], i);
        }
      }
    }
  }
  facadeTex = { map: dataTex(a, n), glow: dataTex(b, n) };
  onCacheDispose(() => {
    facadeTex?.map.dispose();
    facadeTex?.glow.dispose();
    facadeTex = null;
  });
  return facadeTex;
}

/** Fasad materiali (deraza teksturasi, tint — devor rangi). */
export function facadeMat(tint: string): THREE.MeshStandardMaterial {
  const tx = facadeTextures();
  return stdMat(`casino.facade.${tint}`, tint, 0.85, 0.05, { map: tx.map, emissiveMap: tx.glow, emissive: new THREE.Color('#ffffff'), emissiveIntensity: F.litIntensity });
}

/** Fasadli quti (asosi y=0): yon yuzlarda deraza to'ri o'lchamga mos takrorlanadi, tom/pol — devor rangi. */
export function facadeBox(w: number, h: number, d: number): THREE.BufferGeometry {
  return cachedGeo(`casino.fbox:${w}:${h}:${d}`, () => {
    const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      const face = i >> 2;
      const [u, v] = [uv.getX(i), uv.getY(i)];
      if (face < 2) uv.setXY(i, (u * d) / F.tileW, (v * h) / F.tileH);
      else if (face < 4) uv.setXY(i, 0.03, 0.03);
      else uv.setXY(i, (u * w) / F.tileW, (v * h) / F.tileH);
    }
    return g;
  });
}

const signs = new Map<string, THREE.Material>();

/** Neon yozuv paneli materiali: matn (strings.json kaliti) canvas ga chiziladi; canvas yo'q (test) bo'lsa — oddiy neon. */
export function signMat(textKey: string, colorKey: string): THREE.Material {
  const key = `${textKey}:${colorKey}`;
  const cached = signs.get(key);
  if (cached) return cached;
  if (signs.size === 0) {
    onCacheDispose(() => {
      for (const sm of signs.values()) {
        (sm as THREE.MeshBasicMaterial).map?.dispose();
        sm.dispose();
      }
      signs.clear();
    });
  }
  let m: THREE.Material;
  if (typeof document === 'undefined') m = neon(colorKey);
  else {
    const S = casino.sign;
    const cv = document.createElement('canvas');
    cv.width = S.texW;
    cv.height = S.texH;
    const c = cv.getContext('2d')!;
    const col = glows[colorKey]!.color;
    c.fillStyle = S.bg;
    c.fillRect(0, 0, S.texW, S.texH);
    c.strokeStyle = col;
    c.lineWidth = S.border;
    c.strokeRect(S.border, S.border, S.texW - S.border * 2, S.texH - S.border * 2);
    c.font = S.font;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 18;
    c.fillText(t(textKey), S.texW / 2, S.texH / 2 + 4, S.texW - S.border * 5);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(S.boost, S.boost, S.boost), toneMapped: false });
  }
  signs.set(key, m);
  return m;
}

/** Ikki tomonli yozuv paneli (old +z va orqa -z), markazi (x,y,z). */
export function signPanel(g: THREE.Object3D, w: number, h: number, p: [number, number, number], textKey: string, colorKey: string): void {
  const geo = cachedGeo(`casino.plane:${w}:${h}`, () => new THREE.PlaneGeometry(w, h));
  const mat = signMat(textKey, colorKey);
  for (const back of [false, true]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p[0], p[1], p[2] + (back ? -0.02 : 0.02));
    if (back) m.rotation.y = Math.PI;
    g.add(m);
  }
}
