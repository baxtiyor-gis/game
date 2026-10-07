import type { ModelBuilder } from './types';
import { buildCar } from './car';
import { bumper, hoodGuns, mirrors, rocketPod, roundHeadlights, spareTire, tailLights, tube } from './parts';
import { chrome, glass, gunmetal, interior, matte, paint, steel, trim } from './palette';
import { cylZ, roundBox } from './shapes';

/** '73 Glenn 4x4: ochiq harbiy jip — tekis kapot, tushuvchi old oyna, orqada pulemyot. */
export const glenn: ModelBuilder = {
  wheel: 'offroad',
  build(k) {
    const zf = k.l / 2;
    const sill = k.sill(0.3);
    const { bodyW } = buildCar(k, {
      yBottom: sill,
      top: [
        [zf, -0.05, 0.06],
        [zf - 0.02, 0.2, 0.06],
        [0.55, 0.26, 0.06],
        [0.5, 0.15],
        [-0.2, 0.15],
        [-0.3, 0.26, 0.04],
        [-zf + 0.05, 0.26, 0.05],
        [-zf, 0.05, 0.05],
      ],
      cabin: [],
      bodyW: 0.97,
      tumble: 0.02,
      nose: 0.04,
    });
    const col = paint(k.def.color);
    const x = bodyW / 2;
    // old panjara + faralar
    k.add(roundBox(1.0, 0.34, 0.05, 0.02), trim(), { p: [0, 0.06, zf + 0.0] });
    for (let i = 0; i < 5; i++) k.add(roundBox(0.03, 0.26, 0.03, 0.005), steel(), { p: [-0.32 + i * 0.16, 0.06, zf + 0.03] });
    roundHeadlights(k, 0.7, 0.14, zf - 0.04, 0.12);
    bumper(k, bodyW * 1.0, sill + 0.12, zf - 0.02, 0.16);
    bumper(k, bodyW * 0.95, sill + 0.12, -zf + 0.02, 0.14, false);
    tailLights(k, 0.7, 0.14, -zf + 0.01, 0.18, 0.14);
    // old oyna ramkasi
    tube(k, [-0.82, 0.2, 0.55], [-0.78, 0.76, 0.35], 0.03, col);
    tube(k, [0.82, 0.2, 0.55], [0.78, 0.76, 0.35], 0.03, col);
    tube(k, [-0.8, 0.76, 0.35], [0.8, 0.76, 0.35], 0.03, col);
    k.add(roundBox(1.45, 0.02, 0.5, 0.008), glass(), { p: [0, 0.48, 0.45], r: [-1.15, 0, 0] });
    // salon: o'rindiqlar, rul
    for (const sx of [-0.42, 0.42]) {
      k.add(roundBox(0.5, 0.12, 0.5, 0.04), interior(), { p: [sx, 0.2, -0.1] });
      k.add(roundBox(0.5, 0.45, 0.1, 0.04), interior(), { p: [sx, 0.45, -0.38], r: [-0.12, 0, 0] });
    }
    k.add(roundBox(1.5, 0.12, 0.5, 0.04), interior(), { p: [0, 0.2, -1.05] });
    // yon g'ildirak gumbazlari uchun fenderlar
    // zaxira, kanistr
    spareTire(k, 0.45, 0.45, -zf - 0.12, 0.38);
    k.add(roundBox(0.14, 0.34, 0.3, 0.03), matte('#6a7a3a'), { p: [x + 0.04, 0.35, -1.1] });
    mirrors(k, x * 1.0, 0.5, 0.45);
    // sherik tomonda dag'al qo'riqlagich + ikkita pulemyot
    hoodGuns(k, 0.35, 0.3, 1.0, 0.55);
    tube(k, [0, 0.2, -0.55], [0, 0.78, -0.55], 0.05, gunmetal());
    k.add(roundBox(0.18, 0.14, 0.3, 0.03), gunmetal(), { p: [0, 0.86, -0.5] });
    for (const sx of [-0.05, 0.05]) k.add(cylZ(0.03, 0.03, 0.8, 8), gunmetal(), { p: [sx, 0.86, 0.0] });
    for (const sx of [-0.05, 0.05]) k.add(cylZ(0.045, 0.045, 0.08, 8), chrome(), { p: [sx, 0.86, 0.42] });
    rocketPod(k, 0, 0.42, -1.5, 0.55, '#3d4d22');
  },
};
