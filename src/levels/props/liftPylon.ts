import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh } from './common';
import type { DestructibleVisual } from './tank';
import { unitBox, unitCyl } from './farmKit';
import { smat, ski } from './skiKit';
import { mergeStatic } from '../mergeStatic';

const L = ski.lift;

/**
 * Kanat yo'li ustuni (destructible): konussimon po'lat ustun, tepada ko'ndalang to'sin va ikki g'altak (arqonlar x=±gap/2 da).
 * Vayrona: yiqilgan ustun (qiyshaygan) va uzilgan to'sin; qor ustida kuyindi dog'i.
 */
export function createLiftPylonVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const steel = smat('steel', 0.5, 0.5);
  const dark = smat('steelDark', 0.6, 0.5);
  const burnt = smat('burnt', 0.95, 0.1);
  const mast = cachedGeo('ski.pylon.mast', () => new THREE.CylinderGeometry(L.pylon.topR, L.pylon.baseR, 1, 8).translate(0, 0.5, 0));
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], into: THREE.Object3D): THREE.Mesh => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    into.add(o);
    return o;
  };
  const H = cfg.height;
  const armW = L.gap + L.pylon.armOver * 2;
  const intact = new THREE.Group();
  mk(unitBox(), dark, [0, 0.2, 0], [L.pylon.footing, 0.4, L.pylon.footing], intact);
  mk(mast, steel, [0, 0.2, 0], [1, H - 0.2, 1], intact);
  mk(unitBox(), dark, [0, H - 0.25, 0], [armW, 0.3, 0.35], intact);
  for (const sx of [-1, 1]) {
    mk(unitCyl(), dark, [sx * L.gap / 2, H + 0.05, 0], [0.32, 0.5, 0.32], intact).rotation.x = Math.PI / 2;
    mk(unitBox(), dark, [sx * L.gap / 2, H - 0.45, 0], [0.12, 0.5, 0.12], intact);
  }

  const wreck = new THREE.Group();
  wreck.visible = false;
  const fallen = mk(mast, burnt, [0, 0.2, 0], [1, H * 0.9, 1], wreck);
  fallen.rotation.set(0, 0, -1.25);
  mk(unitBox(), burnt, [H * 0.6, 0.5, 0.8], [armW * 0.5, 0.25, 0.3], wreck).rotation.set(0.2, 0.6, 0.3);
  const disc = new THREE.Mesh(cachedGeo('ski.scorch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), smat('burnt', 1, 0, { transparent: true, opacity: 0.8 }));
  disc.scale.setScalar(cfg.radius * 2.4);
  disc.position.y = 0.06;
  disc.receiveShadow = true;
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
