import * as THREE from 'three';
import type { Vec2 } from './types';

/** Temir yo'l o'qi: Catmull-Rom spline, teng masofali namunalar, balandlik = relyef + lift (silliqlangan). */
export class TrackPath {
  readonly length: number;
  readonly step: number;
  private readonly pts: THREE.Vector3[];

  constructor(points: Vec2[], heightAt: (x: number, z: number) => number, lift: number, step = 1) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    const n = Math.max(2, Math.ceil(curve.getLength() / step));
    this.pts = curve.getSpacedPoints(n);
    this.length = curve.getLength();
    this.step = this.length / n;
    const ys = this.pts.map((p) => heightAt(p.x, p.z));
    for (let pass = 0; pass < 3; pass++) {
      const src = ys.slice();
      for (let i = 0; i < ys.length; i++) {
        let sum = 0;
        let cnt = 0;
        for (let k = -4; k <= 4; k++) {
          const v = src[i + k];
          if (v !== undefined) (sum += v), cnt++;
        }
        ys[i] = sum / cnt;
      }
    }
    this.pts.forEach((p, i) => (p.y = ys[i]! + lift));
  }

  /** s (iz boshidan masofa, m) dagi nuqta va yo'nalish (birlik). Chegaradan tashqarida to'g'ri chiziq bo'ylab davom etadi. */
  at(s: number, pos: THREE.Vector3, dir?: THREE.Vector3): void {
    const last = this.pts.length - 1;
    const u = s / this.step;
    const i = Math.min(last - 1, Math.max(0, Math.floor(u)));
    const a = this.pts[i]!;
    const b = this.pts[i + 1]!;
    const d = dir ?? new THREE.Vector3();
    d.subVectors(b, a).normalize();
    if (u < 0) pos.copy(this.pts[0]!).addScaledVector(d, s);
    else if (u > last) pos.copy(this.pts[last]!).addScaledVector(d, s - this.length);
    else pos.lerpVectors(a, b, u - i);
  }
}
