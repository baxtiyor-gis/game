import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo, placed } from './common';
import type { Origin, PropBuild, Vec3 } from './common';
import { put, unitBox } from './farmKit';
import { casino, cmat, neon, signPanel } from './casinoKit';

const G = casino.garage;

/** Pandus qiyaligi (rad) va uzunligi: pastki chekka yerda, yuqori chekka tom bilan teng. */
export function garageRamp(def: PropDef): { angle: number; length: number; height: number; rampLen: number } {
  const [, H] = def.size ?? G.size;
  const rampLen = def.length ?? G.rampLen;
  return { angle: Math.atan2(H, rampLen), length: Math.hypot(rampLen, H), height: H, rampLen };
}

/** Pandus yon yuzi uchun uchburchak prizma (kesim: pastki chekka -> tepa), eni = rampW. */
function wedgeGeo(L: number, H: number, w: number): THREE.BufferGeometry {
  return cachedGeo(`casino.wedge:${L}:${H}:${w}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(L, 0);
    s.lineTo(0, H);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).translate(0, 0, -w / 2);
  });
}

/**
 * Ko'p qavatli avtoturargoh (statik): ostida ochiq birinchi qavat (ustunlar), ustida tom (to'siq bilan), +x tomondagi
 * uzun pandus tomga olib chiqadi (mashina chiqa oladi). size = [uzunlik(x), tom balandligi, eni(z)]; length — pandus uzunligi.
 * Lokal markaz — poydevor markazi; pandus x = size[0]/2 .. size[0]/2 + length oralig'ida, pastki uchi yer sathida.
 */
export function createParkingGarage(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [W, H, D] = def.size ?? G.size;
  const { angle, length, rampLen } = garageRamp(def);
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const concrete = cmat('concrete', 0.9, 0.04);
  const dark = cmat('concreteDark', 0.9, 0.04);
  const solid = (p: Vec3, s: Vec3, m: THREE.Material = concrete): void => {
    put(g, unitBox(), m, p, s);
    colliders.push(box(R, o, p, [s[0] / 2, s[1] / 2, s[2] / 2]));
  };
  const rw = G.rampW;

  // Tom plitasi + pol, ustunlar
  solid([0, H - G.slab / 2, 0], [W, G.slab, D]);
  put(g, unitBox(), cmat('asphaltLot', 0.95, 0.02), [0, 0.04, 0], [W, 0.08, D]);
  for (let i = 0; i < G.colsX; i++) {
    const x = (i / (G.colsX - 1) - 0.5) * (W - G.col * 2);
    for (const z of [-D / 2 + G.col, 0, D / 2 - G.col]) solid([x, (H - G.slab) / 2, z], [G.col, H - G.slab, G.col], dark);
  }
  // Tom to'sig'i (pandus tomonida ochiq) va yoritilgan chiziq
  const py = H + G.parapet / 2;
  solid([0, py, D / 2 - 0.2], [W, G.parapet, 0.4]);
  solid([0, py, -D / 2 + 0.2], [W, G.parapet, 0.4]);
  solid([-W / 2 + 0.2, py, 0], [0.4, G.parapet, D]);
  const seg = (D - rw) / 2;
  for (const s of [-1, 1]) solid([W / 2 - 0.2, py, s * (rw / 2 + seg / 2)], [0.4, G.parapet, seg]);
  for (const s of [-1, 1]) put(g, unitBox(), neon('pink'), [0, H + G.parapet + 0.08, s * (D / 2 - 0.2)], [W, 0.16, 0.2]);
  put(g, unitBox(), neon('cyan'), [-W / 2 + 0.2, H + G.parapet + 0.08, 0], [0.2, 0.16, D]);
  // Old tomon yorug'ligi (qavat chizig'i)
  put(g, unitBox(), neon('amber'), [0, H - G.slab - 0.15, D / 2 + 0.02], [W, 0.2, 0.1]);

  // Tom: chiroq ustunlari, zina binosi, "P" belgisi
  for (let x = -W / 2 + 5; x < W / 2 - 4; x += G.lampEvery) {
    for (const z of [-D / 2 + 2, D / 2 - 2]) {
      put(g, unitBox(), cmat('lamp', 0.6, 0.4), [x, H + G.lampH / 2, z], [0.2, G.lampH, 0.2]);
      put(g, unitBox(), neon('warm'), [x, H + G.lampH, z], [0.8, 0.12, 0.5]);
    }
  }
  const [sw, sh, sd] = G.stair as Vec3;
  solid([-W / 2 + sw / 2 + 1, H + sh / 2, -D / 2 + sd / 2 + 1], [sw, sh, sd], dark);
  put(g, unitBox(), neon('green'), [-W / 2 + sw / 2 + 1, H + sh - 0.4, -D / 2 + sd + 1.05], [sw * 0.6, 0.4, 0.1]);
  put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [-W / 2 + 4, H + G.signH / 2, D / 2 - 3], [0.5, G.signH, 0.5]);
  signPanel(g, 7, 2.6, [-W / 2 + 4, H + G.signH + 1.3, D / 2 - 3], 'casino.sign.parking', 'cyan');

  // Pandus: qiya plita (kollayder) + yon to'siqlar + yaxlit ponasimon ko'rinish
  const nx = Math.sin(angle);
  const ny = Math.cos(angle);
  const cx = W / 2 + rampLen / 2 - (nx * G.thick) / 2;
  const cy = H / 2 - (ny * G.thick) / 2 - G.sink;
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -angle);
  const slab = put(g, unitBox(), concrete, [cx, cy, 0], [length, G.thick, rw], [0, 0, -angle]);
  slab.receiveShadow = true;
  colliders.push(placed(R.ColliderDesc.cuboid(length / 2, G.thick / 2, rw / 2), o, [cx, cy, 0], rot));
  put(g, unitBox(), cmat('asphalt', 0.95, 0.02), [cx + nx * (G.thick / 2 + 0.01), cy + ny * (G.thick / 2 + 0.01), 0], [length, 0.02, rw - 0.6], [0, 0, -angle]);
  for (const s of [-1, 1]) {
    const z = s * (rw / 2 + 0.2);
    const rx = cx + nx * (G.rail / 2);
    const ry = cy + ny * (G.thick / 2 + G.rail / 2);
    put(g, unitBox(), dark, [rx, ry, z], [length, G.rail, 0.4], [0, 0, -angle]);
    colliders.push(placed(R.ColliderDesc.cuboid(length / 2, G.rail / 2, 0.2), o, [rx, ry, z], rot));
    put(g, unitBox(), neon('pink'), [rx + nx * 0.02, ry + ny * (G.rail / 2 + 0.05), z], [length, 0.1, 0.16], [0, 0, -angle]);
    // Ponasimon yaxlit asos (pandus ostini yopadi): vizual
    const wedge = new THREE.Mesh(wedgeGeo(rampLen, H - G.thick, 0.4), dark);
    wedge.position.set(W / 2, 0, z);
    wedge.castShadow = true;
    g.add(wedge);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
