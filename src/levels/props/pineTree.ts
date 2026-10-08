import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cachedGeo } from './common';
import { smat, ski } from './skiKit';

export interface PineItem {
  x: number;
  y: number;
  z: number;
  /** O'lcham ko'paytirgichi */
  s: number;
  yaw: number;
}

const P = ski.pine;

/** Qatlamli (3 pog'onali) konus; `snow` bo'lsa har pog'onaning qor qalpoqchasi (o'xshash konus, uchi bir xil joyda). */
function tiersGeo(snow: boolean): THREE.BufferGeometry {
  return cachedGeo(`ski.pine.${snow ? 'cap' : 'crown'}`, () => {
    const parts = P.tiers.map(([r, h, y]) => {
      const k = snow ? P.capScale : 1;
      const g = new THREE.ConeGeometry(r! * (snow ? k * 1.04 : 1), h! * k, 8, 1);
      g.translate(0, snow ? y! + h! / 2 - (h! * k) / 2 + 0.03 : y!, 0);
      return g;
    });
    const merged = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    return merged;
  });
}

/** Qorli archalar: 3 ta InstancedMesh (tana, qora-yashil toj, qor qalpoqlari). */
export function buildPines(items: PineItem[]): THREE.Group {
  const n = Math.max(1, items.length);
  const trunk = new THREE.InstancedMesh(
    cachedGeo('ski.pine.trunk', () => new THREE.CylinderGeometry(P.trunkR * 0.7, P.trunkR, P.trunkH, 6).translate(0, P.trunkH / 2, 0)),
    smat('trunk', 0.95, 0.02), n);
  const crown = new THREE.InstancedMesh(tiersGeo(false), smat('#ffffff', 0.9, 0.02, { flatShading: true }), n);
  const cap = new THREE.InstancedMesh(tiersGeo(true), smat('snow', 0.7, 0.02, { flatShading: true }), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.yaw);
    m4.compose(pos.set(it.x, it.y - 0.1, it.z), q, sc.setScalar(it.s));
    for (const m of [trunk, crown, cap]) m.setMatrixAt(i, m4);
    const shade = 0.8 + 0.4 * ((Math.sin(i * 12.9898) + 1) / 2);
    crown.setColorAt(i, col.set(P.colors[i % P.colors.length]!).multiplyScalar(shade));
  });
  const g = new THREE.Group();
  g.name = 'pines';
  for (const m of [trunk, crown, cap]) {
    m.count = items.length;
    m.castShadow = m === crown; // soya faqat tojdan (draw call/uchburchak tejash)
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
