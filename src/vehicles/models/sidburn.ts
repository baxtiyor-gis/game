import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, roundHeadlights, tailLights } from './parts';
import { chrome, glow, trim } from './palette';
import { roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

/** Sidburn: qora muscle car — kapotda havo olgich, yon tomonda alanga naqshi. */
export const sidburn: ModelBuilder = {
  wheel: 'mag',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.17);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.1, 0.1],
        [zf - 0.1, 0.14, 0.16],
        [0.8, 0.22, 0.14],
        [-1.7, 0.26, 0.12],
        [-zf, 0.3, 0.08],
        [-zf + 0.02, -0.05, 0.08],
      ],
      cabin: [
        [0.85, 0.2],
        [0.25, 0.6, 0.2],
        [-1.0, 0.6, 0.2],
        [-1.7, 0.26],
      ],
      winKz: 0.85,
      winKy: 0.72,
      tumble: 0.13,
    });
    const x = bodyW / 2;
    // kapot havo olgichi
    const scoop: Pt[] = [[1.55, 0.2, 0.03], [1.5, 0.37, 0.06], [0.95, 0.4, 0.08], [0.85, 0.22]];
    k.add(sideExtrude(scoop, 0.55, { bevel: 0.03 }), trim());
    k.add(roundBox(0.5, 0.12, 0.03, 0.01), chrome(), { p: [0, 0.31, 1.545] });
    k.add(roundBox(0.38, 0.06, 0.03, 0.01), trim(), { p: [0, 0.31, 1.56] });
    // alanga naqshlari (yon)
    const flame: Pt[] = [[1.6, -0.3], [1.55, -0.02], [0.95, 0.1], [0.2, 0.2], [0.6, -0.02], [-0.1, 0.0], [0.45, -0.12], [-0.35, -0.14], [0.5, -0.22], [0.15, -0.3]];
    const fl = glow('#ff7a00');
    for (const sx of [-1, 1]) k.add(sideExtrude(flame, 0.04, { bevel: 0.004 }), fl, { p: [sx * (x + 0.005), 0, 0] });
    grille(k, 1.2, 0.14, -0.14, zf, 5);
    roundHeadlights(k, 0.7, -0.02, zf - 0.02, 0.1);
    roundHeadlights(k, 0.42, -0.02, zf - 0.02, 0.1);
    bumper(k, bodyW * 1.0, sill + 0.1, zf - 0.02, 0.12);
    bumper(k, bodyW * 0.96, sill + 0.1, -zf + 0.02, 0.12, false);
    tailLights(k, 0.62, 0.12, -zf + 0.01, 0.4, 0.13);
    exhausts(k, 0.45, sill + 0.12, -zf, 0.05);
    mirrors(k, x * 0.96, 0.27, 0.7);
    doors(k, x + 0.002, sill + 0.1, 0.2, [0.7, -0.5, -1.2], [0.2]);
    hoodGuns(k, 0.55, 0.22, 0.95, 0.6);
    rocketPod(k, 0, 0.4, -1.95, 0.5, '#2c2c34');
  },
};
