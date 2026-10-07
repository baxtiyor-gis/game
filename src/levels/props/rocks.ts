import * as THREE from 'three';
import { cachedGeo, propCfg, stdMat } from './common';

export interface RockItem {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Yarim o'qlar (m) */
  sx: number;
  sy: number;
  sz: number;
}

function lumpyRock(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.9 - v.x * 1.3) + Math.sin(v.y * 4.3 + v.z * 2.1) * 0.5;
    v.multiplyScalar(1 + n * propCfg.rock.lumpiness * 0.5);
    p.setXYZ(i, v.x, Math.max(v.y, -0.25), v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Qoyalar: bitta InstancedMesh (soyali, rang farqli). */
export function buildRocks(items: RockItem[]): THREE.InstancedMesh {
  const mat = stdMat('rock', '#ffffff', 0.95, 0.02, { flatShading: true });
  const mesh = new THREE.InstancedMesh(cachedGeo('rock', lumpyRock), mat, Math.max(1, items.length));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = items.length;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const base = new THREE.Color(propCfg.colors.rock);
  items.forEach((it, i) => {
    q.setFromEuler(e.set(0, it.yaw, 0));
    m4.compose(new THREE.Vector3(it.x, it.y + it.sy * 0.25, it.z), q, new THREE.Vector3(it.sx, it.sy, it.sz));
    mesh.setMatrixAt(i, m4);
    const k = 0.8 + 0.4 * (Math.sin(i * 12.9898) * 0.5 + 0.5);
    mesh.setColorAt(i, c.copy(base).multiplyScalar(k));
  });
  return mesh;
}
