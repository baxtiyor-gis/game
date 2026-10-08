import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { dam, dmat } from './damKit';

const W = dam.wall;
const ZERO: Origin = { x: 0, y: 0, z: 0, yaw: 0 };

/** Terrain to'ri tugunlariga mos (aligned) koordinatalar: [from, to] oralig'ida, har `step` katakda. */
function gridLine(from: number, to: number, cell: number, half: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil((from + half) / cell) * cell - half; v <= to + 1e-6; v += cell * step) out.push(v);
  return out;
}

/**
 * Terrain ustiga yopishgan beton "teri": tugunlari terrain to'ri bilan bir xil, +faceOffset yuqorida.
 * Tik bo'ylab bandEvery m dan qavat-qavat soyalanadi (beton quyish choklari).
 */
function skin(heightAt: (x: number, z: number) => number, xs: number[], zs: number[]): THREE.Mesh {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const light = new THREE.Color(dam.colors.concrete);
  const shade = new THREE.Color(dam.colors.concreteShade);
  const c = new THREE.Color();
  for (let j = 0; j < zs.length; j++) {
    for (let i = 0; i < xs.length; i++) {
      const y = heightAt(xs[i]!, zs[j]!);
      pos.push(xs[i]!, y + W.faceOffset, zs[j]!);
      c.copy(Math.floor(y / W.bandEvery) % 2 === 0 ? light : shade);
      if (Math.abs(xs[i]! % W.jointEvery) < 1e-3) c.multiplyScalar(W.jointShade); // kengayish choki (tik chiziq)
      col.push(c.r, c.g, c.b);
    }
  }
  const n = xs.length;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, dmat('#ffffff', 0.9, 0.02, { vertexColors: true, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  m.userData.ownGeo = true;
  return m;
}

/** Parapet bo'laklari: [-len/2, len/2] dan `gaps` (x oralig'i) chiqarib tashlangan. */
function pieces(len: number, gaps: number[][]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let a = -len / 2;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0]! - q[0]!)) {
    if (g0! > a) out.push([a, g0!]);
    a = Math.max(a, g1!);
  }
  if (a < len / 2) out.push([a, len / 2]);
  return out;
}

/**
 * To'g'on devori. Ko'rinish: terrain (egilgan beton yuza) ustiga yopishgan beton "teri" (quyi va yuqori oqim yuzlari),
 * asfalt yo'l, o'rta chiziq, parapet (bo'shliqlar bilan: chetidan pastga tushsa bo'ladi) va ustunlar.
 * Joy: pos — to'g'on o'qining markazi (yo'l balandligi terrain dan), length — o'q bo'ylab (x), yaw=0 (teri dunyo to'ri bo'yicha).
 * Haydash yuzasi — terrain heightfield (to'g'on tanasi relyefda), parapetlar — alohida kuboid kollayderlar.
 */
export function createDamWall(R: Rapier, def: PropDef, heightAt: (x: number, z: number) => number, size: number, resolution: number): PropBuild {
  const [cx, cz] = def.pos;
  const len = def.length ?? 270;
  const y0 = heightAt(cx, cz);
  const cell = size / resolution;
  const half = size / 2;
  const g = new THREE.Group();
  g.name = 'damWall';

  // Teri: quyi oqim (janub, +z) yuzi toki tag qismigacha; yuqori oqim (shimol) yuzi suv ostigacha
  const xs = gridLine(cx - len / 2, cx + len / 2, cell, half, 2);
  const down = gridLine(cz + W.half, cz + W.half + W.downReach, cell, half, 1);
  const cut = down.findIndex((z) => heightAt(cx, z) < W.minFaceY);
  g.add(skin(heightAt, xs, cut >= 0 ? down.slice(0, cut + 1) : down));
  const up = gridLine(cz - W.half - W.upReach, cz - W.half, cell, half, 1);
  const wet = up.findIndex((z) => heightAt(cx, z) >= W.yMin);
  g.add(skin(heightAt, xs, wet > 0 ? up.slice(wet - 1) : up));

  // Asfalt yo'l (to'g'on ustidan platogacha) va o'rta chiziq
  put(g, unitBox(), dmat('asphalt', 0.95, 0), [cx, y0, cz], [len + 30, 0.08, 2 * W.half]);
  const dashes = Math.floor(len / W.lineEvery);
  for (let i = 0; i < dashes; i++) {
    put(g, unitBox(), dmat('line', 0.8, 0), [cx - len / 2 + (i + 0.5) * W.lineEvery, y0 + 0.05, cz], [W.lineLen, 0.03, W.lineW]);
  }

  // Parapetlar (qavs bilan) va uchlaridagi ustunlar
  const colliders = [];
  const parapet = dmat('concreteDark', 0.9, 0.02);
  for (const [side, gaps] of [[-1, dam.wall.gaps.up], [1, dam.wall.gaps.down]] as const) {
    const z = cz + side * W.half;
    for (const [a, b] of pieces(len, gaps)) {
      const w = b - a;
      put(g, unitBox(), parapet, [cx + (a + b) / 2, y0 + W.parapetH / 2, z], [w, W.parapetH, W.parapetT]);
      colliders.push(box(R, ZERO, [cx + (a + b) / 2, y0 + W.parapetH / 2, z], [w / 2, W.parapetH / 2, W.parapetT / 2]));
      for (const e of [a, b]) put(g, unitBox(), dmat('concrete', 0.9, 0.02), [cx + e, y0 + (W.parapetH + 0.4) / 2, z], [W.post, W.parapetH + 0.4, W.post]);
    }
  }
  return { object: g, colliders };
}
