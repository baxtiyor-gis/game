import type { ModelBuilder } from './types';
import { exhausts, hoodGuns, rocketPod, roundHeadlights, tailLights, tube } from './parts';
import { amber, chrome, gunmetal, interior, matte, paint, steel, trim } from './palette';
import { cylY, cylZ, roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

/** '74 Strider: baja-buggy — ochiq g'ildiraklar, rolkletka, orqada dvigatel, turret. */
export const strider: ModelBuilder = {
  wheel: 'offroad',
  build(k) {
    const zf = k.l / 2;
    const col = paint(k.def.color);
    const gy = k.ground;
    const wy = k.wheelY;
    const floor = gy + 0.42;
    const cage = chrome();
    // pol + ramka
    k.add(roundBox(1.1, 0.12, 3.0, 0.05), trim(), { p: [0, floor, 0] });
    for (const sx of [-0.52, 0.52]) tube(k, [sx, floor + 0.02, -1.5], [sx, floor + 0.02, 1.6], 0.045, steel());
    // burun konusi (kuzov rangida)
    const nose: Pt[] = [[1.6, floor - 0.1, 0.05], [zf, floor + 0.28, 0.1], [1.35, floor + 0.6, 0.15], [0.45, floor + 0.62, 0.1], [0.45, floor - 0.1]];
    k.add(sideExtrude(nose, 1.3, { bevel: 0.05, taper: (_y, z) => 1 - 0.28 * Math.max(0, z - 0.5) / 1.4 }), col);
    // orqa dvigatel qopqog'i
    const eng: Pt[] = [[-0.3, floor, 0.05], [-0.3, floor + 0.5, 0.15], [-1.4, floor + 0.62, 0.15], [-1.75, floor + 0.3, 0.1], [-1.75, floor]];
    k.add(sideExtrude(eng, 1.0, { bevel: 0.05 }), col);
    k.add(roundBox(0.55, 0.3, 0.5, 0.05), gunmetal(), { p: [0, floor + 0.66, -1.2] }); // dvigatel
    // o'rindiqlar
    for (const sx of [-0.3, 0.3]) {
      k.add(roundBox(0.42, 0.1, 0.45, 0.04), interior(), { p: [sx, floor + 0.12, 0.05] });
      k.add(roundBox(0.42, 0.5, 0.1, 0.04), interior(), { p: [sx, floor + 0.38, -0.2], r: [-0.12, 0, 0] });
    }
    // rulkletka
    for (const sx of [-0.55, 0.55]) {
      tube(k, [sx, floor, 0.55], [sx, 0.55, 0.45], 0.035, cage);
      tube(k, [sx, 0.55, 0.45], [sx, 0.66, -0.75], 0.035, cage);
      tube(k, [sx, 0.58, -0.75], [sx, floor, -0.95], 0.035, cage);
      tube(k, [sx, 0.58, -0.75], [sx * 0.8, floor + 0.5, -1.55], 0.03, cage);
    }
    tube(k, [-0.55, 0.55, 0.45], [0.55, 0.55, 0.45], 0.035, cage);
    tube(k, [-0.55, 0.58, -0.75], [0.55, 0.58, -0.75], 0.035, cage);
    tube(k, [-0.55, 0.3, 0.5], [0.55, 0.5, 0.45], 0.02, cage);
    // fenderlar (g'ildirak ustida)
    for (const s of k.wheels) {
      k.add(roundBox(s.width * 1.0, 0.035, s.radius * 1.5, 0.015), col, { p: [s.x, wy + s.radius * 1.12, s.z], r: [s.front ? 0.12 : -0.08, 0, 0] });
    }
    // osma amortizatorlari, ko'rinadigan
    for (const s of k.wheels) tube(k, [s.x * 0.62, floor + 0.05, s.z], [s.x * 0.92, wy + 0.1, s.z], 0.03, steel());
    roundHeadlights(k, 0.35, floor + 0.38, zf - 0.12, 0.1);
    tailLights(k, 0.45, floor + 0.3, -1.76, 0.2, 0.1);
    k.add(roundBox(1.2, 0.05, 0.08, 0.02), amber(), { p: [0, 0.58, 0.45] }); // tom chiroq paneli
    exhausts(k, 0.25, floor + 0.2, -1.78, 0.06);
    hoodGuns(k, 0.28, floor + 0.64, 1.0, 0.7);
    // turret: orqa rolkletka ustida
    k.add(cylY(0.14, 0.18, 10), gunmetal(), { p: [0, 0.6, -0.78] });
    k.add(roundBox(0.2, 0.16, 0.3, 0.03), gunmetal(), { p: [0, 0.72, -0.78] });
    k.add(cylZ(0.035, 0.035, 0.7, 8), gunmetal(), { p: [0, 0.72, -0.35] });
    k.add(cylZ(0.05, 0.05, 0.1, 8), steel(), { p: [0, 0.72, 0.02] });
    rocketPod(k, 0, floor + 0.78, -1.2, 0.5, '#2a5a2a');
    k.add(roundBox(1.1, 0.03, 0.2, 0.01), matte('#222'), { p: [0, floor + 0.1, zf - 0.6] });
  },
};
