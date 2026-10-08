import * as THREE from 'three';
import { cachedGeo } from './common';
import type { FenceItem } from './fence';
import { air, amat } from './airKit';

const B = air.barbed;

/** Tikanli sim to'siq: temir ustunlar, qiya tirgaklar, sim qatorlari va tikanlar (to'rtta InstancedMesh); relyefga mos. */
export function buildBarbedFences(items: FenceItem[], heightAt: (x: number, z: number) => number): THREE.Group {
  const posts: THREE.Vector3[] = [];
  const spans: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const it of items) {
    const n = Math.max(1, Math.round(it.length / B.postSpacing));
    const c = Math.cos(it.yaw);
    const s = Math.sin(it.yaw);
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= n; i++) {
      const lz = -it.length / 2 + (it.length * i) / n;
      const x = it.x + lz * s;
      const z = it.z + lz * c;
      const p = new THREE.Vector3(x, heightAt(x, z), z);
      posts.push(p);
      if (prev) spans.push([prev, p]);
      prev = p;
    }
  }
  const box = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const metal = amat('post', 0.6, 0.5);
  const wire = amat('wire', 0.35, 0.8);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  const barbs: Array<[THREE.Vector3, number]> = [];
  const wires: Array<[THREE.Vector3, THREE.Quaternion, number]> = [];
  const dir = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (const [a, b] of spans) {
    dir.subVectors(b, a);
    const len = dir.length();
    const qq = new THREE.Quaternion().setFromUnitVectors(zAxis, dir.clone().normalize());
    for (let k = 0; k < B.strands; k++) {
      const y = B.height * (0.25 + (0.75 * k) / Math.max(1, B.strands - 1));
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      mid.y += y;
      wires.push([mid, qq, len]);
      const nb = Math.floor(len / B.barbSpacing);
      for (let i = 0; i < nb; i++) {
        const t = (i + 0.5) / nb;
        barbs.push([new THREE.Vector3().lerpVectors(a, b, t).setY(a.y + (b.y - a.y) * t + y), (i + k) * 0.9]);
      }
    }
  }

  const pm = new THREE.InstancedMesh(box, metal, Math.max(1, posts.length));
  const am = new THREE.InstancedMesh(box, metal, Math.max(1, posts.length));
  const wm = new THREE.InstancedMesh(box, wire, Math.max(1, wires.length));
  const bm = new THREE.InstancedMesh(box, wire, Math.max(1, barbs.length));
  posts.forEach((p, i) => {
    pm.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.y + B.height / 2, p.z), q.identity(), new THREE.Vector3(B.postSize, B.height, B.postSize)));
    am.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.y + B.height, p.z), q.setFromEuler(new THREE.Euler(0, 0, 0.7)), new THREE.Vector3(B.armLength, B.postSize * 0.7, B.postSize * 0.7)));
  });
  wires.forEach(([p, qq, len], i) => wm.setMatrixAt(i, m4.compose(p, qq, new THREE.Vector3(0.03, 0.03, len))));
  barbs.forEach(([p, rot], i) => bm.setMatrixAt(i, m4.compose(p, q.setFromEuler(new THREE.Euler(rot, rot * 0.7, 0.8)), one.clone().multiplyScalar(B.barbSize))));
  pm.count = posts.length;
  am.count = posts.length;
  wm.count = wires.length;
  bm.count = barbs.length;
  const g = new THREE.Group();
  g.name = 'barbedFences';
  for (const m of [pm, am, wm, bm]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
