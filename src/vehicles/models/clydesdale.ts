import { buildCar } from './car';
import type { ModelBuilder } from './types';
import { bumper, doors, grille, hoodGuns, mirrors, rocketPod, roundHeadlights, spareTire, tailLights, tube } from './parts';
import { chrome, gunmetal } from './palette';
import { roundBox } from './shapes';

/** '70 Clydesdale: kvadrat SUV — yuk tomi, bull-bar, zaxira g'ildirak. */
export const clydesdale: ModelBuilder = {
  wheel: 'offroad',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.3);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, 0.05, 0.08],
        [zf - 0.05, 0.3, 0.1],
        [1.0, 0.34, 0.08],
        [-zf + 0.05, 0.34, 0.08],
        [-zf, 0.1, 0.06],
      ],
      cabin: [
        [1.0, 0.3],
        [0.85, 0.72, 0.1],
        [-2.2, 0.72, 0.1],
        [-2.25, 0.3],
      ],
      winKz: 0.93,
      winKy: 0.74,
      tumble: 0.05,
      nose: 0.05,
    });
    const x = bodyW / 2;
    grille(k, 1.1, 0.3, 0.12, zf + 0.0, 4);
    roundHeadlights(k, 0.72, 0.15, zf - 0.02, 0.13);
    bumper(k, bodyW * 1.0, sill + 0.14, zf - 0.02, 0.2);
    bumper(k, bodyW * 1.0, sill + 0.14, -zf + 0.02, 0.2, false);
    // bull-bar
    tube(k, [-0.6, sill + 0.3, zf + 0.12], [-0.6, 0.15, zf + 0.12], 0.04, chrome());
    tube(k, [0.6, sill + 0.3, zf + 0.12], [0.6, 0.15, zf + 0.12], 0.04, chrome());
    tube(k, [-0.6, 0.15, zf + 0.12], [0.6, 0.15, zf + 0.12], 0.04, chrome());
    tailLights(k, 0.75, 0.2, -zf + 0.01, 0.2, 0.28);
    mirrors(k, x * 1.0, 0.5, 0.85);
    doors(k, x + 0.002, sill + 0.14, 0.72, [0.8, -0.4, -1.5], [0.4, -0.7]);
    spareTire(k, 0, 0.35, -zf - 0.1, 0.4);
    hoodGuns(k, 0.4, 0.37, 1.5, 0.6);
    // tom ustidagi yuk panjarasi + raketa podi
    tube(k, [-0.8, 0.75, -1.9], [-0.8, 0.75, 0.6], 0.025, gunmetal());
    tube(k, [0.8, 0.75, -1.9], [0.8, 0.75, 0.6], 0.025, gunmetal());
    k.add(roundBox(1.7, 0.03, 0.05, 0.01), gunmetal(), { p: [0, 0.75, 0.5] });
    k.add(roundBox(1.7, 0.03, 0.05, 0.01), gunmetal(), { p: [0, 0.75, -1.8] });
    rocketPod(k, 0, 0.83, -0.6, 1.1, '#8a6a22', 0.8);
  },
};
