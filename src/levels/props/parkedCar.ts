import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { DestructibleType, PropDef } from '../types';
import { box, cachedGeo, mesh } from './common';
import type { Origin, PropBuild } from './common';
import type { DestructibleVisual } from './tank';
import { put, unitBox, unitCyl } from './farmKit';
import { casino, cmat, neon } from './casinoKit';
import { mergeStatic } from '../mergeStatic';

const C = casino.car;
const PAINT = casino.colors.cars;

/** 70-yillar kupesi: past kuzov, orqa qanotlar (fin), kabina, g'ildiraklar, yoritilgan faralar. Lokal +x — old, asosi y=0. */
function carBody(g: THREE.Object3D, scheme: number, dead = false): void {
  const paint = cmat(dead ? 'burnt' : PAINT[scheme % PAINT.length]!, 0.45, 0.4);
  const glass = cmat(dead ? 'burnt' : 'glass', 0.15, 0.6);
  const tire = cmat('tires', 0.95, 0.05);
  const [L, , W] = C.size;
  put(g, unitBox(), paint, [0, C.bodyY + C.bodyH / 2, 0], [L, C.bodyH, W]);
  put(g, unitBox(), glass, [C.cabinX, C.bodyY + C.bodyH + C.cabin[1] / 2, 0], C.cabin as [number, number, number]);
  put(g, unitBox(), paint, [C.cabinX, C.bodyY + C.bodyH + C.cabin[1] + 0.03, 0], [C.cabin[0] - 0.3, 0.06, C.cabin[2] - 0.1]);
  for (const sz of [-1, 1]) {
    put(g, unitBox(), paint, [-L / 2 + 0.3, C.bodyY + C.bodyH + C.fin / 2, sz * (W / 2 - 0.15)], [0.9, C.fin, 0.2]);
    for (const sx of [-1, 1]) {
      const wh = put(g, unitCyl(), tire, [sx * (L / 2 - 0.75), C.wheelR, sz * (W / 2 - 0.1)], [C.wheelR, 0.3, C.wheelR], [Math.PI / 2, 0, 0]);
      wh.castShadow = false;
    }
  }
  if (dead) return;
  for (const sz of [-1, 1]) put(g, unitBox(), neon('red'), [-L / 2 - 0.01, C.bodyY + C.bodyH * 0.55, sz * W * 0.32], [0.05, 0.2, 0.4]).castShadow = false;
}

/** Statik to'xtab turgan mashina (kollayder — kuboid). `scheme` — bo'yoq, `lift` — poydevor balandligi (garaj tomi uchun). */
export function createParkedCar(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const g = new THREE.Group();
  const lift = def.lift ?? 0;
  carBody(g, def.scheme ?? 0);
  g.position.set(o.x, o.y + lift, o.z);
  g.rotation.y = o.yaw;
  const lo: Origin = { ...o, y: o.y + lift };
  return { object: g, colliders: [box(R, lo, [0, C.colliderHalf[1], 0], C.colliderHalf as [number, number, number])] };
}

/** Portlovchi mashina (destructible): bo'yog'i joylashuvdan tanlanadi; vayrona — kuygan, yassilangan kuzov + kuyindi dog'i. */
export function createExplosiveCarVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const scheme = Math.abs(Math.floor(x * 3.7 + z * 5.3));
  const intact = new THREE.Group();
  carBody(intact, scheme);
  const wreck = new THREE.Group();
  wreck.visible = false;
  const burnt = new THREE.Group();
  carBody(burnt, 0, true);
  burnt.scale.set(1, 0.7, 1);
  burnt.rotation.set(0.1, 0.3, 0.18);
  wreck.add(burnt);
  const disc = mesh(cachedGeo('casino.scorch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), cmat('scorch', 1, 0, { transparent: true, opacity: 0.8 }));
  disc.scale.setScalar(cfg.radius * 1.6);
  disc.position.y = 0.06;
  disc.castShadow = false;
  wreck.add(disc);

  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  root.add(intact, wreck);
  root.updateMatrixWorld(true);
  const whole = new THREE.Group();
  const freeMerged = mergeStatic([intact], whole);
  root.remove(intact);
  parent.add(root, whole);
  return {
    setDestroyed() {
      whole.visible = false;
      wreck.visible = true;
    },
    dispose() {
      parent.remove(root, whole);
      freeMerged();
    },
  };
}
