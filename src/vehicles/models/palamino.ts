import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, squareHeadlights, stripe, tailLights } from './parts';
import { matte } from './palette';
import { roundBox } from './shapes';
import { trim } from './palette';

/** '75 Palamino: fastback muscle car — kapot zarbasi, qo'sh poygalar. */
export const palamino: ModelBuilder = {
  wheel: 'mag',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.17);
    const hood: Array<[number, number]> = [[zf - 0.2, 0.1], [0.7, 0.22]];
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.1, 0.1],
        [zf - 0.2, 0.1, 0.2],
        [0.7, 0.22, 0.15],
        [-1.3, 0.24, 0.1],
        [-zf, 0.26, 0.08],
        [-zf + 0.02, -0.05, 0.08],
      ],
      cabin: [
        [0.8, 0.2],
        [0.15, 0.62, 0.2],
        [-0.45, 0.62, 0.25],
        [-1.95, 0.26],
      ],
      winKz: 0.8,
      winKy: 0.72,
      tumble: 0.1,
    });
    const x = bodyW / 2;
    const blue = matte('#1d4fa8');
    for (const sx of [-0.22, 0.22]) {
      stripe(k, [...hood, [-0.1, 0.23], [-1.3, 0.25], [-zf + 0.05, 0.27]], sx, 0.16, blue);
    }
    k.add(roundBox(0.5, 0.09, 0.6, 0.03), trim(), { p: [0, 0.24, 1.35], r: [-0.12, 0, 0] }); // kapot zarbasi
    grille(k, 1.1, 0.16, -0.12, zf, 4);
    squareHeadlights(k, 0.62, 0.0, zf - 0.02, 0.2, 0.14);
    squareHeadlights(k, 0.35, 0.0, zf - 0.02, 0.14, 0.14);
    bumper(k, bodyW * 1.0, sill + 0.1, zf - 0.02, 0.12);
    bumper(k, bodyW * 0.96, sill + 0.1, -zf + 0.02, 0.12, false);
    tailLights(k, 0.62, 0.12, -zf + 0.01, 0.34, 0.12);
    exhausts(k, 0.55, sill + 0.12, -zf);
    mirrors(k, x * 0.96, 0.28, 0.65);
    doors(k, x + 0.002, sill + 0.1, 0.2, [0.7, -0.75], [0.3]);
    hoodGuns(k, 0.52, 0.25, 1.0, 0.65);
    rocketPod(k, 0, 0.36, -1.95, 0.55, '#c9c9c0');
  },
};
