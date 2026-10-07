import * as THREE from 'three';
import { cachedGeo, stdMat } from './common';
import { farm, fc } from './farmKit';

export interface FenceItem {
  x: number;
  z: number;
  yaw: number;
  length: number;
}

/** Yog'och to'siq: ustunlar va 2 qator taxta (ikkita InstancedMesh); ustunlar yer relyefiga mos. */
export function buildFences(items: FenceItem[], heightAt: (x: number, z: number) => number): THREE.Group {
  const { postSpacing, height, postSize } = farm.fence;
  const posts: THREE.Vector3[] = [];
  const rails: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const it of items) {
    const n = Math.max(1, Math.round(it.length / postSpacing));
    const c = Math.cos(it.yaw);
    const s = Math.sin(it.yaw);
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= n; i++) {
      const lz = -it.length / 2 + (it.length * i) / n;
      const x = it.x + lz * s;
      const z = it.z + lz * c;
      const p = new THREE.Vector3(x, heightAt(x, z), z);
      posts.push(p);
      if (prev) rails.push([prev, p]);
      prev = p;
    }
  }
  const boxGeo = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const wood = stdMat('farm.fence', fc.fence, 0.9, 0.03);
  const pm = new THREE.InstancedMesh(boxGeo, wood, Math.max(1, posts.length));
  const rm = new THREE.InstancedMesh(boxGeo, wood, Math.max(1, rails.length * 2));
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  posts.forEach((p, i) => {
    pm.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.y + height / 2, p.z), q.identity(), new THREE.Vector3(postSize, height, postSize)));
  });
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  let k = 0;
  for (const [a, b] of rails) {
    dir.subVectors(b, a);
    const len = dir.length();
    q.setFromUnitVectors(zAxis, dir.normalize());
    for (const f of [0.45, 0.85]) {
      mid.addVectors(a, b).multiplyScalar(0.5);
      mid.y += height * f;
      rm.setMatrixAt(k++, m4.compose(mid, q, new THREE.Vector3(postSize * 0.6, postSize * 0.7, len)));
    }
  }
  pm.count = posts.length;
  rm.count = k;
  for (const m of [pm, rm]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const g = new THREE.Group();
  g.name = 'fences';
  g.add(pm, rm);
  return g;
}
