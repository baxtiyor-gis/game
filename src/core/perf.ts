// Yuklanish profili: har qadam performance.measure ga yoziladi (tests/e2e/perf.mjs o'qiydi).

/** Sinxron qadamni o'lchaydi: `load:<name>` measure yoziladi. */
export function timed<T>(name: string, fn: () => T): T {
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    performance.measure(`load:${name}`, { start: t0, end: performance.now() });
  }
}

/** Bosh oqimni bir kadrga bo'shatadi (brauzer chizadi va kiritishni qayta ishlaydi). */
export function yieldFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function' || (typeof document !== 'undefined' && document.hidden)) {
    return new Promise((r) => setTimeout(r, 0));
  }
  return new Promise((r) => requestAnimationFrame(() => r()));
}

/** Yuklanish bosqichlari haqida xabar beruvchi (0..1). */
export type Progress = (fraction: number) => void;
