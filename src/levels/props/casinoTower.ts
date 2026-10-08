import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { casino, cmat, facadeBox, facadeMat, neon, signPanel } from './casinoKit';

const T = casino.tower;
const F = casino.facade;

/**
 * Kazino-mehmonxona (statik, birlashtiriladi). Lokal +z — bulvarga qaragan old tomon, markaz (0,0), asosi y=0.
 * size = [eni, balandligi, chuqurligi]; variant: 'slab' (yagona plita), 'stepped' (pog'onali), 'twin' (ikki minora + ko'prik);
 * scheme — devor rangi va neon juftligi indeksi; sign — tom yozuvi (strings.json kaliti).
 * Fasad: deraza to'ri teksturasi (yoritilgan derazalar emissive), pastda podium + yonib turuvchi soyabon, burchaklarda neon chiziqlar.
 */
export function createCasinoTower(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [34, 44, 30];
  const scheme = def.scheme ?? 0;
  const mat = facadeMat(F.tints[scheme % F.tints.length]!);
  const [c1, c2] = F.neonPairs[scheme % F.neonPairs.length]!;
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const solid = (geo: THREE.BufferGeometry, bw: number, bh: number, bd: number, x: number, y: number, z: number): void => {
    const m = put(g, geo, mat, [x, y, z]);
    m.receiveShadow = true;
    colliders.push(box(R, o, [x, y + bh / 2, z], [bw / 2, bh / 2, bd / 2]));
  };
  const strip = (mt: THREE.Material, p: [number, number, number], s: [number, number, number]): void => {
    put(g, unitBox(), mt, p, s).castShadow = false;
  };

  // Podium (hamma variantda) + yonib turuvchi soyabon
  const pw = w + T.podiumPad * 2;
  const pd = d + T.podiumPad * 2;
  solid(facadeBox(pw, T.podiumH, pd), pw, T.podiumH, pd, 0, 0, 0);
  const front = pd / 2;
  strip(neon(c1), [0, T.canopyY, front + T.canopyD / 2], [pw * 0.6, T.canopyH, T.canopyD]);
  strip(neon(c2), [0, T.canopyY + T.canopyH / 2 + 0.15, front + T.canopyD], [pw * 0.6, 0.3, 0.3]);
  strip(neon('warm'), [0, 2.4, front + 0.06], [pw * 0.34, 4.6, 0.12]);
  for (const sx of [-1, 1]) {
    strip(cmat('steelDark', 0.6, 0.4), [sx * pw * 0.3, T.canopyY / 2, front + T.canopyD - 0.3], [0.5, T.canopyY, 0.5]);
    strip(neon(c2), [sx * (pw / 2 - 0.1), T.podiumH * 0.55, front + 0.08], [0.4, T.podiumH * 0.9, 0.2]);
  }

  // Asosiy minora(lar)
  let topY = T.podiumH;
  let topW = w;
  let topD = d;
  if (def.variant === 'stepped') {
    const [h1, h2, h3, k1, k2] = T.stepped as [number, number, number, number, number];
    const tiers: Array<[number, number, number]> = [[w, h * h1, d], [w * k1, h * h2, d * k1], [w * k2, h * h3, d * k2]];
    for (const [bw, bh, bd] of tiers) {
      solid(facadeBox(bw, bh, bd), bw, bh, bd, 0, topY, 0);
      topY += bh;
      topW = bw;
      topD = bd;
    }
  } else if (def.variant === 'twin') {
    const tw = w * T.twinGap;
    const td = d * 0.8;
    const hh = h - T.podiumH;
    for (const sx of [-1, 1]) solid(facadeBox(tw, hh, td), tw, hh, td, sx * (w - tw) / 2, T.podiumH, 0);
    const bh = 3.2;
    solid(facadeBox(w - tw, bh, td * 0.7), w - tw, bh, td * 0.7, 0, T.podiumH + hh * 0.6, 0);
    topY = h;
    topW = tw;
    topD = td;
  } else {
    const hh = h - T.podiumH;
    solid(facadeBox(w, hh, d), w, hh, d, 0, T.podiumH, 0);
    topY = h;
  }

  // Neon: burchak chiziqlar, gorizontal belbog'lar, tomdagi yozuv ramkasi
  const fz = topD / 2 + 0.12;
  const sides = def.variant === 'twin' ? [-1, 1].map((s) => s * (w - topW) / 2) : [0];
  for (const cx of sides) {
    for (const sx of [-1, 1]) {
      strip(neon(sx > 0 ? c1 : c2), [cx + sx * (topW / 2 + 0.05), (T.podiumH + topY) / 2, fz], [T.corner, topY - T.podiumH, T.corner]);
    }
    if (def.variant !== 'stepped') {
      for (const [i, b] of (T.bands as number[]).entries()) strip(neon(i % 2 ? c1 : c2), [cx, T.podiumH + (topY - T.podiumH) * b, fz], [topW, T.stripe, 0.3]);
    }
  }
  const signW = (def.variant === 'twin' ? w : topW) * T.signInset;
  const signY = topY + T.signLift + T.signH / 2;
  const sz = def.variant === 'twin' ? 0 : topD * 0.2;
  for (const sx of [-1, 1]) strip(cmat('steelDark', 0.6, 0.4), [sx * signW * 0.4, topY + T.signLift / 2, sz], [0.5, T.signLift, 0.5]);
  signPanel(g, signW, T.signH, [0, signY, sz], def.sign ?? 'casino.sign.lucky', c1);
  strip(neon(c2), [0, signY + T.signH / 2 + 0.2, sz], [signW + 0.8, 0.4, 0.5]);
  strip(neon(c2), [0, signY - T.signH / 2 - 0.2, sz], [signW + 0.8, 0.4, 0.5]);
  for (const sx of [-1, 1]) strip(neon(c1), [sx * (signW / 2 + 0.2), signY, sz], [0.4, T.signH + 0.8, 0.5]);

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
