import * as THREE from 'three';
import { cachedGeo, stdMat } from './common';
import { farm, fc } from './farmKit';

export interface TreeItem {
  x: number;
  y: number;
  z: number;
  /** O'lcham ko'paytirgichi */
  s: number;
  yaw: number;
}

function crownGeo(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(p.getX(i) * 5.1 + p.getZ(i) * 3.7) * 0.12;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Daraxtlar: 2 ta InstancedMesh (tana + soya-shox), shox rangi har daraxtda farqli. */
export function buildTrees(items: TreeItem[]): THREE.Group {
  const { trunkRadius: tr, trunkHeight: th, crownRadius: cr } = farm.tree;
  const n = Math.max(1, items.length);
  const trunk = new THREE.InstancedMesh(
    cachedGeo('treeTrunk', () => new THREE.CylinderGeometry(tr * 0.7, tr, th, 7)),
    stdMat('farm.trunk', fc.trunk, 0.95, 0.02), n);
  const crown = new THREE.InstancedMesh(
    cachedGeo('treeCrown', crownGeo), stdMat('farm.crown', '#ffffff', 0.85, 0.02, { flatShading: true }), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(0, it.yaw, 0));
    m4.compose(new THREE.Vector3(it.x, it.y + (th * it.s) / 2, it.z), q, new THREE.Vector3(it.s, it.s, it.s));
    trunk.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(it.x, it.y + th * it.s + cr * it.s * 0.55, it.z), q, new THREE.Vector3(cr * it.s, cr * it.s, cr * it.s));
    crown.setMatrixAt(i, m4);
    const pal = fc.leaf;
    crown.setColorAt(i, col.set(pal[i % pal.length]!).multiplyScalar(0.85 + 0.3 * ((Math.sin(i * 12.9898) + 1) / 2)));
  });
  for (const m of [trunk, crown]) {
    m.count = items.length;
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const g = new THREE.Group();
  g.name = 'trees';
  g.add(trunk, crown);
  return g;
}
