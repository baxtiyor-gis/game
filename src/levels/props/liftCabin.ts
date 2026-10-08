import * as THREE from 'three';
import { mesh } from './common';
import { unitBox, unitCyl } from './farmKit';
import { glowMat, smat, ski } from './skiKit';

const L = ski.lift.cabin;

/** Cabin markazining arqondan pastligi (m) */
export const CABIN_DROP = L.hanger + L.h / 2;

/**
 * Kanat yo'li kabinasi: koordinata boshi — arqonga mahkamlanish nuqtasi. Osma tayoq, qizil korpus, oq tom,
 * yon oynalar. Dinamik (harakatlanadi) — mergeStatic ga berilmaydi.
 */
export function createLiftCabin(): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number]): void => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    g.add(o);
  };
  const body = smat('gondola', 0.45, 0.25);
  const trim = smat('gondolaTrim', 0.6, 0.1);
  const steel = smat('steelDark', 0.6, 0.5);
  const cy = -CABIN_DROP;
  add(unitCyl(), steel, [0, -L.hanger / 2, 0], [0.07, L.hanger, 0.07]);
  add(unitBox(), steel, [0, 0.05, 0], [0.5, 0.3, 0.5]);
  add(unitBox(), body, [0, cy - L.h * 0.3, 0], [L.w, L.h * 0.4, L.d]);
  add(unitBox(), smat('glass', 0.1, 0.4, { transparent: true, opacity: 0.8 }), [0, cy + L.h * 0.1, 0], [L.w - 0.08, L.h * 0.45, L.d - 0.08]);
  add(unitBox(), glowMat(), [0, cy + L.h * 0.1, 0], [L.w - 0.5, L.h * 0.3, L.d - 0.5]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(unitBox(), body, [sx * (L.w / 2 - 0.04), cy + L.h * 0.1, sz * (L.d / 2 - 0.04)], [0.1, L.h * 0.5, 0.1]);
  add(unitBox(), trim, [0, cy + L.h / 2 - 0.05, 0], [L.w + 0.15, 0.14, L.d + 0.15]);
  add(unitBox(), trim, [0, cy + L.h / 2 + 0.1, 0], [L.w * 0.7, 0.18, L.d * 0.7]);
  return g;
}
