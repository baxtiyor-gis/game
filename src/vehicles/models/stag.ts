import type { ModelBuilder } from './types';
import { buildCar } from './car';
import { bumper, doors, exhausts, grille, hoodGuns, mirrors, rocketPod, roundHeadlights, tailLights, tube } from './parts';
import { chrome, glass, matte, paint, trim } from './palette';
import { roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

/** '70 Stag: kemperli pikap — kabina + orqada kemper qutisi, tomda raketa podi. */
export const stag: ModelBuilder = {
  wheel: 'truck',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.4);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, 0.0, 0.1],
        [zf - 0.1, 0.3, 0.12],
        [1.1, 0.36, 0.1],
        [-zf + 0.05, 0.1, 0.06],
        [-zf, -0.05, 0.05],
      ],
      cabin: [
        [1.1, 0.3],
        [0.7, 0.72, 0.15],
        [-0.25, 0.72, 0.1],
        [-0.35, 0.3],
      ],
      winKz: 0.9,
      winKy: 0.72,
      tumble: 0.05,
      nose: 0.06,
    });
    const x = bodyW / 2;
    // kemper qutisi
    const cream = matte('#eadfc4');
    const camp: Pt[] = [[-0.3, 0.1], [-0.3, 0.9, 0.08], [-zf + 0.05, 0.9, 0.08], [-zf + 0.05, 0.1]];
    k.add(sideExtrude(camp, bodyW * 0.94, { bevel: 0.06, taper: (y) => 1 - 0.06 * Math.max(0, y) }), cream);
    k.add(roundBox(bodyW * 0.97, 0.09, 2.15, 0.03), paint(k.def.color), { p: [0, 0.15, -1.5] }); // pastki bo'yoq belbog'i
    for (const sx of [-1, 1]) {
      k.add(roundBox(0.02, 0.38, 0.9, 0.02), glass(), { p: [sx * (x - 0.03), 0.5, -1.55] });
    }
    k.add(roundBox(0.8, 0.5, 0.02, 0.02), glass(), { p: [0, 0.48, -zf - 0.0] });
    k.add(roundBox(0.5, 0.1, 0.5, 0.03), chrome(), { p: [0.4, 0.93, -1.6] }); // tom shamollatgich
    // cab-over bunk
    k.add(roundBox(bodyW * 0.7, 0.2, 0.5, 0.06), cream, { p: [0, 0.8, 0.35] });
    grille(k, 1.1, 0.28, 0.12, zf, 4);
    roundHeadlights(k, 0.7, 0.16, zf - 0.02, 0.13);
    bumper(k, bodyW * 1.0, sill + 0.14, zf - 0.02, 0.18);
    bumper(k, bodyW * 1.0, sill + 0.14, -zf + 0.02, 0.18, false);
    tailLights(k, 0.8, 0.0, -zf + 0.01, 0.16, 0.22);
    exhausts(k, 0.55, sill + 0.15, -zf, 0.06);
    mirrors(k, x * 1.04, 0.5, 0.9);
    doors(k, x + 0.002, sill + 0.14, 0.3, [0.85, -0.2], [0.35]);
    tube(k, [-0.7, 0.9, -0.5], [0.7, 0.9, -0.5], 0.025, trim());
    hoodGuns(k, 0.42, 0.4, 1.5, 0.7);
    rocketPod(k, 0, 1.0, -1.95, 0.9, '#6a4a2a');
  },
};
