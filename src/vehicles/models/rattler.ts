import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, roundHeadlights, tailLights } from './parts';

/** '67 Rattler: 60-yillar sport kupesi — uzun kapot, kalta orqa, past tom. */
export const rattler: ModelBuilder = {
  wheel: 'mag',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.17);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.1, 0.12],
        [zf * 0.84, 0.1, 0.25],
        [0.55, 0.19, 0.2],
        [-1.5, 0.2, 0.15],
        [-zf * 0.97, 0.24, 0.1],
        [-zf, 0.0, 0.1],
      ],
      cabin: [
        [0.75, 0.15],
        [0.05, 0.575, 0.2],
        [-0.8, 0.575, 0.25],
        [-1.5, 0.15],
      ],
      winKz: 0.84,
      winKy: 0.74,
      tumble: 0.12,
    });
    const x = bodyW / 2;
    grille(k, 0.9, 0.2, -0.22, zf + 0.0, 3);
    roundHeadlights(k, 0.62, -0.06, zf - 0.02, 0.11);
    bumper(k, bodyW * 1.0, sill + 0.1, zf - 0.02, 0.12);
    bumper(k, bodyW * 0.96, sill + 0.1, -zf + 0.02, 0.11, false);
    tailLights(k, 0.66, 0.06, -zf + 0.01, 0.3, 0.1);
    exhausts(k, 0.5, sill + 0.12, -zf);
    mirrors(k, x * 0.96, 0.27, 0.5);
    doors(k, x + 0.002, sill + 0.1, 0.15, [0.65, -0.75], [0.25]);
    hoodGuns(k, 0.34, 0.2, 1.15, 0.7);
    rocketPod(k, 0, 0.36, -1.7, 0.6, '#5a6a45');
  },
};
