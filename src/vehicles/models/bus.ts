import type { ModelBuilder } from './types';
import { bumper, grille, hoodGuns, mirrors, rocketPod, roundHeadlights } from './parts';
import { amber, glass, matte, paint, tail, trim } from './palette';
import { archedBottom, box, cylZ, roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

/** '66 School Bus: maktab avtobusi — burunli, qora polosalar, stop-belgi, tom chiroqlari. */
export const bus: ModelBuilder = {
  wheel: 'truck',
  build(k) {
    const zf = k.l / 2;
    const col = paint(k.def.color);
    const wy = k.wheelY;
    const bot = k.sill(0.5);
    const W = k.w * 0.96;
    const rr = k.wheels[0]!.radius * 1.2;
    const zr = -k.wheels[0]!.z;
    const zFront = k.wheels[0]!.z;
    // asosiy salon
    const mainPoly: Pt[] = [
      ...archedBottom(bot, [{ z: zr, yc: wy, r: rr }], -zf, 1.75),
      [1.75, 1.2, 0.2],
      [-zf + 0.1, 1.25, 0.2],
    ];
    k.add(sideExtrude(mainPoly, W, { bevel: 0.08, segments: 1, taper: (y) => 1 - 0.07 * Math.max(0, (y - 0.4) / 0.9) }), col);
    // burun (kapot)
    const hood: Pt[] = [
      ...archedBottom(bot, [{ z: zFront, yc: wy, r: rr }], 1.6, zf),
      [zf, -0.35, 0.12],
      [zf - 0.1, 0.0, 0.25],
      [2.7, 0.15, 0.15],
      [1.6, 0.2],
    ];
    k.add(sideExtrude(hood, W * 0.72, { bevel: 0.07, segments: 1 }), col);
    for (const zc of [zFront, zr]) {
      const poly: Pt[] = [...archedBottom(wy - 0.1, [{ z: zc, yc: wy, r: rr }], zc - 1.05, zc + 1.05), [zc + 1.05, -0.95, 0.1], [zc + 0.8, -0.6, 0.3], [zc - 0.8, -0.6, 0.3], [zc - 1.05, -0.95, 0.1]];
      for (const sx of [-1, 1]) k.add(sideExtrude(poly, 0.6, { bevel: 0.05, bs: 1 }), col, { p: [sx * 1.1, 0, 0] });
    }
    const x = W / 2;
    // oyna qatori: shisha + ustunlar
    for (const sx of [-1, 1]) {
      k.add(roundBox(0.02, 0.62, 5.4, 0.015), glass(), { p: [sx * (x - 0.04), 0.65, -1.35] });
      for (let i = 0; i <= 4; i++) k.add(box(0.045, 0.7, 0.09), col, { p: [sx * (x - 0.025), 0.65, -4.05 + i * 1.35] });
      for (const [y, h] of [[0.2, 0.09], [-0.5, 0.09], [-0.9, 0.05]] as const) k.add(box(0.03, h, 6.1), trim(), { p: [sx * (x + 0.005), y, -1.35] });
    }
    k.add(roundBox(2.1, 0.7, 0.02, 0.02), glass(), { p: [0, 0.65, 1.78] }); // old oyna
    k.add(roundBox(1.9, 0.5, 0.02, 0.02), glass(), { p: [0, 0.65, -zf - 0.0] }); // orqa oyna
    k.add(box(0.9, 1.3, 0.04), matte('#e0a800'), { p: [0, -0.15, -zf - 0.02] });
    // tom chiroqlari
    for (const sx of [-0.85, -0.55, 0.55, 0.85]) {
      k.add(cylZ(0.1, 0.1, 0.06, 6), Math.abs(sx) > 0.7 ? amber() : tail(), { p: [sx, 1.1, 1.78] });
      if (Math.abs(sx) < 0.7) k.add(cylZ(0.1, 0.1, 0.06, 6), tail(), { p: [sx, 1.1, -zf - 0.02] });
    }
    // stop-belgi
    k.add(box(0.03, 0.4, 0.4), matte('#c01818'), { p: [x + 0.03, 0.55, 0.9] });
    roundHeadlights(k, 0.65, -0.4, zf - 0.03, 0.15);
    grille(k, 0.8, 0.5, -0.5, zf, 3);
    bumper(k, 2.45, bot + 0.2, zf - 0.02, 0.28);
    bumper(k, 2.45, bot + 0.2, -zf + 0.02, 0.28, false);
    for (const sx of [-1, 1]) k.add(box(0.3, 0.16, 0.05), tail(), { p: [sx * 0.95, -0.5, -zf - 0.03] });
    mirrors(k, x + 0.08, 0.7, 1.75);
    hoodGuns(k, 0.35, 0.2, 3.4, 0.8);
    for (const sx of [-0.7, 0.7]) rocketPod(k, sx, 1.4, -2.4, 1.5, '#3a3a3a');
  },
};
