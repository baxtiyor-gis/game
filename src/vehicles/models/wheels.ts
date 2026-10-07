import { Kit } from './kit';
import type { Part } from './kit';
import { chrome, rubber, steel, trim } from './palette';
import { box, cylX, lathe } from './shapes';

export type WheelStyle = 'street' | 'mag' | 'offroad' | 'truck' | 'steelie' | 'none';

const RADIAL = 14;
const LUGS = 8;
const cache = new Map<string, Part[]>();

/** G'ildirak qismlari (shina + disk). Lokal eksa = X, tashqi tomon = +X. (radius, eni, stil) bo'yicha keshlanadi. */
export function wheelParts(radius: number, width: number, style: WheelStyle): Part[] {
  if (style === 'none') return [];
  const key = `${radius.toFixed(3)}:${width.toFixed(3)}:${style}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const k = new Kit({ size: [1, 1, 1] } as never);
  const R = radius;
  const half = width / 2;
  const hubR = R * (style === 'offroad' ? 0.5 : style === 'truck' ? 0.6 : 0.64);
  const bulk = style === 'offroad' ? 0.5 : style === 'truck' ? 0.4 : 0.3;

  // shina: yon devor + yumaloq protektor (profil, eksa = Y; keyin X ga burilgan)
  const side: Array<[number, number]> = [
    [hubR, half * 0.86],
    [hubR + (R - hubR) * bulk, half],
    [R * 0.985, half * 0.72],
    [R, half * 0.3],
  ];
  const tire = lathe([...side.map(([r, y]): [number, number] => [r, -y]), ...side.slice().reverse()], RADIAL);
  tire.rotateZ(-Math.PI / 2);
  k.add(tire, rubber());

  if (style === 'offroad') {
    for (let i = 0; i < LUGS; i++) {
      const a = (i / LUGS) * Math.PI * 2;
      k.add(box(width * 0.88, R * 0.08, R * 0.2), rubber(), {
        p: [0, Math.cos(a) * R, Math.sin(a) * R],
        r: [a, 0, 0],
      });
    }
  }

  // disk: chuqur likopcha (tashqi tomon +X) + spitsalar + markaziy qalpoq
  const rim = style === 'truck' || style === 'steelie' ? steel() : chrome();
  const dish = lathe(
    [
      [hubR, half * 0.88],
      [hubR, half * 0.55],
      [hubR * 0.4, half * 0.8],
      [hubR * 0.3, half * 0.97],
      [0.001, half * 0.95],
    ],
    RADIAL,
  );
  dish.rotateZ(-Math.PI / 2);
  k.add(dish, rim);
  const spokes = style === 'mag' || style === 'truck' ? 5 : 6;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    k.add(box(width * 0.12, hubR * 0.16, hubR * 0.72), style === 'steelie' ? trim() : rim, {
      p: [half * 0.86, Math.cos(a) * hubR * 0.6, Math.sin(a) * hubR * 0.6],
      r: [a - Math.PI / 2, 0, 0],
    });
  }
  k.add(cylX(hubR * 0.16, width * 0.06, 6), trim(), { p: [half, 0, 0] });
  const parts = k.parts();
  cache.set(key, parts);
  return parts;
}
