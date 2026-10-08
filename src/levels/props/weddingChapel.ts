import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, gable } from './farmKit';
import { casino, cmat, neon, signPanel } from './casinoKit';

const C = casino.chapel;

function heartGeo(r: number): THREE.BufferGeometry {
  return cachedGeo(`casino.heart:${r}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, -r);
    s.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, r * 1.0, 0, r * 0.4);
    s.bezierCurveTo(r * 0.7, r * 1.0, r * 1.4, -r * 0.1, 0, -r);
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15);
  });
}

/**
 * Kichik to'y kapellasi (statik): oq tosh bino, qiya tom, old tomonda qo'ng'iroq minorasi va shpil, kirish ravog'i,
 * yoritilgan derazalar va ulkan pushti neon yurak. Lokal +z — kirish tomoni.
 */
export function createWeddingChapel(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? C.size;
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const wall = cmat('chapelWall', 0.85, 0.03);
  const roof = cmat('chapelRoof', 0.8, 0.05);
  put(g, unitBox(), wall, [0, h / 2, 0], [w, h, d]);
  const gb = put(g, gable(w + 1.2, C.roof, d + 1.2), roof, [0, h, 0]);
  gb.castShadow = true;
  colliders.push(box(R, o, [0, h / 2, 0], [w / 2, h / 2, d / 2]));
  // Minora + shpil (old tomonda)
  const tz = d / 2 - C.tower / 2 + 0.6;
  put(g, unitBox(), wall, [0, h + C.tower / 2, tz], [C.tower, C.tower, C.tower]);
  const cone = cachedGeo('casino.spire', () => new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4));
  put(g, cone, roof, [0, h + C.tower + C.spire / 2, tz], [C.tower * 0.62, C.spire, C.tower * 0.62]);
  put(g, unitBox(), neon('warm'), [0, h + C.tower * 0.55, tz + C.tower / 2 + 0.03], [C.tower * 0.35, C.tower * 0.5, 0.06]);
  colliders.push(box(R, o, [0, h + C.tower / 2, tz], [C.tower / 2, C.tower / 2, C.tower / 2]));
  // Kirish ravog'i va derazalar
  put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [0, 1.5, d / 2 + 0.05], [2.2, 3, 0.1]);
  put(g, unitBox(), neon('amber'), [0, 3.25, d / 2 + 0.1], [2.6, 0.2, 0.2]);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      put(g, unitBox(), neon('warm'), [sx * (w / 2 + 0.03), h * 0.55, -d / 4 + i * d / 3], [0.06, 1.8, 0.9]);
    }
    put(g, unitBox(), neon('warm'), [sx * 2.8, h * 0.5, d / 2 + 0.03], [0.9, 1.8, 0.06]);
  }
  // Neon yurak + yozuv
  put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [w / 2 + 3.5, 2.5, d / 2 - 1], [0.3, 5, 0.3]);
  const heart = new THREE.Mesh(heartGeo(C.heart), neon('pink'));
  heart.position.set(w / 2 + 3.5, 5 + C.heart, d / 2 - 1);
  g.add(heart);
  signPanel(g, 5.5, 1.4, [w / 2 + 3.5, 4.0, d / 2 - 0.55], def.sign ?? 'casino.sign.wedding', 'pink');
  colliders.push(box(R, o, [w / 2 + 3.5, 2.5, d / 2 - 1], [0.15, 2.5, 0.15]));
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
