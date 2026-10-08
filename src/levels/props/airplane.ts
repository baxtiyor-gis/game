import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { placed } from './common';
import type { Origin, PropBuild, Vec3 } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { air, amat, finGeo, taperCyl, unitSphere, wingGeo } from './airKit';

interface WingSpec { span: number; root: number; tip: number; sweep: number; thick: number; z: number; level: number }
interface FinSpec { h: number; root: number; tip: number; back: number; count: number; x: number }
interface StabSpec { span: number; root: number; tip: number; sweep: number; z: number; level: number }
interface EngSpec { kind: string; x: number[]; radius: number; length: number; dy: number }
export interface PlaneSpec {
  length: number; radius: number; ride: number; nose: number; taper: number;
  wing: WingSpec; fin: FinSpec; stab: StabSpec; engines: EngSpec; gear: boolean; windows: boolean; schemes: string[][];
}

/** Samolyot to'qnashuv qutisi (samolyot lokal koordinatasida; rotY — y atrofida burilish). */
export interface PlaneBox { c: Vec3; h: Vec3; rotY: number }

export interface PlaneModel {
  group: THREE.Group;
  /** Aylanadigan parraklar (z o'qi atrofida) */
  spinners: THREE.Object3D[];
  boxes: PlaneBox[];
  halfLen: number;
  halfSpan: number;
}

export const planeSpecs = air.planes as unknown as Record<string, PlaneSpec>;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Procedural samolyot: fuselaj (+z burun), trapetsiya qanotlar, dum, dvigatellar, shassi.
 * damage: '' (butun) | 'wingless' | 'tailless' | 'split' | 'noEngines' | 'belly'.
 */
export function buildPlane(kind: string, damage = '', scheme = 0): PlaneModel {
  const sp = planeSpecs[kind];
  if (!sp) throw new Error(`Noma'lum samolyot turi: ${kind}`);
  const dm = air.damage;
  const [bodyKey, trimKey] = sp.schemes[scheme % sp.schemes.length]!;
  const body = amat(bodyKey!, 0.5, 0.55);
  const trim = amat(trimKey!, 0.6, 0.4);
  const glass = amat('glass', 0.15, 0.7);
  const dark = amat('dark', 0.9, 0.1);
  const strut = amat('strut', 0.6, 0.5);
  const belly = damage === 'belly' || damage === 'wingless';
  const noWings = damage === 'wingless';
  const noTail = damage === 'tailless';
  const split = damage === 'split';
  const ride = belly ? dm.bellyRide : sp.ride;
  const { radius: r, length: L, nose, taper, wing, fin, stab } = sp;
  const axisY = ride + r;
  const hl = wing.span / 2;
  const wingY = axisY + wing.level * r;
  const z0 = L * dm.splitAt;
  const spinners: THREE.Object3D[] = [];
  const boxes: PlaneBox[] = [];

  const g = new THREE.Group();
  const rear = new THREE.Group();
  rear.position.set(0, 0, z0);
  if (split) {
    rear.position.z -= dm.splitGap;
    rear.rotation.set(0, dm.splitYaw, dm.splitRoll);
  }
  g.add(rear);
  const cylZ = (p: THREE.Object3D, m: THREE.Material, za: number, zb: number, rad: number, x = 0, y = axisY, zo = 0): void => {
    put(p, unitCyl(), m, [x, y, (za + zb) / 2 - zo], [rad, zb - za, rad], [Math.PI / 2, 0, 0]);
  };

  // Fuselaj: old qism, burun, orqa qism (+ dum konusi)
  cylZ(g, body, z0, L / 2 - nose, r);
  put(g, unitSphere(), body, [0, axisY, L / 2 - nose], [r, r, nose]);
  put(g, unitSphere(), glass, [0, axisY + r * 0.45, L / 2 - nose - r * 0.4], [r * 0.7, r * 0.55, r * 1.3]);
  const tailEnd = noTail ? -L / 2 + taper : -L / 2;
  cylZ(rear, body, -L / 2 + taper, z0, r, 0, axisY, z0);
  if (!noTail) put(rear, taperCyl(0.18), body, [0, axisY, -L / 2 + taper / 2 - z0], [r, taper, r], [-Math.PI / 2, 0, 0]);
  else put(rear, unitCyl(), dark, [0, axisY, -L / 2 + taper - z0 - 0.05], [r * 0.95, 0.12, r * 0.95], [Math.PI / 2, 0, 0]);
  if (split) put(g, unitCyl(), dark, [0, axisY, z0 + 0.05], [r * 0.95, 0.12, r * 0.95], [Math.PI / 2, 0, 0]);
  cylZ(g, trim, L / 2 - nose - 2.2, L / 2 - nose - 1.4, r * 1.015);
  cylZ(rear, trim, z0 - 3.2, z0 - 2.4, r * 1.015, 0, axisY, z0);
  if (sp.windows) {
    for (const s of [1, -1]) put(g, unitBox(), glass, [s * r * 0.97, axisY + r * 0.25, (z0 + L / 2 - nose) / 2], [0.1, 0.45, (L / 2 - nose - z0) * 0.8]);
  }

  // Qanotlar
  const wingZ = wing.z;
  for (const s of [1, -1] as const) {
    if (noWings) put(g, wingGeo(s, 1.4, wing.root, wing.root * 0.9, 0.2, wing.thick), trim, [0, wingY, wingZ]);
    else put(g, wingGeo(s, hl, wing.root, wing.tip, wing.sweep, wing.thick), body, [0, wingY, wingZ]);
  }
  if (!noWings) {
    const dz = -wing.sweep + (wing.root - wing.tip) / 2;
    const half = Math.hypot(hl, dz) / 2;
    const bottom = wingY - wing.thick / 2 < air.groundBlock ? 0 : wingY - wing.thick / 2;
    const top = wingY + wing.thick / 2;
    const zc = wingZ - wing.root / 2 + dz / 2;
    for (const s of [1, -1]) boxes.push({ c: [s * hl / 2, (top + bottom) / 2, zc], h: [half, (top - bottom) / 2, (wing.root + wing.tip) / 4], rotY: s * Math.atan2(-dz, hl) });
  }

  // Dum
  if (!noTail) {
    const fz = -L / 2 + taper + fin.root * 0.3 - z0;
    for (let i = 0; i < fin.count; i++) {
      const x = fin.count === 1 ? 0 : (i === 0 ? -1 : 1) * fin.x;
      put(rear, finGeo(fin.h, fin.root, fin.tip, fin.back, 0.28), body, [x, axisY, fz]);
    }
    put(rear, finGeo(fin.h * 0.4, fin.root * 0.9, fin.tip, fin.back * 0.5, 0.3), trim, [0, axisY + fin.h * 0.5, fz - fin.back * 0.3]);
    for (const s of [1, -1] as const) put(rear, wingGeo(s, stab.span / 2, stab.root, stab.tip, stab.sweep, 0.25), body, [0, axisY + stab.level * r, stab.z - z0]);
  }

  // Dvigatellar
  const eng = sp.engines;
  const bladeR = eng.radius * 2.3;
  const engine = (x: number, zLE: number, y: number): void => {
    const zc = zLE + 0.9 - eng.length / 2;
    cylZ(g, body, zc - eng.length / 2, zc + eng.length / 2, eng.radius, x, y);
    if (eng.kind === 'prop') {
      const pr = new THREE.Group();
      pr.position.set(x, y, zc + eng.length / 2 + 0.2);
      put(pr, taperCyl(0.2), trim, [0, 0, -0.1], [eng.radius * 0.5, 0.7, eng.radius * 0.5], [Math.PI / 2, 0, 0]);
      for (const a of [0, Math.PI / 2]) put(pr, unitBox(), dark, [0, 0, 0.15], [0.26, bladeR * 2, 0.06], [0, 0, a]);
      g.add(pr);
      spinners.push(pr);
    } else {
      cylZ(g, dark, zc + eng.length / 2 - 0.05, zc + eng.length / 2 + 0.05, eng.radius * 0.82, x, y);
      put(g, taperCyl(0.55), dark, [x, y, zc - eng.length / 2 - 0.3], [eng.radius * 0.85, 0.8, eng.radius * 0.85], [-Math.PI / 2, 0, 0]);
    }
  };
  if (damage !== 'noEngines') {
    if (eng.kind === 'exhaust') put(rear, unitCyl(), dark, [0, axisY, -L / 2 - 0.3 - z0], [eng.radius, 1.0, eng.radius], [Math.PI / 2, 0, 0]);
    else if (eng.kind === 'nose') engine(0, L / 2 + 0.4, axisY);
    else if (!noWings) {
      for (const ex of eng.x) {
        const zLE = wingZ - (wing.sweep * ex) / hl;
        engine(ex, zLE, wingY + eng.dy);
        engine(-ex, zLE, wingY + eng.dy);
      }
    }
  }

  // Shassi
  if (sp.gear && !belly) {
    const wr = 0.3 + ride * 0.3;
    const gear = (x: number, z: number): void => {
      put(g, unitCyl(), strut, [x, (wr + axisY) / 2, z], [0.14, axisY - wr, 0.14]);
      put(g, unitCyl(), amat('tire', 0.9, 0.05), [x, wr, z], [wr, 0.4, wr], [0, 0, Math.PI / 2]);
    };
    for (const s of [1, -1]) gear(s * r * 0.8, wingZ - wing.root / 2);
    gear(0, L / 2 - nose - 1);
  }

  // Fuselaj qutilari (kamar-kam: dum konusi va burun uchlari o'tkazilmaydi)
  const zBack = tailEnd + (noTail ? 0 : taper * 0.5);
  const zFront = L / 2 - nose * 0.3;
  const fh = r * 0.85;
  const frontLen = zFront - z0;
  boxes.push({ c: [0, axisY, z0 + frontLen / 2], h: [fh, r, frontLen / 2], rotY: 0 });
  const rearLen = z0 - zBack;
  const pivot = z0 - (split ? dm.splitGap : 0);
  const rc = -rearLen / 2;
  const ya = split ? dm.splitYaw : 0;
  boxes.push({ c: [rc * Math.sin(ya), axisY, pivot + rc * Math.cos(ya)], h: [fh, r, rearLen / 2], rotY: ya });

  return { group: g, spinners, boxes, halfLen: L / 2, halfSpan: noWings ? r : hl };
}

/** Statik samolyot (fyuzelyaj/qanotlar to'qnashuv qutilari bilan). def.variant = tur, def.damage = buzilish. */
export function createAirplane(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const model = buildPlane(def.variant ?? 'bomber', def.damage ?? '', def.scheme ?? 0);
  model.group.position.set(o.x, o.y, o.z);
  model.group.rotation.y = o.yaw;
  const colliders = model.boxes.map((b) =>
    placed(R.ColliderDesc.cuboid(...b.h), o, b.c, new THREE.Quaternion().setFromAxisAngle(UP, b.rotY)));
  return { object: model.group, colliders };
}
