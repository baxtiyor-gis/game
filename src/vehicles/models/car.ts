import { Kit } from './kit';
import { glass, paint } from './palette';
import { archedBottom, roundBox, sideExtrude } from './shapes';
import type { Pt } from './shapes';

export interface CarSpec {
  yBottom: number;
  /** Pastki kuzov yuqori konturi (old -> orqa). Oxirgi/birinchi nuqtalar zMax/zMin ga yetishi kerak. */
  top: Pt[];
  /** Kabina ko'pburchagi: [oldPastki, oldYuqori, (...), orqaYuqori, orqaPastki]. */
  cabin: Pt[];
  bodyW?: number; // w ulushi
  cabinW?: number; // bodyW ulushi
  winKz?: number; // derazani zichroq qilish (z bo'yicha, 0.8 = 20% qisqa)
  winKy?: number; // tom qalinligi (y bo'yicha)
  tumble?: number; // yuqoriga torayish (0..1)
  nose?: number; // old/orqa uchlarning torayishi
  roof?: string; // tom rangi (ixtiyoriy)
  windshield?: boolean;
  sideWin?: boolean; // false: yon oynalarni builder o'zi qo'shadi
}

/** Umumiy sedan/kupe kuzov: pastki korpus + kabina + deraza + old/orqa oynalar. Qaytaradi: kabina o'lchamlari. */
export function buildCar(k: Kit, s: CarSpec): { cabinW: number; bodyW: number } {
  const color = k.def.color;
  const bodyW = k.w * (s.bodyW ?? 0.96);
  const cabinW = bodyW * (s.cabinW ?? 0.86);
  const zMax = k.l / 2;
  const nose = s.nose ?? 0.1;
  const tumble = s.tumble ?? 0.08;
  const bot = s.yBottom;
  const H = k.h / 2 - bot;

  const outline: Pt[] = [...archedBottom(bot, k.arches(), -zMax, zMax), ...s.top];
  const lower = sideExtrude(outline, bodyW, {
    bevel: 0.06,
    taper: (y, z) => {
      const e = Math.max(0, (Math.abs(z) - zMax * 0.55) / (zMax * 0.45));
      return 1 - nose * e * e - tumble * 0.5 * Math.max(0, (y - bot) / H);
    },
  });
  k.add(lower, paint(color));

  const cab = s.cabin;
  if (cab.length === 0) return { cabinW: 0, bodyW };
  const ys = cab.map((p) => p[1]);
  const yb = Math.min(...ys);
  const yt = Math.max(...ys);
  const cTaper = (y: number): number => 1 - tumble * ((y - yb) / (yt - yb));
  const cabinGeo = sideExtrude(cab, cabinW, { bevel: 0.05, taper: (y) => cTaper(y) });
  k.add(cabinGeo, paint(s.roof ?? color));

  // deraza: kabinani markazga qarab kichraytirib, kengroq cho'zamiz (yon oynalar)
  const cz = cab.reduce((a, p) => a + p[0], 0) / cab.length;
  const kz = s.winKz ?? 0.86;
  const ky = s.winKy ?? 0.72;
  const win: Pt[] = cab.map((p) => [cz + (p[0] - cz) * kz, yb + (p[1] - yb) * ky, 0.03] as Pt);
  if (s.sideWin !== false) k.add(sideExtrude(win, cabinW * 1.02, { bevel: 0.015, taper: cTaper }), glass());

  if (s.windshield !== false) {
    const quad = (a: Pt, b: Pt, out: 1 | -1, inset: number): void => {
      const dz = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dz, dy);
      const ym = (a[1] + b[1]) / 2;
      let nz = -dy / len;
      let ny = dz / len;
      if (nz * out < 0) {
        nz = -nz;
        ny = -ny;
      }
      k.add(roundBox(cabinW * cTaper(ym) * inset, 0.02, len * ky * 0.92, 0.008), glass(), {
        p: [0, ym + ny * 0.012, (a[0] + b[0]) / 2 + nz * 0.012],
        r: [-Math.atan2(dy, dz), 0, 0],
      });
    };
    quad(cab[0]!, cab[1]!, 1, 0.9);
    quad(cab[cab.length - 2]!, cab[cab.length - 1]!, -1, 0.86);
  }
  return { cabinW, bodyW };
}
