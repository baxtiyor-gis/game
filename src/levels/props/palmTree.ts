import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cachedGeo } from './common';
import { casino, cmat } from './casinoKit';

export interface PalmItem {
  x: number;
  y: number;
  z: number;
  s: number;
  yaw: number;
}

const P = casino.palm;
const FRONDS = casino.colors.frond;

/** Egilgan tana: ustma-ust turgan, har biri biroz siljigan konus kesimlar (bitta geometriya). */
function trunkGeo(): THREE.BufferGeometry {
  return cachedGeo('casino.palm.trunk', () => {
    const parts: THREE.BufferGeometry[] = [];
    const seg = P.trunkH / P.segments;
    for (let i = 0; i < P.segments; i++) {
      const k = i / P.segments;
      const r0 = P.trunkR * (1 - 0.35 * k);
      const r1 = P.trunkR * (1 - 0.35 * ((i + 1) / P.segments));
      const g = new THREE.CylinderGeometry(r1, r0, seg * 1.05, 6, 1, true);
      g.translate(P.bend * k * k, seg * (i + 0.5), 0);
      parts.push(g);
    }
    const m = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    return m;
  });
}

/** Barglar: tojdan tashqariga yoyilgan, uchi pastga egilgan chiziqli barglar (bitta geometriya, ikki tomonli material). */
function frondsGeo(): THREE.BufferGeometry {
  return cachedGeo('casino.palm.fronds', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < P.fronds; i++) {
      const g = new THREE.PlaneGeometry(P.frondW, P.frondLen, 1, 4);
      const pos = g.getAttribute('position');
      for (let v = 0; v < pos.count; v++) {
        const t = (pos.getY(v) + P.frondLen / 2) / P.frondLen; // 0..1 bargning o'qi bo'ylab
        pos.setXYZ(v, pos.getX(v) * (1 - 0.7 * t), t * P.frondLen, -P.droop * t * t * P.frondLen * 0.5);
      }
      g.rotateX(-Math.PI / 2 + 0.5); // gorizontalga yaqin yoyiladi
      g.rotateY((i / P.fronds) * Math.PI * 2 + (i % 2) * 0.25);
      g.translate(P.bend, P.trunkH, 0);
      parts.push(g);
    }
    const m = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    m.computeVertexNormals();
    return m;
  });
}

/** Palma daraxtlari: 2 ta InstancedMesh (tana, barglar). */
export function buildPalms(items: PalmItem[]): THREE.Group {
  const n = Math.max(1, items.length);
  const trunk = new THREE.InstancedMesh(trunkGeo(), cmat('trunk', 0.95, 0.02, { side: THREE.DoubleSide }), n);
  const fronds = new THREE.InstancedMesh(frondsGeo(), cmat('#ffffff', 0.8, 0.02, { side: THREE.DoubleSide }), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.yaw);
    m4.compose(pos.set(it.x, it.y - 0.1, it.z), q, sc.setScalar(it.s));
    trunk.setMatrixAt(i, m4);
    fronds.setMatrixAt(i, m4);
    fronds.setColorAt(i, col.set(FRONDS).lerp(new THREE.Color(casino.colors.frondB), (Math.sin(i * 12.9898) + 1) / 2));
  });
  const g = new THREE.Group();
  g.name = 'palms';
  for (const m of [trunk, fronds]) {
    m.count = items.length;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
