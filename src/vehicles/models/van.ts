import type { ModelBuilder } from './types';
import { buildCar } from './car';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, roundHeadlights, stripe, tailLights } from './parts';
import { glass, matte, trim } from './palette';
import { roundBox } from './shapes';

/** '70 Van: 70-yillar furgoni — old tomoni tekis, yon polosalar, yumaloq oyna. */
export const van: ModelBuilder = {
  wheel: 'steelie',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.3);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, 0.0, 0.14],
        [zf - 0.05, 0.28, 0.14],
        [1.6, 0.4, 0.14],
        [-zf + 0.05, 0.4, 0.08],
        [-zf, 0.1, 0.06],
      ],
      cabin: [
        [1.7, 0.35],
        [1.35, 0.84, 0.12],
        [-zf + 0.05, 0.84, 0.12],
        [-zf + 0.02, 0.35],
      ],
      cabinW: 0.98,
      sideWin: false,
      tumble: 0.04,
      nose: 0.06,
    });
    const x = bodyW / 2;
    const brown = matte('#8a4a1a');
    const orange = matte('#d86a1a');
    for (const [dy, m] of [[0.12, brown], [0.0, orange]] as const) {
      for (const sx of [-1, 1]) stripe(k, [[zf - 0.3, dy], [-zf + 0.2, dy]], sx * (x + 0.01), 0.02, m);
    }
    // yon oynalar
    for (const sx of [-1, 1]) {
      k.add(roundBox(0.02, 0.36, 0.8, 0.02), glass(), { p: [sx * (x - 0.02), 0.55, 0.45] });
      k.add(roundBox(0.02, 0.36, 1.1, 0.02), glass(), { p: [sx * (x - 0.02), 0.55, -1.0] });
      k.add(roundBox(0.02, 0.36, 0.9, 0.02), glass(), { p: [sx * (x - 0.02), 0.55, -1.95] });
    }
    k.add(roundBox(1.4, 0.4, 0.02, 0.02), glass(), { p: [0, 0.58, -zf - 0.0] });
    grille(k, 0.9, 0.24, 0.05, zf + 0.0, 3);
    roundHeadlights(k, 0.7, 0.1, zf - 0.02, 0.13);
    k.add(roundBox(1.8, 0.05, 0.04, 0.01), trim(), { p: [0, -0.1, zf] });
    bumper(k, bodyW * 1.0, sill + 0.14, zf - 0.02, 0.17);
    bumper(k, bodyW * 1.0, sill + 0.14, -zf + 0.02, 0.17, false);
    tailLights(k, 0.8, 0.15, -zf + 0.01, 0.14, 0.34);
    exhausts(k, 0.5, sill + 0.15, -zf, 0.05);
    mirrors(k, x * 1.04, 0.55, 1.65);
    doors(k, x + 0.002, sill + 0.14, 0.7, [1.2, 0.05, -0.1], [0.9, 0.1]);
    hoodGuns(k, 0.45, 0.32, 2.0, 0.55);
    rocketPod(k, 0, 0.95, -1.2, 1.1, '#6a5a1a');
  },
};
