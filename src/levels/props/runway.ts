import * as THREE from 'three';
import type { PropDef } from '../types';
import { stdMat } from './common';
import type { PropBuild } from './common';
import { air, ac } from './airKit';

const R = air.runway;
const STEP = 4;
/** 7 segmentli raqamlar: a yuqori, b yuqori-o'ng, c past-o'ng, d past, e past-chap, f yuqori-chap, g o'rta */
const DIGITS: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg' };

/** Relyefga yopishgan to'rtburchaklar to'plami (bitta geometriya): har bir to'rtburchak STEP m katakchalarga bo'linadi. */
class Strips {
  private readonly pos: number[] = [];
  private readonly idx: number[] = [];
  constructor(
    private readonly px: number,
    private readonly pz: number,
    private readonly yaw: number,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly lift: number,
  ) {}

  /** Runway lokal koordinatalarida (x uzunlik, z kenglik) markazi (cx, cz) va o'lchami (lx, lz) bilan to'rtburchak. */
  rect(cx: number, cz: number, lx: number, lz: number): void {
    const nx = Math.max(1, Math.ceil(lx / STEP));
    const nz = Math.max(1, Math.ceil(lz / STEP));
    const base = this.pos.length / 3;
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        const x = cx - lx / 2 + (lx * i) / nx;
        const z = cz - lz / 2 + (lz * j) / nz;
        const wx = this.px + x * c + z * s;
        const wz = this.pz - x * s + z * c;
        this.pos.push(wx, this.heightAt(wx, wz) + this.lift, wz);
      }
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i;
        const b = a + 1;
        const d = a + nx + 1;
        this.idx.push(a, d, b, b, d, a + nx + 2);
      }
    }
  }

  /** `up` = +1 raqam "tepasi" +x tomonga, -1 bo'lsa -x tomonga qaragan; (cx, cz) — raqam markazi. */
  digit(ch: string, cx: number, cz: number, up: 1 | -1): void {
    const [W, T, H] = R.digitSize as [number, number, number];
    const seg = (u: number, v: number, horizontal: boolean): void => {
      const lx = up * v + cx;
      const lz = up * u + cz;
      if (horizontal) this.rect(lx, lz, T, W);
      else this.rect(lx, lz, H / 2, T);
    };
    for (const k of DIGITS[ch] ?? '') {
      if (k === 'a') seg(0, H / 2, true);
      if (k === 'd') seg(0, -H / 2, true);
      if (k === 'g') seg(0, 0, true);
      if (k === 'b') seg(W / 2, H / 4, false);
      if (k === 'c') seg(W / 2, -H / 4, false);
      if (k === 'e') seg(-W / 2, -H / 4, false);
      if (k === 'f') seg(-W / 2, H / 4, false);
    }
  }

  get empty(): boolean {
    return this.pos.length === 0;
  }

  mesh(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    m.userData.ownGeo = true;
    return m;
  }
}

const decal = (key: string, color: string, rough: number, units: number): THREE.MeshStandardMaterial =>
  stdMat(`air.decal.${key}`, color, rough, 0.05, { polygonOffset: true, polygonOffsetFactor: -units, polygonOffsetUnits: -units });

/**
 * Uchish-qo'nish yo'lagi / taksi yo'li / perron. def.length (x bo'yicha), def.width, def.variant:
 * 'runway' (belgilar, R.label raqamlari: birinchi ikki raqam -x chetida, qolgani +x chetida), 'taxiway' (sariq o'q chizig'i), 'apron' (beton, chekka chiziq).
 */
export function createRunway(def: PropDef, heightAt: (x: number, z: number) => number): PropBuild {
  const L = def.length ?? 360;
  const W = def.width ?? 40;
  const variant = def.variant ?? 'runway';
  const [px, pz] = def.pos;
  const yaw = def.yaw ?? 0;
  const surface = new Strips(px, pz, yaw, heightAt, R.edge);
  surface.rect(0, 0, L, W);
  const white = new Strips(px, pz, yaw, heightAt, R.edge + R.markLift);
  const yellow = new Strips(px, pz, yaw, heightAt, R.edge + R.markLift);
  const edge = W / 2 - 1.0;
  if (variant === 'runway') {
    for (const s of [1, -1]) white.rect(0, s * edge, L - 6, 0.5);
    for (let x = -L / 2 + 40; x + R.dashLength <= L / 2 - 40; x += R.dashLength + R.dashGap) white.rect(x + R.dashLength / 2, 0, R.dashLength, R.dashWidth);
    for (const e of [1, -1]) {
      for (let i = 0; i < R.thresholdBars; i++) {
        const z = -edge + 3 + ((2 * (edge - 3)) * (i + 0.5)) / R.thresholdBars;
        white.rect(e * (L / 2 - 8), z, 9, 0.8);
      }
      for (const d of [45, 75]) for (const s of [1, -1]) white.rect(e * (L / 2 - d), s * 5, d === 45 ? 12 : 8, 1.4);
    }
    const [dw] = R.digitSize as [number, number, number];
    const label = R.label;
    label.slice(0, 2).split('').forEach((ch, i) => white.digit(ch, -L / 2 + 28, (i - 0.5) * dw * 1.7, 1));
    label.slice(2).split('').forEach((ch, i) => white.digit(ch, L / 2 - 28, -(i - 0.5) * dw * 1.7, -1));
  } else if (variant === 'taxiway') {
    yellow.rect(0, 0, L - 2, 0.45);
    for (const s of [1, -1]) white.rect(0, s * edge, L - 2, 0.3);
  } else {
    for (const s of [1, -1]) yellow.rect(0, s * edge, L - 2, 0.35);
    for (const s of [1, -1]) yellow.rect(s * (L / 2 - 1), 0, 0.35, W - 2);
  }
  const g = new THREE.Group();
  const base = variant === 'apron' ? decal('apron', ac.concrete!, 0.95, 1) : decal('asphalt', ac.runway!, 0.95, 1);
  g.add(surface.mesh(base));
  if (!white.empty) g.add(white.mesh(decal('white', ac.line!, 0.85, 3)));
  if (!yellow.empty) g.add(yellow.mesh(decal('yellow', ac.yellow!, 0.85, 3)));
  return { object: g, colliders: [] };
}
