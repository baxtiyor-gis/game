// Suv yuzasi vizuali: shaffof lenta/to'rtburchak, vertex shader da ikkita sinus to'lqin (siljish + analitik normal), geometriya dunyo koordinatalarida.
import * as THREE from 'three';
import type { Vec2, WaterDef } from './types';
import { dam } from './props/damKit';

const W = dam.water;

/** Suv zonasi: (x,z) shu yuzada bo'lsa true. Chuqurlik hisobi uchun (yuz tashqarisi — quruqlik). */
export interface WaterZone {
  id: string;
  y: number;
  contains(x: number, z: number): boolean;
}

/** Nuqtadan kesmagacha masofa kvadrati */
function segDist2(px: number, pz: number, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return (px - a[0] - dx * t) ** 2 + (pz - a[1] - dz * t) ** 2;
}

export function makeZone(def: WaterDef): WaterZone {
  if (def.rect) {
    const [x0, z0, x1, z1] = def.rect;
    return { id: def.id, y: def.y, contains: (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 };
  }
  const path = def.path ?? [];
  const r2 = ((def.width ?? 10) / 2) ** 2;
  return { id: def.id, y: def.y, contains: (x, z) => path.some((p, i) => i < path.length - 1 && segDist2(x, z, p, path[i + 1]!) <= r2) };
}

function rectGeometry(r: [number, number, number, number], y: number): THREE.BufferGeometry {
  const [x0, z0, x1, z1] = r;
  const nx = Math.max(1, Math.round((x1 - x0) / W.segment));
  const nz = Math.max(1, Math.round((z1 - z0) / W.segment));
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g;
}

/** Nuqtalar bo'ylab (CatmullRom) lenta: har ikki tomonga width/2, ko'ndalang W.cross bo'lim. */
function ribbonGeometry(points: Vec2[], width: number, y: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], y, p[1])), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / W.segment));
  const pts = curve.getSpacedPoints(n);
  const pos: number[] = [];
  const idx: number[] = [];
  const tan = new THREE.Vector3();
  const k = W.cross;
  pts.forEach((p, i) => {
    tan.subVectors(pts[Math.min(n, i + 1)]!, pts[Math.max(0, i - 1)]!).setY(0).normalize();
    for (let j = 0; j <= k; j++) {
      const s = (j / k - 0.5) * width;
      pos.push(p.x - tan.z * s, y, p.z + tan.x * s);
    }
    if (i < n) {
      for (let j = 0; j < k; j++) {
        const a = i * (k + 1) + j;
        idx.push(a, a + 1, a + k + 1, a + 1, a + k + 2, a + k + 1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const GLSL_HEAD = `
uniform float uTime;
float waveH(vec2 p) {
  return ${W.wave.amp[0]} * sin(dot(p, vec2(${W.wave.freq[0]![0]}, ${W.wave.freq[0]![1]})) + uTime * ${W.wave.speed[0]})
       + ${W.wave.amp[1]} * sin(dot(p, vec2(${W.wave.freq[1]![0]}, ${W.wave.freq[1]![1]})) + uTime * ${W.wave.speed[1]});
}
vec2 waveGrad(vec2 p) {
  return ${W.wave.amp[0]} * cos(dot(p, vec2(${W.wave.freq[0]![0]}, ${W.wave.freq[0]![1]})) + uTime * ${W.wave.speed[0]}) * vec2(${W.wave.freq[0]![0]}, ${W.wave.freq[0]![1]})
       + ${W.wave.amp[1]} * cos(dot(p, vec2(${W.wave.freq[1]![0]}, ${W.wave.freq[1]![1]})) + uTime * ${W.wave.speed[1]}) * vec2(${W.wave.freq[1]![0]}, ${W.wave.freq[1]![1]});
}`;

export interface WaterSurface {
  group: THREE.Group;
  /** Vaqtni oldinga siljitadi (to'lqin animatsiyasi) */
  advance(dt: number): void;
  dispose(): void;
}

/** Barcha suv yuzalarini bitta material (bitta shader) bilan quradi. */
export function buildSurface(defs: WaterDef[]): WaterSurface {
  const time = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ color: W.color, roughness: 0.18, metalness: 0.15, transparent: true, opacity: W.opacity, depthWrite: false, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_HEAD}`)
      .replace('#include <beginnormal_vertex>', 'vec2 wg = waveGrad(position.xz);\nvec3 objectNormal = normalize(vec3(-wg.x, 1.0, -wg.y));\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position);\ntransformed.y += waveH(position.xz);');
  };
  mat.customProgramCacheKey = () => 'hoover-water';
  const group = new THREE.Group();
  group.name = 'water';
  const geos: THREE.BufferGeometry[] = [];
  for (const d of defs) {
    const g = d.rect ? rectGeometry(d.rect, d.y) : ribbonGeometry(d.path ?? [], d.width ?? 10, d.y);
    geos.push(g);
    const m = new THREE.Mesh(g, mat);
    m.name = `water:${d.id}`;
    m.renderOrder = 2;
    group.add(m);
  }
  return {
    group,
    advance(dt) {
      time.value += dt;
    },
    dispose() {
      for (const g of geos) g.dispose();
      mat.dispose();
    },
  };
}
