import { describe, expect, it } from 'vitest';
import { FIXED_DT, FixedLoop } from '../src/core/loop';
import { EventBus } from '../src/core/events';
import { ComboBuffer } from '../src/input/combo';
import combos from '../data/combos.json';
import type { ComboDef } from '../src/core/types';

describe('FixedLoop', () => {
  it('runs fixed steps and reports alpha', () => {
    let steps = 0;
    let alpha = -1;
    const loop = new FixedLoop(() => steps++, (_dt, a) => (alpha = a));
    loop.advance(FIXED_DT * 2.5);
    expect(steps).toBe(2);
    expect(alpha).toBeCloseTo(0.5, 5);
  });

  it('clamps huge frames', () => {
    let steps = 0;
    new FixedLoop(() => steps++, () => {}).advance(10);
    expect(steps).toBe(15);
  });
});

describe('EventBus', () => {
  it('emits and unsubscribes', () => {
    const bus = new EventBus<{ a: number }>();
    let got = 0;
    const off = bus.on('a', (n) => (got += n));
    bus.emit('a', 2);
    off();
    bus.emit('a', 5);
    expect(got).toBe(2);
  });
});

describe('ComboBuffer', () => {
  const buf = () => new ComboBuffer(combos as unknown as ComboDef[], 0.4);

  it('detects Afterburner (UUU + MG)', () => {
    const b = buf();
    b.tap('U', 0); b.tap('U', 0.1); b.tap('U', 0.2);
    expect(b.trigger(0.3)).toBe('missile.afterburner');
    expect(b.trigger(0.31)).toBeNull(); // bufer tozalangan
  });

  it('rejects slow input', () => {
    const b = buf();
    b.tap('D', 0); b.tap('D', 0.1); b.tap('D', 0.2);
    expect(b.trigger(0.7)).toBeNull();
  });

  it('respects allowed filter', () => {
    const b = buf();
    b.tap('L', 0); b.tap('R', 0.1); b.tap('U', 0.2);
    expect(b.trigger(0.25, (c) => c.weapon !== 'mine')).toBeNull();
  });
});
