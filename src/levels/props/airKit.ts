// Aviatsiya proplari uchun umumiy yordamchilar: ranglar, birlik geometriyalar, ekstruziya shakllari.
import * as THREE from 'three';
import { cachedGeo, propCfg, stdMat } from './common';

export const air = propCfg.air;
export const ac = air.colors as Record<string, string>;

/** Aviatsiya materiali (kesh bilan): rang kaliti ac[...] dan. */
export const amat = (colorKey: string, rough = 0.7, metal = 0.2): THREE.MeshStandardMaterial =>
  stdMat(`air.${colorKey}:${rough}:${metal}`, ac[colorKey] ?? colorKey, rough, metal);

export const unitSphere = (): THREE.SphereGeometry => cachedGeo('unitSphere', () => new THREE.SphereGeometry(1, 16, 10));
/** Konus: pastki radiusi 1, tepasi `tipRatio`, balandligi 1 (o'qi y). */
export const taperCyl = (tipRatio: number): THREE.CylinderGeometry =>
  cachedGeo(`taperCyl:${tipRatio}`, () => new THREE.CylinderGeometry(tipRatio, 1, 1, 16));

/** Trapetsiya qanot (bir tomon): x=0 dan x=±len gacha; old qirra z=0 da, orqaga (-z) `chord`; qalinlik y bo'yicha markazlashgan. */
export function wingGeo(side: 1 | -1, len: number, root: number, tip: number, sweep: number, thick: number): THREE.BufferGeometry {
  return cachedGeo(`wing:${side}:${len}:${root}:${tip}:${sweep}:${thick}`, () => {
    const pts = [[0, 0], [len, sweep], [len, sweep + tip], [0, root]].map(([x, y]) => new THREE.Vector2(x! * side, y));
    if (side < 0) pts.reverse();
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: thick, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, thick / 2, 0);
    return g;
  });
}

/** Tik dum (x=0 tekislikda, qalinlik x bo'yicha): asosi y=0, z bo'yicha [-root, 0]; tepasi orqaga `back` siljigan. */
export function finGeo(h: number, root: number, tip: number, back: number, thick: number): THREE.BufferGeometry {
  return cachedGeo(`fin:${h}:${root}:${tip}:${back}:${thick}`, () => {
    const pts = [[0, 0], [-root, 0], [-back - tip, h], [-back, h]].map(([z, y]) => new THREE.Vector2(z, y));
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: thick, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(thick / 2, 0, 0);
    return g;
  });
}

/** Yarim ellips yoy shakli (kamar): tashqi yarim o'qlar rx, ry; qalinlik t. Nuqtalar chap-pastdan o'ng-pastgacha. */
export function archPts(rx: number, ry: number, t: number, n: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (Math.PI * i) / n;
    out.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * ry));
  }
  for (let i = n; i >= 0; i--) {
    const a = Math.PI - (Math.PI * i) / n;
    out.push(new THREE.Vector2(Math.cos(a) * (rx - t), Math.sin(a) * (ry - t)));
  }
  return out;
}
