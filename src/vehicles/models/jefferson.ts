import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, squareHeadlights, tailLights } from './parts';
import { darker } from './palette';

/** '69 Jefferson: uzun hashamatli sedan — vinil tom, katta xrom bamper. */
export const jefferson: ModelBuilder = {
  wheel: 'street',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.2);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.1, 0.1],
        [zf - 0.2, 0.22, 0.18],
        [1.0, 0.3, 0.15],
        [-2.0, 0.32, 0.12],
        [-zf + 0.08, 0.24, 0.1],
        [-zf, -0.1, 0.08],
      ],
      cabin: [
        [1.0, 0.28],
        [0.45, 0.68, 0.18],
        [-1.15, 0.68, 0.2],
        [-1.8, 0.3],
      ],
      winKz: 0.9,
      winKy: 0.76,
      roof: darker(k.def.color, 0.3),
      tumble: 0.1,
      nose: 0.06,
    });
    const x = bodyW / 2;
    grille(k, 1.3, 0.3, -0.02, zf + 0.0, 5);
    squareHeadlights(k, 0.75, 0.04, zf - 0.02, 0.32, 0.14);
    bumper(k, bodyW * 1.02, sill + 0.12, zf - 0.02, 0.18);
    bumper(k, bodyW * 0.98, sill + 0.12, -zf + 0.02, 0.16, false);
    tailLights(k, 0.72, 0.1, -zf + 0.01, 0.42, 0.14);
    exhausts(k, 0.65, sill + 0.14, -zf, 0.05);
    mirrors(k, x * 0.96, 0.34, 0.85);
    doors(k, x + 0.002, sill + 0.12, 0.28, [1.0, 0.1, -0.85], [0.55, -0.35]);
    hoodGuns(k, 0.42, 0.33, 1.5, 0.8);
    rocketPod(k, 0, 0.5, -2.25, 0.65, '#4a3a5a');
  },
};
