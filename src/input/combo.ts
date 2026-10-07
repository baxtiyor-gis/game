import type { ComboDef, Dir } from '../core/types';

interface Tap {
  dir: Dir;
  t: number;
}

/**
 * Fighting-game uslubidagi kombo buferi: 3 ta yo'nalish "tap" + pulemyot.
 * Ketma-ket taplar orasidagi va oxirgi tap bilan pulemyot orasidagi vaqt <= window.
 */
export class ComboBuffer {
  private taps: Tap[] = [];

  constructor(
    private readonly combos: readonly ComboDef[],
    private readonly window = 0.4,
  ) {}

  tap(dir: Dir, t: number): void {
    this.taps.push({ dir, t });
    if (this.taps.length > 3) this.taps.shift();
  }

  /** Pulemyot bosilganda chaqiriladi. Mos kombo bo'lsa id qaytaradi va buferni tozalaydi. */
  trigger(t: number, allowed?: (c: ComboDef) => boolean): string | null {
    const taps = this.taps;
    if (taps.length < 3) return null;
    if (t - taps[2].t > this.window) return null;
    if (taps[1].t - taps[0].t > this.window || taps[2].t - taps[1].t > this.window) return null;
    const seq = taps.map((x) => x.dir).join('');
    const hit = this.combos.find((c) => c.input.join('') === seq && (!allowed || allowed(c)));
    if (!hit) return null;
    this.taps = [];
    return hit.id;
  }

  reset(): void {
    this.taps = [];
  }
}
