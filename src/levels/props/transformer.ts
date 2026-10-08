import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh } from './common';
import type { DestructibleVisual } from './tank';
import { unitBox, unitCyl } from './farmKit';
import { dam, dmat } from './damKit';
import { mergeStatic } from '../mergeStatic';

const T = dam.transformer;

/**
 * Elektr transformatori (destructible): yashil-kulrang bak, sovutish qovurg'alari, tepada 3 chinni izolyator, sariq ogohlantirish.
 * Vayrona: kuygan bak + sinib qolgan izolyator va kuyindi dog'i.
 */
export function createTransformerVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const tank = dmat('tank', 0.5, 0.45);
  const steel = dmat('steelDark', 0.6, 0.5);
  const porcelain = dmat('porcelain', 0.35, 0.1);
  const yellow = dmat('yellow', 0.6, 0.1);
  const burnt = dmat('scorch', 0.95, 0.1);
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], into: THREE.Object3D): THREE.Mesh => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    into.add(o);
    return o;
  };
  const insulator = cachedGeo('dam.insulator', () => new THREE.CylinderGeometry(0.3, 0.45, 1, 10));

  const intact = new THREE.Group();
  mk(unitBox(), steel, [0, 0.15, 0], [T.w + 0.4, 0.3, T.d + 0.4], intact);
  mk(unitBox(), tank, [0, 0.3 + T.h / 2, 0], [T.w, T.h, T.d], intact);
  mk(unitBox(), steel, [0, 0.3 + T.h + 0.1, 0], [T.w + 0.2, 0.2, T.d + 0.2], intact);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < T.fins; i++) mk(unitBox(), steel, [sx * (T.w / 2 + 0.2), 0.3 + T.h / 2, -T.d / 2 + (T.d / T.fins) * (i + 0.5)], [0.35, T.h * 0.85, 0.12], intact);
  }
  for (let i = 0; i < T.insulators; i++) {
    const ix = (i - (T.insulators - 1) / 2) * (T.w / T.insulators + 0.1);
    mk(insulator, porcelain, [ix, 0.4 + T.h + 0.6, 0], [1, 1.2, 1], intact);
    mk(unitCyl(), steel, [ix, 0.4 + T.h + 1.3, 0], [0.22, 0.2, 0.22], intact);
  }
  mk(unitBox(), yellow, [0, 0.3 + T.h * 0.55, T.d / 2 + 0.05], [0.9, 0.7, 0.05], intact);

  const wreck = new THREE.Group();
  wreck.visible = false;
  mk(unitBox(), burnt, [0, 0.3 + T.h * 0.3, 0], [T.w, T.h * 0.6, T.d], wreck).rotation.z = 0.05;
  mk(insulator, burnt, [T.w * 0.25, 0.3 + T.h * 0.6 + 0.2, 0], [1, 0.5, 1], wreck).rotation.z = 0.5;
  const disc = new THREE.Mesh(cachedGeo('dam.scorch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), dmat('scorch', 1, 0, { transparent: true, opacity: 0.85 }));
  disc.scale.setScalar(cfg.radius * 2);
  disc.position.y = 0.05;
  disc.receiveShadow = true;
  wreck.add(disc);

  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  root.add(intact, wreck);
  // Butun (sog') ko'rinish materiallar bo'yicha bitta mesh ga birlashtiriladi (draw call kamayadi)
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
