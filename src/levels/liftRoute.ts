import * as THREE from 'three';
import type { SkiLiftDef, Vec2 } from './types';
import { ski } from './props/skiKit';

const L = ski.lift;

/** Yopiq ko'pburchak arqon izi: nuqtalar bo'ylab masofa (s) -> joy va yo'nalish. */
export class LiftRoute {
  readonly cum: number[] = [0];
  readonly length: number;

  constructor(readonly pts: THREE.Vector3[]) {
    for (let i = 0; i < pts.length; i++) this.cum.push(this.cum[i]! + pts[i]!.distanceTo(pts[(i + 1) % pts.length]!));
    this.length = this.cum[pts.length]!;
  }

  /** s (m, aylanma) dagi nuqta va birlik yo'nalish */
  at(s: number, pos: THREE.Vector3, dir: THREE.Vector3): void {
    const t = ((s % this.length) + this.length) % this.length;
    let lo = 0;
    while (lo < this.pts.length - 1 && this.cum[lo + 1]! <= t) lo++;
    const a = this.pts[lo]!;
    const b = this.pts[(lo + 1) % this.pts.length]!;
    const seg = this.cum[lo + 1]! - this.cum[lo]!;
    dir.subVectors(b, a).divideScalar(seg || 1);
    pos.copy(a).addScaledVector(dir, t - this.cum[lo]!);
  }
}

export interface LiftLayout {
  route: LiftRoute;
  /** Yuqoriga ketayotgan arqon nuqtalari (pastki stansiya -> ustunlar -> yuqori stansiya) */
  up: THREE.Vector3[];
  /** Pastga qaytayotgan arqon nuqtalari (yuqoridan pastga) */
  down: THREE.Vector3[];
  /** Pastki -> yuqori birlik yo'nalish (x, z) */
  dir: Vec2;
}

/** Stansiyalar va ustunlar (chiziq bo'ylab tartiblangan) dan ikki parallel arqon: yuqoriga (+gap/2) va pastga (-gap/2). */
export function buildLayout(def: SkiLiftDef, pylons: Vec2[], pylonTop: number, heightAt: (x: number, z: number) => number): LiftLayout {
  const ux = def.top[0] - def.bottom[0];
  const uz = def.top[1] - def.bottom[1];
  const len = Math.hypot(ux, uz);
  const dir: Vec2 = [ux / len, uz / len];
  const proj = (p: Vec2): number => (p[0] - def.bottom[0]) * dir[0] + (p[1] - def.bottom[1]) * dir[1];
  const sorted = [...pylons].sort((a, b) => proj(a) - proj(b));
  const centre: Array<{ p: Vec2; y: number }> = [
    { p: def.bottom, y: heightAt(def.bottom[0], def.bottom[1]) + L.station.cableY },
    ...sorted.map((p) => ({ p, y: heightAt(p[0], p[1]) + pylonTop + L.pylon.cableOver })),
    { p: def.top, y: heightAt(def.top[0], def.top[1]) + L.station.cableY },
  ];
  const line = (side: number): THREE.Vector3[] =>
    centre.map(({ p, y }) => new THREE.Vector3(p[0] - dir[1] * side * (L.gap / 2), y, p[1] + dir[0] * side * (L.gap / 2)));
  const up = line(1);
  const down = line(-1).reverse();
  return { route: new LiftRoute([...up, ...down]), up, down, dir };
}
