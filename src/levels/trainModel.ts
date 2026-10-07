import * as THREE from 'three';
import { cachedGeo, stdMat } from './props/common';
import { put, unitBox, unitCyl } from './props/farmKit';
import type { Vec3 } from './props/common';
import cfg from '../../data/levels/train.json';

const col = cfg.colors;
export type CarKind = 'loco' | 'box' | 'tank' | 'flat' | 'hopper';

export interface CarModel {
  group: THREE.Group;
  /** Sog' holat va vayrona (portlashdan keyin) — biri ko'rinadi */
  intact: THREE.Group;
  wreck: THREE.Group;
}

const m = (k: string, c: string, r = 0.7, mt = 0.3): THREE.MeshStandardMaterial => stdMat(`train.${k}`, c, r, mt);
const wheelGeo = (): THREE.CylinderGeometry => cachedGeo('trainWheel', () => new THREE.CylinderGeometry(1, 1, 1, 14));

function wheels(g: THREE.Group, len: number, r: number, axles: number[]): void {
  for (const az of axles) {
    for (const sx of [-0.78, 0.78]) put(g, wheelGeo(), m('wheel', col.wheel, 0.6, 0.5), [sx, r, az * len], [r, 0.16, r], [0, 0, Math.PI / 2]);
    put(g, unitCyl(), m('wheel', col.wheel, 0.6, 0.5), [0, r, az * len], [0.12, 1.6, 0.12], [0, 0, Math.PI / 2]);
  }
}

function chassis(g: THREE.Group, w: number, len: number, y: number): void {
  put(g, unitBox(), m('chassis', col.chassis, 0.8, 0.3), [0, y, 0], [w, 0.35, len]);
}

function loco(g: THREE.Group, [w, h, len]: Vec3): void {
  const body = m('loco', col.loco, 0.45, 0.45);
  const trim = m('locoTrim', col.locoTrim, 0.5, 0.5);
  const dark = m('locoDark', col.locoDark, 0.7, 0.4);
  chassis(g, w, len, 0.75);
  put(g, unitCyl(), body, [0, 2.0, len * 0.16], [w * 0.4, len * 0.62, w * 0.4], [Math.PI / 2, 0, 0]);
  put(g, unitBox(), body, [0, 2.7, -len * 0.3], [w, 3.4, len * 0.3]);
  put(g, unitBox(), dark, [0, h, -len * 0.3], [w + 0.5, 0.2, len * 0.3 + 0.6]);
  for (const sx of [-1, 1]) put(g, unitBox(), m('glass', '#1a2630', 0.15, 0.7), [sx * (w / 2 + 0.02), 3.1, -len * 0.3], [0.06, 1.1, 1.8]);
  put(g, unitCyl(), dark, [0, 3.7, len * 0.36], [0.4, 1.4, 0.4]);
  put(g, unitCyl(), trim, [0, 4.3, len * 0.36], [0.55, 0.25, 0.55]);
  put(g, unitCyl(), trim, [0, 3.2, len * 0.14], [0.45, 0.5, 0.45]);
  put(g, unitBox(), dark, [0, 0.9, len / 2 + 0.55], [w * 0.9, 0.5, 1.2], [-0.5, 0, 0]);
  const lamp = stdMat('train.lamp', col.lamp, 0.2, 0.1, { emissive: col.lamp, emissiveIntensity: 1.2 });
  put(g, unitCyl(), lamp, [0, 2.1, len * 0.16 + len * 0.31 + 0.1], [0.4, 0.15, 0.4], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) put(g, unitBox(), trim, [sx * (w / 2 + 0.02), 1.3, 0], [0.05, 0.15, len * 0.9]);
  wheels(g, len, 0.55, [-0.38, -0.22, 0.14, 0.3, 0.42]);
}

function freight(g: THREE.Group, kind: CarKind, [w, h, len]: Vec3): void {
  chassis(g, w, len, 0.6);
  if (kind === 'box') {
    put(g, unitBox(), m('box', col.box, 0.85, 0.05), [0, 0.8 + (h - 0.8) / 2, 0], [w, h - 0.8, len * 0.94]);
    put(g, unitBox(), m('boxRoof', '#5a2a20', 0.8, 0.1), [0, h + 0.05, 0], [w + 0.2, 0.15, len]);
    for (const sx of [-1, 1]) put(g, unitBox(), m('boxDoor', col.boxDoor, 0.9, 0.05), [sx * (w / 2 + 0.03), 2.3, 0], [0.08, 2.4, len * 0.34]);
  } else if (kind === 'tank') {
    put(g, unitCyl(), m('tank', col.tank, 0.4, 0.6), [0, 2.35, 0], [w * 0.5, len * 0.92, w * 0.5], [Math.PI / 2, 0, 0]);
    put(g, unitCyl(), m('chassis', col.chassis), [0, 3.95, 0], [0.5, 0.3, 0.5]);
  } else if (kind === 'flat') {
    put(g, unitBox(), m('flat', col.flat, 0.9, 0.1), [0, 0.85, 0], [w, 0.12, len]);
    for (let i = 0; i < 3; i++) put(g, unitBox(), m('cargo', col.cargo, 0.9, 0.05), [(i - 1) * 0.95, 1.65, (i % 2 ? -1 : 1) * 0.6], [0.85, 1.5, len * 0.6]);
  } else {
    put(g, unitBox(), m('hopper', col.hopper, 0.8, 0.2), [0, 2.3, 0], [w, 2.0, len * 0.9]);
    for (const sz of [-1, 1]) put(g, unitBox(), m('hopper', col.hopper, 0.8, 0.2), [0, 1.0, sz * len * 0.25], [w * 0.5, 0.9, len * 0.2], [0, 0, 0]);
  }
  wheels(g, len, 0.45, [-0.34, -0.22, 0.22, 0.34]);
}

/** Vayrona: qoraygan korpus parchalari va cho'g' (portlashdan keyin). */
function wreckPile(g: THREE.Group, [w, h, len]: Vec3): void {
  const char = m('wreck', col.wreck, 0.95, 0.05);
  chassis(g, w, len, 0.6);
  put(g, unitBox(), char, [0, 1.1, 0], [w * 0.9, 1.0, len * 0.85]);
  put(g, unitBox(), char, [w * 0.2, 1.8, len * 0.1], [w * 0.5, 0.9, len * 0.4], [0.2, 0.3, 0.15]);
  put(g, unitBox(), char, [-w * 0.25, 1.6, -len * 0.2], [0.3, 1.2, len * 0.3], [0.1, -0.2, -0.5]);
  put(g, unitBox(), stdMat('train.ember', col.ember, 0.8, 0, { emissive: col.ember, emissiveIntensity: 1.4 }), [0, 1.65, 0], [w * 0.5, 0.1, len * 0.4]);
  wheels(g, len, 0.45, [-0.34, -0.22, 0.22, 0.34]);
  void h;
}

export function buildCar(kind: CarKind, size: Vec3): CarModel {
  const group = new THREE.Group();
  const intact = new THREE.Group();
  const wreck = new THREE.Group();
  if (kind === 'loco') loco(intact, size);
  else {
    freight(intact, kind, size);
    wreckPile(wreck, size);
  }
  wreck.visible = false;
  group.add(intact, wreck);
  return { group, intact, wreck };
}
