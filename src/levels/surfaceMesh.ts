// Sirt zonalari vizuali: muz (silliq, yaltiroq doira/to'rtburchak) va qor bilan qoplangan yo'l (relyefga yotqizilgan lenta).
import * as THREE from 'three';
import type { SurfaceDef, Vec2 } from './types';
import { smat, ski } from './props/skiKit';

const S = ski.surface;

function iceGeometry(def: SurfaceDef, heightAt: (x: number, z: number) => number): THREE.BufferGeometry | null {
  if (def.pos && def.radius) {
    const g = new THREE.CircleGeometry(def.radius, S.circleSegments).rotateX(-Math.PI / 2);
    g.translate(def.pos[0], heightAt(def.pos[0], def.pos[1]) + S.iceLift, def.pos[1]);
    return g;
  }
  if (def.rect) {
    const [x0, z0, x1, z1] = def.rect;
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, heightAt((x0 + x1) / 2, (z0 + z1) / 2) + S.iceLift, (z0 + z1) / 2);
    return g;
  }
  return null;
}

/** Yo'l lentasi: har `step` m da ikki chekka nuqta (relyef balandligi + lift); burchaklarda doira bilan to'ldiriladi. */
function roadGeometry(path: Vec2[], width: number, heightAt: (x: number, z: number) => number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const hw = width / 2;
  const vert = (x: number, z: number): number => {
    pos.push(x, heightAt(x, z) + S.roadLift, z);
    return pos.length / 3 - 1;
  };
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, az] = path[i]!;
    const [bx, bz] = path[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    const n = Math.max(1, Math.ceil(len / S.step));
    let prev: [number, number] | null = null;
    for (let k = 0; k <= n; k++) {
      const cx = ax + ((bx - ax) * k) / n;
      const cz = az + ((bz - az) * k) / n;
      const l = vert(cx + nx * hw, cz + nz * hw);
      const r = vert(cx - nx * hw, cz - nz * hw);
      if (prev) idx.push(prev[0], prev[1], l, prev[1], r, l);
      prev = [l, r];
    }
  }
  for (const [x, z] of path) {
    const c = vert(x, z);
    const ring: number[] = [];
    for (let k = 0; k < S.circleSegments; k++) {
      const a = (k / S.circleSegments) * Math.PI * 2;
      ring.push(vert(x + Math.cos(a) * hw, z + Math.sin(a) * hw));
    }
    for (let k = 0; k < ring.length; k++) idx.push(c, ring[(k + 1) % ring.length]!, ring[k]!);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Barcha zonalar uchun mesh lar (bitta guruh) va ularni bo'shatuvchi funksiya. */
export function buildSurfaceMeshes(defs: SurfaceDef[], heightAt: (x: number, z: number) => number): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  group.name = 'surfaces';
  const geos: THREE.BufferGeometry[] = [];
  const ice = smat('ice', S.iceRough, S.iceMetal, { emissive: new THREE.Color(S.iceGlow), emissiveIntensity: S.iceGlowK, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const road = smat('road', 0.92, 0.02, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const d of defs) {
    const g = d.type === 'ice' ? iceGeometry(d, heightAt) : d.path ? roadGeometry(d.path, d.width ?? S.roadWidth, heightAt) : null;
    if (!g) continue;
    geos.push(g);
    const m = new THREE.Mesh(g, d.type === 'ice' ? ice : road);
    m.receiveShadow = true;
    group.add(m);
  }
  return { group, dispose: () => geos.forEach((g) => g.dispose()) };
}
