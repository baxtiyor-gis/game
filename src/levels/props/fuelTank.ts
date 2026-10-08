import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh } from './common';
import type { DestructibleVisual } from './tank';
import { air, amat } from './airKit';
import { unitBox, unitCyl } from './farmKit';

const F = air.fuel;

/** Vertikal yoqilg'i tanki: silindr, gumbaz, qizil belbog', narvon, quvur. Vayrona: yassilangan qoraygan baraban + kuyindi dog'i. */
export function createFuelTankVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const r = cfg.radius;
  const h = cfg.height;
  const shell = amat('fuel', 0.4, 0.6);
  const stripe = amat('fuelStripe', 0.6, 0.3);
  const steel = amat('fuelDark', 0.7, 0.4);
  const burnt = amat('dark', 0.95, 0.1);
  const scorch = amat('scorch', 1, 0);
  const dome = cachedGeo('fuel.dome', () => new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], parent2: THREE.Object3D): THREE.Mesh => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    parent2.add(o);
    return o;
  };

  const intact = new THREE.Group();
  mk(unitCyl(), shell, [0, h / 2, 0], [r, h, r], intact);
  mk(dome, shell, [0, h, 0], [r, r * F.domeFactor, r], intact);
  mk(unitCyl(), stripe, [0, h * 0.62, 0], [r * 1.015, F.stripe, r * 1.015], intact);
  mk(unitCyl(), steel, [0, 0.25, 0], [r * 1.06, 0.5, r * 1.06], intact);
  mk(unitBox(), steel, [r + 0.05, h / 2, 0], [0.12, h, 0.7], intact);
  mk(unitCyl(), steel, [0, h + r * F.domeFactor + 0.3, 0], [0.4, 0.6, 0.4], intact);
  mk(unitCyl(), steel, [-r - 0.7, 0.9, 0], [0.22, 1.8, 0.22], intact);

  const wreck = new THREE.Group();
  wreck.visible = false;
  mk(unitCyl(), burnt, [0, h * 0.18, 0], [r * 0.95, h * 0.36, r * 0.95], wreck).rotation.z = 0.08;
  mk(unitCyl(), burnt, [r * 0.35, h * 0.4, 0], [r * 0.7, 0.3, r * 0.7], wreck).rotation.set(0.3, 0, 0.5);
  const disc = new THREE.Mesh(cachedGeo('fuel.scorch', () => new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)), scorch);
  disc.scale.setScalar(r * 1.7);
  disc.position.y = 0.05;
  disc.receiveShadow = true;
  wreck.add(disc);

  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  root.add(intact, wreck);
  parent.add(root);
  return {
    setDestroyed() {
      intact.visible = false;
      wreck.visible = true;
    },
    dispose() {
      parent.remove(root);
    },
  };
}
