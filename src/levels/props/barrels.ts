import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DestructibleType } from '../types';
import { cachedGeo, propCfg, stdMat } from './common';
import type { DestructibleVisual } from './tank';

const col = propCfg.colors;

export interface BarrelItem {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Bochkalar: bitta InstancedMesh (rangli); vayron bo'lganda yassilanadi va qoraydi. */
export class BarrelField {
  readonly mesh: THREE.InstancedMesh;
  private readonly m4 = new THREE.Matrix4();

  constructor(parent: THREE.Object3D, private readonly cfg: DestructibleType, private readonly items: BarrelItem[]) {
    const r = cfg.radius;
    const h = cfg.height;
    const geo = cachedGeo('barrel', () => {
      const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(r, r, h, 14)];
      for (let i = 0; i < propCfg.barrel.ribs; i++) {
        const t = new THREE.TorusGeometry(r * 1.01, r * 0.07, 6, 14).rotateX(Math.PI / 2);
        t.translate(0, h * (0.25 + i * 0.5) - h / 2, 0);
        parts.push(t);
      }
      return mergeGeometries(parts)!;
    });
    this.mesh = new THREE.InstancedMesh(geo, stdMat('barrel', '#ffffff', 0.5, 0.55), Math.max(1, items.length));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.count = items.length;
    const c = new THREE.Color();
    items.forEach((_, i) => {
      this.setMatrix(i, false);
      this.mesh.setColorAt(i, c.set(col.barrels[i % col.barrels.length]!));
    });
    parent.add(this.mesh);
  }

  private setMatrix(i: number, destroyed: boolean): void {
    const it = this.items[i]!;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(destroyed ? 1.45 : 0, it.yaw, destroyed ? 0.4 : 0, 'YXZ'));
    const lift = destroyed ? this.cfg.radius * 0.8 : this.cfg.height / 2;
    this.m4.compose(new THREE.Vector3(it.x, it.y + lift, it.z), q, new THREE.Vector3(1, destroyed ? 0.55 : 1, 1));
    this.mesh.setMatrixAt(i, this.m4);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  visual(i: number): DestructibleVisual {
    return {
      setDestroyed: () => {
        this.setMatrix(i, true);
        this.mesh.setColorAt(i, new THREE.Color(col.barrelDebris));
        this.mesh.instanceColor!.needsUpdate = true;
      },
      dispose: () => undefined,
    };
  }

  dispose(parent: THREE.Object3D): void {
    parent.remove(this.mesh);
    this.mesh.dispose();
  }
}
