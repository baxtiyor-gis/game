import * as THREE from 'three';
import { cachedGeo } from './common';
import { smat, ski } from './skiKit';

export interface BankItem {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Uzunlik (z bo'ylab), m */
  length: number;
  /** Balandlik, m */
  height: number;
}

const B = ski.bank;

/** Qor uyumlari: cho'zilgan yarim ellipsoidlar, bitta InstancedMesh (yarmi yerga ko'milgan). */
export function buildSnowBanks(items: BankItem[]): THREE.InstancedMesh {
  const geo = cachedGeo('ski.bank', () => new THREE.SphereGeometry(1, 14, 8));
  const m = new THREE.InstancedMesh(geo, smat('snow', 0.8, 0.02), Math.max(1, items.length));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  items.forEach((it, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.yaw);
    m4.compose(pos.set(it.x, it.y, it.z), q, sc.set(it.height * B.widthFactor, it.height, it.length / 2));
    m.setMatrixAt(i, m4);
  });
  m.count = items.length;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
