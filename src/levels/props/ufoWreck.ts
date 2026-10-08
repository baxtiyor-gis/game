import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo, stdMat } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { base, bmat, glow } from './baseKit';

const U = base.ufo;

/** Likopcha profili (LatheGeometry): yassi tagi, kengaygan korpus, o'tkir qirra, yuqoriga qiyalik. */
const saucer = (): THREE.LatheGeometry =>
  cachedGeo('ufo.saucer', () => new THREE.LatheGeometry([[0, 0], [0.55, 0.05], [0.9, 0.22], [1, 0.38], [0.86, 0.52], [0.5, 0.64], [0, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)), 28));

/** NUJ qoldig'i: qiya yotgan metall likopcha, porlovchi gumbaz va belbog', singan qanotcha, ostida yashil nur dog'i. Dekorativ (porlaydi). */
export function createUfoWreck(R: Rapier, o: Origin): PropBuild {
  const g = new THREE.Group();
  const hull = bmat('ufo', 0.3, 0.85, true);
  const dark = bmat('ufoDark', 0.5, 0.6);
  const ring = new THREE.Group();
  ring.position.set(0, U.height, 0);
  ring.rotation.set(U.tilt, 0.4, -U.tilt * 0.6);
  put(ring, saucer(), hull, [0, 0, 0], [U.radius, U.radius * 0.9, U.radius]);
  const dome = cachedGeo('ufo.dome', () => new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  put(ring, dome, glow('ufo'), [0, U.radius * 0.55, 0], [U.domeR, U.domeR * 0.9, U.domeR]);
  put(ring, cachedGeo('ufo.band', () => new THREE.TorusGeometry(1, 0.045, 6, 36).rotateX(Math.PI / 2)), glow('ufo'), [0, U.radius * 0.33, 0], [U.radius * 0.93, 1, U.radius * 0.93]);
  put(ring, unitBox(), dark, [U.radius * 0.7, U.radius * 0.28, 0.2], [2.2, 0.18, 1.4], [0.2, 0.3, 0.5]);
  g.add(ring);
  for (let i = 0; i < U.legs; i++) {
    const a = (i / U.legs) * Math.PI * 2 + 0.5;
    put(g, unitCyl(), dark, [Math.cos(a) * U.radius * 0.55, U.height * 0.5, Math.sin(a) * U.radius * 0.55], [0.18, U.height, 0.18]);
  }
  const pool = cachedGeo('ufo.pool', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2));
  const fx = stdMat('base.ufoPool', '#000000', 1, 0, {
    emissive: new THREE.Color('#58ffa8'), emissiveIntensity: 1.1, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const glowPool = put(g, pool, fx, [0, 0.11, 0], [U.radius * 1.5, 1, U.radius * 1.5]);
  glowPool.castShadow = false;
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, (U.height + U.radius * 0.5) / 2, 0], [U.radius * 0.85, (U.height + U.radius * 0.5) / 2, U.radius * 0.85])] };
}
