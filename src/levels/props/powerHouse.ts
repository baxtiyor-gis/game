import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { dam, dmat } from './damKit';

const H = dam.house;

/**
 * Elektr stansiyasi binosi (to'g'on tagida): beton korpus, ikki qator qora oyna, tom (shamollatgich, kran, mo'rilar),
 * to'g'on tomonga (-z) ikkita yo'g'on quvur (penstok), old eshik. size = eni, balandligi, chuqurligi; kollayder — korpus + quvurlar.
 */
export function createPowerHouse(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [56, 16, 22];
  const wall = dmat('concrete', 0.9, 0.02);
  const dark = dmat('concreteDark', 0.9, 0.02);
  const glass = dmat('glass', 0.25, 0.6);
  const roof = dmat('roof', 0.9, 0.1);
  const steel = dmat('steel', 0.55, 0.5);
  const red = dmat('red', 0.7, 0.2);
  const g = new THREE.Group();
  put(g, unitBox(), wall, [0, h / 2, 0], [w, h, d]);
  put(g, unitBox(), dark, [0, 0.5, 0], [w + 0.6, 1, d + 0.6]); // poydevor
  put(g, unitBox(), roof, [0, h + 0.25, 0], [w + 0.8, 0.5, d + 0.8]);

  // Oynalar: old va orqa devorda ikki qatordan
  const n = Math.floor((w - 4) / H.windowGap);
  for (const sz of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < n; i++) {
        const x = -((n - 1) * H.windowGap) / 2 + i * H.windowGap;
        put(g, unitBox(), glass, [x, h * (0.38 + row * 0.34), sz * (d / 2 + 0.04)], [H.windowW, H.windowH, 0.12]);
      }
    }
    for (let i = 0; i <= n; i++) {
      put(g, unitBox(), dark, [-(n * H.windowGap) / 2 + i * H.windowGap, h / 2, sz * (d / 2 + 0.1)], [0.5, h, 0.3]); // pilyastr
    }
  }
  put(g, unitBox(), red, [w * 0.18, 1.5, d / 2 + 0.12], [3.2, 3, 0.2]); // eshik
  put(g, unitBox(), dmat('hazard', 0.6, 0.1), [w * 0.18, 3.15, d / 2 + 0.13], [3.6, 0.3, 0.2]);

  // Tom: shamollatgich qutilari, kran, mo'rilar
  for (let i = 0; i < 4; i++) {
    put(g, unitBox(), dark, [-w / 2 + (i + 0.7) * (w / 4.4), h + 1.3, -d * 0.18], [4.5, 1.6, 4]);
  }
  const stack = cachedGeo('dam.stack', () => new THREE.CylinderGeometry(0.8, 1, 1, 12));
  for (const sx of [-1, 1]) put(g, stack, steel, [sx * w * 0.36, h + 0.5 + H.stackH / 2, d * 0.22], [H.stackR, H.stackH, H.stackR]);
  put(g, unitBox(), red, [0, h + 0.5 + H.crane, d * 0.3], [w * 0.7, 0.5, 0.7]); // kran balkasi
  for (const sx of [-1, 1]) put(g, unitBox(), red, [sx * w * 0.35, h + 0.5 + H.crane / 2, d * 0.3], [0.7, H.crane, 0.7]);

  // Penstoklar: to'g'on tomoniga chiqqan quvurlar (o'qi z)
  const colliders = [box(R, o, [0, h / 2, 0], [w / 2, h / 2, d / 2])];
  for (let i = 0; i < H.pipeCount; i++) {
    const x = (i - (H.pipeCount - 1) / 2) * (w * 0.42);
    const pipe = put(g, unitCyl(), steel, [x, H.pipeR + 1, -d / 2 - H.pipeLen / 2], [H.pipeR, H.pipeLen, H.pipeR], [Math.PI / 2, 0, 0]);
    pipe.castShadow = true;
    for (let k = 1; k < 4; k++) put(g, unitCyl(), dark, [x, H.pipeR + 1, -d / 2 - (H.pipeLen * k) / 4], [H.pipeR * 1.12, 0.5, H.pipeR * 1.12], [Math.PI / 2, 0, 0]);
    colliders.push(box(R, o, [x, H.pipeR + 1, -d / 2 - H.pipeLen / 2], [H.pipeR, H.pipeR, H.pipeLen / 2]));
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
