// Snaryad modellari (procedural). +Z = oldinga, markaz = (0,0,0). Geometriya modul darajasida keshlanadi.
import * as THREE from 'three';
import type { WeaponId } from '../../core/types';
import { vis, type DiskModel, type RocketModel, type ShellModel } from './config';
import { GeoBuilder, coneBackZ, coneZ, cylZ } from './geom';

export interface WeaponModel {
  readonly body: THREE.BufferGeometry;
  /** Yorqin (bloom) qism: alanga / issiq uch / chiroq. null = yo'q */
  readonly glow: THREE.BufferGeometry | null;
  /** glow geometriyasining bog'langan Z nuqtasi (alanga uchun flicker shu nuqtadan cho'ziladi) */
  readonly glowAnchor: number;
  readonly metalness: number;
  readonly roughness: number;
}

const cache = new Map<WeaponId, WeaponModel>();
const WEAPONS: WeaponId[] = ['missile', 'rocket', 'mortar', 'cannon', 'mine'];

export const modelIds = (): readonly WeaponId[] => WEAPONS;

/** Keshlangan model (bir xil obyekt qaytariladi). */
export function getModel(w: WeaponId): WeaponModel {
  let m = cache.get(w);
  if (!m) {
    m = build(w);
    cache.set(w, m);
  }
  return m;
}

export function disposeModels(): void {
  for (const m of cache.values()) {
    m.body.dispose();
    m.glow?.dispose();
  }
  cache.clear();
}

function build(w: WeaponId): WeaponModel {
  const c = vis.models[w];
  if (c.kind === 'rocket') return rocket(c);
  if (c.kind === 'shell') return shell(c);
  return disk(c);
}

function rocket(c: RocketModel): WeaponModel {
  const h = c.length / 2;
  const noseLen = c.length * c.noseFrac;
  const bodyLen = c.length - noseLen - c.nozzleLength;
  const b = new GeoBuilder();
  const bodyMid = -h + c.nozzleLength + bodyLen / 2;
  b.add(cylZ(c.radius, c.radius, bodyLen), c.bodyColor, [0, 0, bodyMid]);
  b.add(coneZ(c.radius, noseLen), c.noseColor, [0, 0, h - noseLen / 2]);
  if (c.bandWidth > 0) b.add(cylZ(c.radius * 1.04, c.radius * 1.04, c.bandWidth * bodyLen, 14), c.bandColor, [0, 0, bodyMid + c.bandAt * bodyLen]);
  if (c.nozzleLength > 0) b.add(cylZ(c.radius * 0.8, c.radius * 0.6, c.nozzleLength, 12), c.nozzleColor, [0, 0, -h + c.nozzleLength / 2]);
  for (let i = 0; i < c.finCount; i++) {
    const a = (i / c.finCount) * Math.PI * 2;
    const fin = new THREE.BoxGeometry(c.finThick, c.finSpan, c.finLength);
    const r = c.radius + c.finSpan / 2 - c.finSpan * 0.1;
    b.add(fin, c.finColor, [-Math.sin(a) * r, Math.cos(a) * r, -h + c.nozzleLength + c.finLength / 2], [0, 0, a]);
  }
  const body = b.build();

  const g = new GeoBuilder();
  let anchor = 0;
  if (c.flame) {
    anchor = -h;
    g.add(coneBackZ(c.flame.radius, c.flame.length), c.flame.color, [0, 0, -c.flame.length / 2], [0, 0, 0], vis.hdr.flame);
    g.add(coneBackZ(c.flame.radius * 0.55, c.flame.length * 0.6), c.flame.core, [0, 0, -c.flame.length * 0.3], [0, 0, 0], vis.hdr.flame * 1.4);
  }
  if (c.tip) {
    anchor = 0;
    g.add(new THREE.SphereGeometry(c.tip.radius, 12, 8), c.tip.color, [0, 0, h * c.tip.at], [0, 0, 0], vis.hdr.glow);
  }
  return { body, glow: g.empty ? null : g.build(), glowAnchor: anchor, metalness: c.metalness, roughness: c.roughness };
}

function shell(c: ShellModel): WeaponModel {
  const b = new GeoBuilder();
  const tail = c.tailLength;
  b.add(new THREE.SphereGeometry(c.radius, 18, 12), c.bodyColor, [0, 0, tail * 0.15]);
  b.add(new THREE.TorusGeometry(c.radius * 0.97, c.radius * 0.1, 8, 20), c.stripeColor, [0, 0, tail * 0.15 + c.radius * 0.25]);
  b.add(new THREE.TorusGeometry(c.radius * 0.8, c.radius * 0.09, 8, 20), c.bandColor, [0, 0, tail * 0.15 - c.radius * 0.55]);
  b.add(cylZ(c.radius * 0.18, c.radius * 0.3, tail, 10), c.tailColor, [0, 0, -c.radius * 0.7 - tail / 2 + tail * 0.4]);
  for (let i = 0; i < c.finCount; i++) {
    const a = (i / c.finCount) * Math.PI * 2;
    const r = c.finSpan / 2;
    b.add(new THREE.BoxGeometry(0.03, c.finSpan, tail * 0.6), c.stripeColor, [-Math.sin(a) * r, Math.cos(a) * r, -c.radius * 0.7 - tail * 0.45], [0, 0, a]);
  }
  return { body: b.build(), glow: null, glowAnchor: 0, metalness: c.metalness, roughness: c.roughness };
}

function disk(c: DiskModel): WeaponModel {
  const b = new GeoBuilder();
  b.add(new THREE.CylinderGeometry(c.radius * 0.88, c.radius, c.height, 28), c.bodyColor);
  b.add(new THREE.TorusGeometry(c.radius * 0.9, c.height * 0.14, 6, 28).rotateX(Math.PI / 2), c.rimColor, [0, c.height * 0.5, 0]);
  for (let i = 0; i < c.teeth; i++) {
    const a = (i / c.teeth) * Math.PI * 2;
    const r = c.radius + c.toothLength * 0.3;
    b.add(new THREE.ConeGeometry(c.height * 0.38, c.toothLength * 1.6, 5).rotateZ(-Math.PI / 2), c.toothColor, [Math.cos(a) * r, 0, -Math.sin(a) * r], [0, a, 0]);
  }
  b.add(new THREE.CylinderGeometry(c.lightRadius * 1.5, c.lightRadius * 1.8, c.height * 0.5, 14), c.rimColor, [0, c.height * 0.6, 0]);
  const g = new GeoBuilder();
  g.add(new THREE.SphereGeometry(c.lightRadius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c.lightColor, [0, c.height * 0.85, 0], [0, 0, 0], vis.hdr.glow);
  return { body: b.build(), glow: g.build(), glowAnchor: 0, metalness: c.metalness, roughness: c.roughness };
}
