import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh } from './common';
import type { DestructibleVisual } from './tank';
import { unitBox } from './farmKit';
import { smat, ski } from './skiKit';
import { mergeStatic } from '../mergeStatic';

const T = ski.propane;

/**
 * Propan tanki (destructible): yotiq oq silindr, yarim sferik uchlar, qizil belbog', tayanch beshigi va ustida klapan.
 * Vayrona: yorilgan kuygan tank qobig'i + kuyindi dog'i.
 */
export function createPropaneVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const white = smat('propane', 0.35, 0.3);
  const band = smat('propaneBand', 0.5, 0.2);
  const steel = smat('cradle', 0.7, 0.4);
  const burnt = smat('burnt', 0.95, 0.1);
  const body = cachedGeo('ski.propane.body', () => new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2));
  const cap = cachedGeo('ski.propane.cap', () => new THREE.SphereGeometry(1, 14, 8));
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], into: THREE.Object3D): THREE.Mesh => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    into.add(o);
    return o;
  };
  const cy = T.legH + T.radius;
  const half = T.length / 2;
  const intact = new THREE.Group();
  mk(body, white, [0, cy, 0], [T.length, T.radius, T.radius], intact);
  for (const sx of [-1, 1]) mk(cap, white, [sx * half, cy, 0], [T.radius, T.radius, T.radius], intact);
  for (const sx of [-0.55, 0, 0.55]) mk(body, band, [sx * half, cy, 0], [0.22, T.radius * 1.02, T.radius * 1.02], intact);
  for (const sx of [-0.6, 0.6]) {
    mk(unitBox(), steel, [sx * half, T.legH / 2, 0], [0.35, T.legH, T.radius * 1.6], intact);
  }
  mk(unitBox(), steel, [0, cy + T.radius + 0.18, 0], [0.4, 0.36, 0.4], intact);

  const wreck = new THREE.Group();
  wreck.visible = false;
  const shell = mk(body, burnt, [0, T.radius * 0.7, 0.2], [T.length * 0.85, T.radius * 0.75, T.radius * 0.75], wreck);
  shell.rotation.set(0.3, 0.4, 0.25);
  mk(cap, burnt, [half * 0.9, T.radius * 0.5, -T.radius], [T.radius * 0.8, T.radius * 0.6, T.radius * 0.8], wreck);
  const disc = new THREE.Mesh(cachedGeo('ski.scorch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), smat('burnt', 1, 0, { transparent: true, opacity: 0.8 }));
  disc.scale.setScalar(cfg.radius * 1.8);
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
