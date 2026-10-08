import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { placed } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { casino, cmat, neon } from './casinoKit';

const F = casino.fountain;

/**
 * Favvora (hovuz markazida): havzaning toshli aylanasi, markaziy ustun, ikki pog'onali piyola, atrofga sepiluvchi suv oqimlari
 * (shaffof ingichka silindrlar) va havza atrofida ko'k chiroqlar. Hovuz relyefi (`flats`) va suv yuzasi (`water`) arena JSON da;
 * bu prop faqat o'rtadagi inshoot. o.y — hovuz suv sathidan yuqori (yer sathi), havza chuqurlikka cho'zilgan.
 */
export function createFountain(R: Rapier, o: Origin): PropBuild {
  const g = new THREE.Group();
  const stone = cmat('plaza', 0.9, 0.03);
  const stoneDark = cmat('plazaDark', 0.85, 0.1);
  const spray = cmat('spray', 0.2, 0.0, { transparent: true, opacity: 0.55, depthWrite: false });
  put(g, unitCyl(), stoneDark, [0, F.basinH / 2 - F.depth, 0], [F.basinR, F.basinH + F.depth - 0.2, F.basinR]);
  put(g, unitCyl(), stone, [0, F.basinH - 0.1, 0], [F.basinR * 0.8, 0.3, F.basinR * 0.8]);
  put(g, unitCyl(), stone, [0, F.basinH + F.colH / 2, 0], [F.colR, F.colH, F.colR]);
  put(g, unitCyl(), stone, [0, F.basinH + F.colH * 0.55, 0], [F.bowlR, 0.35, F.bowlR]);
  put(g, unitCyl(), stone, [0, F.basinH + F.colH, 0], [F.bowlR * 0.6, 0.3, F.bowlR * 0.6]);
  put(g, unitCyl(), neon('blue'), [0, F.basinH + F.colH + 0.25, 0], [0.35, 0.3, 0.35]);
  for (let i = 0; i < F.jets; i++) {
    const a = (i / F.jets) * Math.PI * 2;
    const tilt = 0.45 + (i % 2) * 0.2;
    const j = put(g, unitCyl(), spray, [Math.cos(a) * F.jetLen * 0.3, F.basinH + F.colH + F.jetLen * 0.3, Math.sin(a) * F.jetLen * 0.3], [F.jetR, F.jetLen, F.jetR]);
    j.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    j.castShadow = false;
  }
  for (let i = 0; i < F.lights; i++) {
    const a = (i / F.lights) * Math.PI * 2;
    put(g, unitBox(), neon(i % 2 ? 'blue' : 'cyan'), [Math.cos(a) * F.basinR, F.basinH + 0.05, Math.sin(a) * F.basinR], [0.4, 0.2, 0.4]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [placed(R.ColliderDesc.cylinder(F.colliderH / 2, F.colliderR), o, [0, F.colliderH / 2 - F.depth, 0])] };
}
