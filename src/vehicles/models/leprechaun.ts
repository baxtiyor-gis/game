import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, hoodGuns, mirrors, rocketPod, roundHeadlights, tailLights } from './parts';
import { chrome, darker, matte, paint, trim } from './palette';
import { roundBox } from './shapes';

/** '76 Leprechaun: kalta hatchback — katta orqa eshik, tom ustida kichik pod. */
export const leprechaun: ModelBuilder = {
  wheel: 'steelie',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.22);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.12, 0.12],
        [zf - 0.15, 0.1, 0.25],
        [1.0, 0.2, 0.2],
        [-1.8, 0.24, 0.12],
        [-zf, 0.16, 0.1],
        [-zf, -0.1, 0.08],
      ],
      cabin: [
        [1.1, 0.16],
        [0.5, 0.5, 0.22],
        [-1.25, 0.5, 0.25],
        [-1.95, 0.2],
      ],
      winKz: 0.88,
      winKy: 0.7,
      tumble: 0.1,
      nose: 0.14,
    });
    const x = bodyW / 2;
    k.add(roundBox(1.3, 0.14, 0.04, 0.015), trim(), { p: [0, -0.06, zf - 0.02] }); // panjara
    roundHeadlights(k, 0.58, 0.0, zf - 0.02, 0.12);
    bumper(k, bodyW * 0.98, sill + 0.1, zf - 0.02, 0.12);
    bumper(k, bodyW * 0.96, sill + 0.1, -zf + 0.02, 0.12, false);
    tailLights(k, 0.62, 0.08, -zf + 0.01, 0.26, 0.2);
    k.add(roundBox(bodyW * 0.8, 0.05, 0.3, 0.02), paint(darker(k.def.color, 0.55)), { p: [0, 0.38, -1.95], r: [0.15, 0, 0] }); // spoyler
    k.add(roundBox(bodyW * 0.55, 0.12, 0.04, 0.015), chrome(), { p: [0, -0.05, -zf - 0.01] });
    mirrors(k, x * 0.95, 0.22, 0.95);
    doors(k, x + 0.002, sill + 0.1, 0.16, [0.8, -0.6], [0.35]);
    k.add(roundBox(bodyW * 0.9, 0.04, 0.04, 0.01), matte('#f4f0e0'), { p: [0, 0.0, zf - 0.04] });
    hoodGuns(k, 0.4, 0.2, 1.15, 0.55);
    rocketPod(k, 0, 0.56, -0.35, 0.6, '#3a6a5a', 0.8);
  },
};
