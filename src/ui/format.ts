// Sof yordamchi funksiyalar (DOM/Three ga bog'liq emas) — HUD hisob-kitoblari.

/** Yonib turgan segmentlar soni: tirik bo'lsa kamida 1, to'liq bo'lsa total. */
export function litSegments(hp: number, maxHp: number, total: number): number {
  if (hp <= 0 || maxHp <= 0) return 0;
  const ratio = Math.min(1, hp / maxHp);
  return Math.max(1, Math.min(total, Math.ceil(ratio * total)));
}

/** Shikast bosqichi (damage.ts bilan bir xil qoida): chegaradan past bo'lgan limitlar soni. */
export function stageOf(hp: number, maxHp: number, limits: readonly number[]): number {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  return limits.filter((l) => ratio < l).length;
}

/** Bosqich -> rang (palitra uzunligidan oshsa oxirgisi). */
export function stageColor(stage: number, palette: readonly string[]): string {
  const i = Math.max(0, Math.min(palette.length - 1, stage));
  return palette[i];
}

export function isCritical(hp: number, maxHp: number, threshold: number): boolean {
  return maxHp > 0 && hp > 0 && hp / maxHp < threshold;
}

export interface RadarPoint {
  /** -1..1, o'ngga musbat */
  x: number;
  /** -1..1, pastga musbat (oldi = yuqori = manfiy) */
  y: number;
  /** masofa radar chegarasidan oshgan (nuqta chetga qisilgan) */
  clamped: boolean;
}

/**
 * Dunyo siljishi (dx, dz) ni radar koordinatasiga: o'yinchi markazda, oldi (fx, fz) yuqoriga.
 * Three.js (o'ng qo'l, Y yuqori): o'ng = (-fz, 0, fx).
 */
export function worldToRadar(dx: number, dz: number, fx: number, fz: number, range: number, out: RadarPoint): RadarPoint {
  const len = Math.hypot(fx, fz) || 1;
  const nx = fx / len;
  const nz = fz / len;
  const fwd = dx * nx + dz * nz;
  const right = -dx * nz + dz * nx;
  let x = right / range;
  let y = -fwd / range;
  const d = Math.hypot(x, y);
  out.clamped = d > 1;
  if (out.clamped) {
    x /= d;
    y /= d;
  }
  out.x = x;
  out.y = y;
  return out;
}

/**
 * Nishon ko'rsatkichi uchun mezon: raqib oldi konusida va masofada bo'lsa masofa, aks holda Infinity.
 * Eng kichik qiymat = eng yaqin.
 */
export function aheadDistance(dx: number, dz: number, fx: number, fz: number, range: number, minCos: number): number {
  const dist = Math.hypot(dx, dz);
  const flen = Math.hypot(fx, fz);
  if (dist === 0 || flen === 0 || dist > range) return Infinity;
  const cos = (dx * fx + dz * fz) / (dist * flen);
  return cos >= minCos ? dist : Infinity;
}

/** NDC (-1..1, Y yuqoriga) -> piksel (Y pastga). */
export function ndcToPixel(nx: number, ny: number, width: number, height: number): { x: number; y: number } {
  return { x: (nx * 0.5 + 0.5) * width, y: (-ny * 0.5 + 0.5) * height };
}

/** "WHAMMY x{n}!" kabi shablonlarni to'ldiradi. */
export function fillTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function formatScore(n: number, pad: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(pad, '0');
}
