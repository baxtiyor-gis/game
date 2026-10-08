import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { base, bmat, glow } from './baseKit';

const RD = base.radar;

export interface RadarBuild {
  /** Statik qism (bino + ustun): mergeStatic ga beriladi */
  build: PropBuild;
  /** Aylanuvchi qism (dunyo koordinatalarida joylashgan): y o'qi atrofida aylantiriladi */
  rotor: THREE.Group;
  /** Aylanish tezligi, rad/s */
  speed: number;
}

/** Aylanuvchi antenna: 'bar' — keng panjarali qidiruv radari, 'dish' — qiya parabolik likopcha. */
function buildRotor(variant: string): THREE.Group {
  const metal = bmat('metal', 0.55, 0.5);
  const dark = bmat('metalDark', 0.7, 0.4);
  const g = new THREE.Group();
  put(g, unitCyl(), dark, [0, 0.3, 0], [1.1, 0.6, 1.1]);
  if (variant === 'dish') {
    const dish = cachedGeo('radar.dish', () => new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.32));
    const tilt = new THREE.Group();
    tilt.position.set(0, 2.4, 0);
    tilt.rotation.x = -RD.dishTilt;
    const bowl = put(tilt, dish, bmat('white', 0.45, 0.5, true), [0, 0, 0], [RD.dishR, RD.dishR * 0.6, RD.dishR]);
    bowl.rotation.x = Math.PI / 2;
    put(tilt, unitCyl(), dark, [0, 0, RD.dishR * 0.5], [0.12, RD.dishR * 1.1, 0.12]).rotation.x = Math.PI / 2;
    put(tilt, unitBox(), glow('red'), [0, 0, RD.dishR * 1.05], [0.35, 0.35, 0.35]);
    put(g, unitBox(), dark, [0, 1.3, 0], [0.9, 2.2, 0.9]);
    g.add(tilt);
    return g;
  }
  put(g, unitBox(), dark, [0, 2.2, 0], [1.2, 3.4, 0.9]);
  const panelY = 2.6 + RD.barH / 2;
  put(g, unitBox(), metal, [0, panelY, -0.9], [RD.barW, RD.barH, RD.barT]);
  for (let i = -2; i <= 2; i++) put(g, unitBox(), dark, [0, panelY + i * (RD.barH / 5), -0.55], [RD.barW + 0.4, 0.22, 0.4]);
  for (const s of [-1, 1]) put(g, unitBox(), dark, [s * (RD.barW / 2 - 0.2), panelY, -0.55], [0.35, RD.barH + 0.4, 0.45]);
  put(g, unitBox(), dark, [0, panelY - RD.barH * 0.15, 0.2], [0.35, 0.35, 2.2]);
  put(g, unitBox(), glow('red'), [0, panelY + RD.barH / 2 + 0.4, -0.9], [0.4, 0.4, 0.4]);
  return g;
}

/** Radar stansiyasi: past bino, ustun va aylanuvchi antenna. Yaw bino eshigini (+z) belgilaydi. */
export function createRadar(R: Rapier, o: Origin, variant = 'bar'): RadarBuild {
  const wall = bmat('concrete', 0.9, 0.05);
  const trim = bmat('concreteDark', 0.9, 0.05);
  const g = new THREE.Group();
  const top = RD.baseH + RD.mastH;
  put(g, unitBox(), wall, [0, RD.baseH / 2, 0], [RD.baseW, RD.baseH, RD.baseW * 0.8]);
  put(g, unitBox(), trim, [0, RD.baseH + 0.2, 0], [RD.baseW + 0.6, 0.4, RD.baseW * 0.8 + 0.6]);
  put(g, unitBox(), bmat('black', 0.8, 0.3), [0, 1.3, RD.baseW * 0.4 + 0.03], [2.2, 2.6, 0.1]);
  put(g, unitBox(), glow('amber'), [RD.baseW * 0.3, RD.baseH * 0.6, RD.baseW * 0.4 + 0.03], [1.8, 0.6, 0.1]);
  put(g, unitCyl(), trim, [0, RD.baseH + RD.mastH / 2, 0], [RD.mastR, RD.mastH, RD.mastR]);
  put(g, unitCyl(), wall, [0, RD.baseH + 0.6, 0], [RD.mastR * 1.8, 1.2, RD.mastR * 1.8]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const rotor = buildRotor(variant);
  rotor.position.set(o.x, o.y + top, o.z);
  const colliders = [
    box(R, o, [0, RD.baseH / 2, 0], [RD.baseW / 2, RD.baseH / 2, RD.baseW * 0.4]),
    box(R, o, [0, RD.baseH + RD.mastH / 2, 0], [RD.mastR, RD.mastH / 2, RD.mastR]),
  ];
  return { build: { object: g, colliders }, rotor, speed: variant === 'dish' ? RD.dishSpeed : RD.speed };
}
