import * as THREE from 'three';
import type { DestructibleType } from '../types';
import { cachedGeo, mesh } from './common';
import type { DestructibleVisual } from './tank';
import { unitBox } from './farmKit';
import { casino, cmat, neon, signPanel } from './casinoKit';
import { mergeStatic } from '../mergeStatic';

const N = casino.neonSign;

/**
 * Ulkan neon viveska (destructible): po'lat ustun, ustida yozuv paneli (ikki tomonli), neon ramka va lampochkalar qatori.
 * Matn va rang joylashuvdan tanlanadi (har viveska boshqacha). Vayrona: chiroqlari o'chgan, qiyshaygan panel + ustun qoldig'i.
 */
export function createNeonSignVisual(cfg: DestructibleType, parent: THREE.Object3D, x: number, y: number, z: number, yaw: number): DestructibleVisual {
  const pick = Math.abs(Math.floor(x * 7.31 + z * 13.17));
  const text = N.texts[pick % N.texts.length]!;
  const ti = pick % N.texts.length;
  const [c1, c2] = [N.colors[ti % N.colors.length]!, N.colors[(ti + 2) % N.colors.length]!];
  const steel = cmat('steelDark', 0.6, 0.4);
  const dead = cmat('neonOff', 0.9, 0.05);
  const burnt = cmat('burnt', 0.95, 0.1);
  const cube = unitBox();
  const H = cfg.height;
  const hy = H - N.headH / 2;
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number], into: THREE.Object3D): THREE.Mesh => {
    const o = mesh(geo, m, ...p);
    o.scale.set(...s);
    into.add(o);
    return o;
  };

  const intact = new THREE.Group();
  mk(cube, steel, [0, 0.3, 0], [N.poleW * 1.8, 0.6, N.poleW * 1.8], intact);
  mk(cube, steel, [0, (H - N.headH) / 2, 0], [N.poleW, H - N.headH, N.poleW], intact);
  mk(cube, steel, [0, hy, 0], [N.headW, N.headH, N.headD], intact);
  signPanel(intact, N.headW - 0.5, N.headH - 0.5, [0, hy, N.headD / 2], text, c1);
  const glow = neon(c2);
  for (const sy of [1, -1]) mk(cube, glow, [0, hy + sy * (N.headH / 2 + 0.12), 0], [N.headW + 0.3, 0.24, N.headD + 0.2], intact).castShadow = false;
  for (let i = 0; i < N.bulbs; i++) {
    const bx = (i / (N.bulbs - 1) - 0.5) * (N.headW - 0.4);
    mk(cube, glow, [bx, hy + N.headH / 2 + 0.5, 0], [N.bulbSize, N.bulbSize, N.bulbSize], intact).castShadow = false;
  }

  // Vayrona: chiroqlari o'chgan, qiyshaygan panel va past ustun
  const wreck = new THREE.Group();
  wreck.visible = false;
  mk(cube, burnt, [0, H * 0.18, 0], [N.poleW, H * 0.36, N.poleW], wreck).rotation.z = 0.12;
  const head = mk(cube, dead, [N.headW * 0.35, 1.1, 1.5], [N.headW, N.headH * 0.9, N.headD], wreck);
  head.rotation.set(0.25, 0.5, 1.15);
  const disc = new THREE.Mesh(cachedGeo('casino.scorch', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), cmat('scorch', 1, 0, { transparent: true, opacity: 0.8 }));
  disc.scale.setScalar(cfg.radius * 3);
  disc.position.y = 0.06;
  wreck.add(disc);

  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  root.add(intact, wreck);
  root.updateMatrixWorld(true);
  const whole = new THREE.Group();
  const freeMerged = mergeStatic([intact], whole);
  root.remove(intact);
  parent.add(root, whole);
  return {
    setDestroyed() {
      whole.visible = false;
      wreck.visible = true;
    },
    dispose() {
      parent.remove(root, whole);
      freeMerged();
    },
  };
}
