import * as THREE from 'three';
import { Kit } from './kit';
import type { Part } from './kit';
import { chrome, rubber, steel, trim, matte } from './palette';
import { cylX, lathe, roundBox } from './shapes';

export type WheelStyle = 'street' | 'mag' | 'offroad' | 'truck' | 'steelie';

const RADIAL = 16;
const cache = new Map<string, Part[]>();

/** Shina profili: yon devor + yumaloq protektor (yarim-profil, eksa = Y). */
function tireProfile(R: number, hr: number, w: number, bulk: number): Array<[number, number]> {
  const half = w / 2;
  const sw = hr + (R - hr) * bulk;
  const up: Array<[number, number]> = [
    [hr, half * 0.86],
    [hr + (R - hr) * 0.18, half],
    [sw, half * 0.98],
    [R * 0.985, half * 0.72],
    [R, half * 0.3],
  ];
  const down = up.map(([r, y]): [number, number] => [r, -y]).reverse();
  return [...down, ...up.slice().reverse().reverse()].filter((_, i, a) => i !== a.length).sort(() => 0);
}

/** G'ildirak qismlari (shina + disk), lokal koordinata: eksa = X, tashqi tomon = +X. Stil bo'yicha keshlanadi. */
export function wheelParts(radius: number, width: number, style: WheelStyle): Part[] {
  const key = `${radius.toFixed(3)}:${width.toFixed(3)}:${style}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const k = new Kit({ size: [1, 1, 1] } as never);
  const hubR = radius * (style === 'offroad' ? 0.5 : style === 'truck' ? 0.6 : 0.64);
  const bulk = style === 'offroad' ? 0.5 : style === 'truck' ? 0.4 : 0.3;

  const half = width / 2;
  const tireHalf: Array<[number, number]> = [
    [hubR, half * 0.86],
    [hubR + (radius - hubR) * 0.18, half],
    [hubR + (radius - hubR) * bulk, half * 0.98],
    [radius * 0.985, half * 0.72],
    [radius, half * 0.3],
  ];
  const profile: Array<[number, number]> = [
    ...tireHalf.map(([r, y]): [number, number] => [r, -y]),
    ...tireHalf.slice().reverse(),
  ];
  const tire = lathe(profile, RADIAL);
  tire.rotateZ(-Math.PI / 2);
  k.add(tire, rubber());
  void tireProfile;

  if (style === 'offroad') {
    const lugs = 12;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2;
      k.add(roundBox(width * 0.86, radius * 0.07, radius * 0.16, 0.012), rubber(), {
        p: [0, Math.cos(a) * radius * 1.0, Math.sin(a) * radius * 1.0],
        r: [-a + Math.PI / 2 - Math.PI / 2, 0, 0],
      });
    }
  }

  // disk: chuqurlashgan likopcha + markaziy qalpoq + boltlar/spitsalar
  const dish = lathe(
    [
      [0.001, half * 0.95],
      [hubR * 0.3, half * 0.97],
      [hubR * 0.36, half * 0.82],
      [hubR * 0.95, half * 0.7],
      [hubR, half * 0.55],
    ],
    RADIAL,
  );
  dish.rotateZ(-Math.PI / 2);
  const rim = style === 'truck' || style === 'steelie' ? steel() : chrome();
  k.add(dish, rim);
  const back = lathe([[0.001, half * 0.5], [hubR, half * 0.5]], RADIAL);
  back.rotateZ(-Math.PI / 2);
  k.add(back, style === 'mag' ? matte('#222') : trim());
  const spokes = style === 'mag' ? 5 : 6;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    k.add(roundBox(width * 0.12, hubR * 0.16, hubR * 0.7, 0.01), style === 'steelie' ? trim() : rim, {
      p: [half * 0.84, Math.cos(a) * hubR * 0.58, Math.sin(a) * hubR * 0.58],
      r: [a, 0, 0],
    });
  }
  k.add(cylX(hubR * 0.14, width * 0.05, 5), trim(), { p: [half * 0.99, 0, 0] });
  const parts = k.parts();
  cache.set(key, parts);
  return parts;
}

export const _debugTri = (p: Part[]): number => p.reduce((n, x) => n + x.geo.getAttribute('position').count / 3, 0);
export type { THREE };
