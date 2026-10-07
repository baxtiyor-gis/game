import type { ModelBuilder } from './types';
import { bumper, hoodGuns, mirrors, rocketPod, roundHeadlights, grille, tube } from './parts';
import { amber, chrome, glass, gunmetal, matte, paint, steel, tail, trim } from './palette';
import { archedBottom, box, cylY, cylZ, roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

/** '72 Moth: yuk mashinasi (semi-truck) kabinasi — uzun kapot, uyqu bo'limi, xrom mo'rilar. */
export const moth: ModelBuilder = {
  wheel: 'truck',
  build(k) {
    const zf = k.l / 2;
    const col = paint(k.def.color);
    const dark = paint('#2a2a2e');
    const wy = k.wheelY;
    const bot = k.sill(0.55);
    // ramka relslari
    for (const sx of [-0.55, 0.55]) k.add(box(0.22, 0.3, 7.2), steel(), { p: [sx, bot + 0.2, 0.0] });
    k.add(box(1.5, 0.15, 0.3), trim(), { p: [0, bot + 0.2, 0.2] });
    // kapot
    const hood: Pt[] = [[3.55, bot + 0.2, 0.05], [3.55, 0.1, 0.15], [3.3, 0.38, 0.2], [1.3, 0.42, 0.15], [1.2, bot + 0.2]];
    k.add(sideExtrude(hood, 1.9, { bevel: 0.07 }), col);
    // fenderlar
    for (const zc of [2.55, -2.55]) {
      const poly: Pt[] = [...archedBottom(wy - 0.1, [{ z: zc, yc: wy, r: 0.9 }], zc - 1.1, zc + 1.1), [zc + 1.1, -0.9, 0.1], [zc + 0.9, -0.55, 0.3], [zc - 0.9, -0.55, 0.3], [zc - 1.1, -0.9, 0.1]];
      for (const sx of [-1, 1]) k.add(sideExtrude(poly, 0.62, { bevel: 0.05, bs: 1 }), dark, { p: [sx * 1.1, 0, 0] });
    }
    // kabina + uyqu bo'limi
    const cab: Pt[] = [[1.25, bot + 0.2], [1.25, 0.45, 0.1], [1.05, 1.1, 0.15], [-1.0, 1.15, 0.15], [-1.05, bot + 0.2]];
    k.add(sideExtrude(cab, 2.35, { bevel: 0.08, taper: (y) => 1 - 0.06 * Math.max(0, y + 1) / 2.4 }), col);
    const sleeper: Pt[] = [[-1.0, bot + 0.2], [-1.0, 0.95, 0.1], [-2.05, 0.9, 0.15], [-2.1, bot + 0.2]];
    k.add(sideExtrude(sleeper, 2.2, { bevel: 0.07 }), col);
    k.add(sideExtrude([[1.05, 1.05], [0.9, 1.38, 0.12], [-1.1, 1.5, 0.12], [-1.4, 1.1]], 1.9, { bevel: 0.05 }), matte('#e8e4d8')); // havo deflektori
    k.add(roundBox(2.0, 0.02, 0.62, 0.01), glass(), { p: [0, 0.78, 1.17], r: [-0.3, 0, 0] });
    for (const sx of [-1, 1]) {
      k.add(roundBox(0.02, 0.55, 1.5, 0.02), glass(), { p: [sx * 1.17, 0.58, 0.15] });
      k.add(roundBox(0.02, 0.32, 0.6, 0.02), glass(), { p: [sx * 1.1, 0.3, -1.5] });
      tube(k, [sx * 1.3, 1.1, -1.18], [sx * 1.28, -0.5, -1.18], 0.07, chrome(), 6); // mo'ri
      k.add(cylZ(0.28, 0.28, 1.3, 8), chrome(), { p: [sx * 1.08, bot - 0.1, 0.25] }); // yonilg'i baki
    }
    mirrors(k, 1.3, 0.55, 1.3);
    k.add(box(1.6, 0.06, 0.06), trim(), { p: [0, 0.4, 3.0] });
    grille(k, 1.5, 1.25, -0.4, zf - 0.17, 8);
    roundHeadlights(k, 0.95, -0.55, zf - 0.17, 0.17);
    bumper(k, 2.3, bot + 0.2, zf - 0.1, 0.3);
    for (const sx of [-1, 1]) k.add(box(0.3, 0.14, 0.05), tail(), { p: [sx * 0.7, bot + 0.25, -zf + 0.02] });
    k.add(box(0.1, 0.1, 0.05), amber(), { p: [0, 1.5, 1.0] });
    // beshinchi g'ildirak plitasi
    k.add(cylY(0.75, 0.12, 14), gunmetal(), { p: [0, bot + 0.45, -2.75] });
    hoodGuns(k, 0.5, 0.45, 2.7, 0.9);
    rocketPod(k, 0, bot + 0.75, -3.0, 1.4, '#4a5a3a');
  },
};
