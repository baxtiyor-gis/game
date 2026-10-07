import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh, propCfg, stdMat } from './common';

const col = propCfg.colors;

export interface DestructibleVisual {
  setDestroyed(): void;
  dispose(): void;
}

/** Sferik neft rezervuari: sfera, oyoqlar, ekvator halqasi, narvon va quvur. Vayrona: kuygan kosa + oyoq qoldiqlari. */
export function createTankVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const r = cfg.radius;
  const cy = cfg.centerHeight;
  const metal = stdMat('tank.metal', col.tank, 0.35, 0.65);
  const leg = stdMat('tank.leg', col.tankLeg, 0.7, 0.4);
  const burnt = stdMat('tank.burnt', col.tankDebris, 0.95, 0.1);
  const scorch = stdMat('tank.scorch', col.scorch, 1, 0, { transparent: true, opacity: 0.85 });
  const sphere = cachedGeo('tank.sphere', () => new THREE.SphereGeometry(1, 32, 20));
  const cyl = cachedGeo('unitCyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const cube = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));

  const intact = new THREE.Group();
  const body = mesh(sphere, metal, 0, cy, 0);
  body.scale.setScalar(r);
  intact.add(body);
  const ring = mesh(cachedGeo('tank.ring', () => new THREE.TorusGeometry(1, 0.025, 8, 40).rotateX(Math.PI / 2)), leg, 0, cy, 0);
  ring.scale.setScalar(r * 1.005);
  intact.add(ring);
  const legCount = 6;
  const legTop = cy - r * 0.55;
  for (let i = 0; i < legCount; i++) {
    const a = (i / legCount) * Math.PI * 2;
    const l = mesh(cyl, leg, Math.cos(a) * r * 0.68, legTop / 2, Math.sin(a) * r * 0.68);
    l.scale.set(0.22, legTop, 0.22);
    intact.add(l);
  }
  const lad = mesh(cube, leg, r * 0.98, cy, 0);
  lad.scale.set(0.12, r * 1.6, 0.6);
  lad.rotation.z = -0.12;
  intact.add(lad);
  const stub = mesh(cyl, leg, 0, cy + r + 0.35, 0);
  stub.scale.set(0.35, 0.7, 0.35);
  intact.add(stub);

  const wreck = new THREE.Group();
  wreck.visible = false;
  const bowl = mesh(cachedGeo('tank.bowl', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4)), burnt, 0, 0.9, 0);
  bowl.scale.set(r * 0.8, r * 0.35, r * 0.8);
  wreck.add(bowl);
  for (let i = 0; i < legCount; i += 2) {
    const a = (i / legCount) * Math.PI * 2;
    const s = mesh(cyl, burnt, Math.cos(a) * r * 0.68, 0.7, Math.sin(a) * r * 0.68);
    s.scale.set(0.22, 1.4, 0.22);
    s.rotation.z = 0.35 * (i % 4 === 0 ? 1 : -1);
    wreck.add(s);
  }
  const disc = new THREE.Mesh(cachedGeo('tank.scorch', () => new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)), scorch);
  disc.scale.setScalar(r * 1.5);
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
