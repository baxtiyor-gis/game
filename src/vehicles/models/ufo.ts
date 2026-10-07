import * as THREE from 'three';
import type { ModelBuilder } from './types';
import { chrome, glass, glow, gunmetal, paint } from './palette';
import { cylZ, lathe } from './shapes';

const LIGHTS = 12;

/** NUJ: uchar likopcha — g'ildiraksiz, gumbaz, pastida yorug'lik halqasi. */
export const ufo: ModelBuilder = {
  wheel: 'none',
  build(k) {
    const R = k.w / 2;
    const col = paint(k.def.color);
    const hull = lathe(
      [
        [0.001, -0.26],
        [R * 0.28, -0.3],
        [R * 0.46, -0.24],
        [R * 0.75, -0.2],
        [R * 0.97, -0.08],
        [R * 1.0, 0.0],
        [R * 0.92, 0.1],
        [R * 0.7, 0.18],
        [R * 0.45, 0.24],
        [R * 0.38, 0.26],
        [0.001, 0.26],
      ],
      36,
    );
    k.add(hull, col);
    k.add(lathe([[R * 0.2, -0.3], [R * 0.44, -0.3], [R * 0.46, -0.24], [R * 0.2, -0.24]].reverse() as Array<[number, number]>, 24), glow('#7ff0ff'));
    k.add(lathe([[0.001, -0.31], [R * 0.3, -0.31]] as Array<[number, number]>, 24), glow('#a8f6ff'));
    k.add(lathe([[R * 0.98, -0.07], [R * 1.035, 0.0], [R * 0.98, 0.07]], 36), chrome());
    // gumbaz
    const dome: Array<[number, number]> = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      dome.push([R * 0.4 * Math.cos(a) + 0.001, 0.24 + R * 0.24 * Math.sin(a)]);
    }
    k.add(lathe(dome.reverse(), 24), glass());
    k.add(lathe([[R * 0.41, 0.22], [R * 0.44, 0.26], [R * 0.4, 0.29]].reverse() as Array<[number, number]>, 24), chrome());
    // chetidagi chiroqlar
    for (let i = 0; i < LIGHTS; i++) {
      const a = (i / LIGHTS) * Math.PI * 2;
      k.add(new THREE.SphereGeometry(0.075, 6, 4), glow(i % 2 ? '#ffd24a' : '#7ff0ff'), { p: [Math.cos(a) * R * 0.99, 0.0, Math.sin(a) * R * 0.99] });
    }
    // ikkita nur-qurol (old tomonda) + antenna
    for (const sx of [-1, 1]) {
      k.add(cylZ(0.07, 0.05, 0.6, 8), gunmetal(), { p: [sx * 0.5, -0.1, R * 0.82] });
      k.add(cylZ(0.09, 0.09, 0.08, 8), glow('#ff4a8a'), { p: [sx * 0.5, -0.1, R * 0.82 + 0.3] });
    }
    k.add(new THREE.SphereGeometry(0.06, 6, 4), glow('#ff4a8a'), { p: [0, 0.5, 0] });
  },
};
