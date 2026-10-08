import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef, Vec2 } from '../types';
import { box, stdMat } from './common';
import type { Origin, PropBuild } from './common';
import { farm, fc, mat, put, unitBox } from './farmKit';

/**
 * Yog'och ko'prik ariq ustida. Origin (y) — qirg'oq balandligi; length — z bo'ylab, width — eni.
 * Ustki yuza qirg'oq sathida: pastga qalin taxta, yon to'siqlar kollayderli.
 */
export function createBridge(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const { deckThickness: dt, railHeight: rh, railThickness: rt } = farm.bridge;
  const len = def.length ?? 18;
  const w = def.width ?? 6;
  // variant 'steel': po'lat-beton ko'prik (kanyon/to'g'on arenalari), aks holda yog'och
  const steel = def.variant === 'steel';
  const plank = steel ? mat('deckSteel', fc.deckSteel, 0.7, 0.35) : mat('plank', fc.plank, 0.9, 0.03);
  const dark = steel ? mat('railSteel', fc.railSteel, 0.6, 0.5) : mat('woodDark', fc.woodDark, 0.9, 0.03);
  const g = new THREE.Group();
  put(g, unitBox(), plank, [0, -dt / 2 + 0.04, 0], [w, dt, len]);
  const n = Math.floor(len / 0.9);
  for (let i = 0; i < n; i++) put(g, unitBox(), dark, [0, 0.06, -len / 2 + (i + 0.5) * (len / n)], [w * 0.98, 0.04, 0.05]);
  const colliders = [box(R, o, [0, -dt / 2 + 0.04, 0], [w / 2, dt / 2, len / 2])];
  for (const sx of [-1, 1]) {
    put(g, unitBox(), dark, [sx * (w / 2 - rt / 2), rh, 0], [rt, rt, len]);
    put(g, unitBox(), dark, [sx * (w / 2 - rt / 2), rh / 2, 0], [rt, rt, len]);
    for (let i = 0; i <= 6; i++) put(g, unitBox(), dark, [sx * (w / 2 - rt / 2), rh / 2, -len / 2 + (len * i) / 6], [rt * 1.4, rh + 0.1, rt * 1.4]);
    colliders.push(box(R, o, [sx * (w / 2 - rt / 2), rh / 2 + 0.1, 0], [rt, rh / 2, len / 2]));
  }
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) put(g, unitBox(), dark, [sx * (w / 2 - 0.4), -dt - 0.8, sz * (len / 2 - 0.6)], [0.4, 2.2, 0.4]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}

/** Ariq suvi: nuqtalar bo'ylab keng lenta (y = creek.level), yarim shaffof. Kollayder yo'q. */
export function buildCreek(points: Vec2[], width: number, level: number): THREE.Group {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], level, p[1])), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / farm.creek.segment));
  const pts = curve.getSpacedPoints(n);
  const pos: number[] = [];
  const idx: number[] = [];
  const tan = new THREE.Vector3();
  pts.forEach((p, i) => {
    tan.subVectors(pts[Math.min(n, i + 1)]!, pts[Math.max(0, i - 1)]!).setY(0).normalize();
    const nx = -tan.z * (width / 2);
    const nz = tan.x * (width / 2);
    pos.push(p.x - nx, level, p.z - nz, p.x + nx, level, p.z + nz);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const water = new THREE.Mesh(geo, stdMat('farm.water', fc.water, 0.15, 0.3, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  water.receiveShadow = true;
  water.userData.ownGeo = true;
  const g = new THREE.Group();
  g.name = 'creek';
  g.add(water);
  return g;
}

