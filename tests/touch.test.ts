import { describe, expect, it } from 'vitest';
import { combos, controls } from '../src/core/data';
import { PlayerController } from '../src/input/playerController';
import { FlickDetector, TouchInput, applyDeadzone, clipStick, combosFor, touchVisible } from '../src/input/touch';
import { swipeDir } from '../src/ui/menu/swipe';
import { sanitize } from '../src/ui/menu/store';
import { vehicles } from '../src/core/data';

const R = controls.touch.stickRadius;
const DZ = controls.touch.deadzone;

describe('joystik -> throttle/steer', () => {
  it('clipStick: radiusdan tashqari qisiladi, y yuqoriga musbat', () => {
    expect(clipStick(0, -R, R)).toEqual({ x: 0, y: 1 });
    const c = clipStick(R * 3, 0, R);
    expect(c.x).toBeCloseTo(1);
    expect(Math.hypot(clipStick(R * 2, -R * 2, R).x, clipStick(R * 2, -R * 2, R).y)).toBeCloseTo(1);
  });

  it('deadzone ichida 0, tashqarisida 0..1', () => {
    expect(applyDeadzone({ x: DZ * 0.9, y: 0 }, DZ)).toEqual({ x: 0, y: 0 });
    expect(applyDeadzone({ x: 1, y: 0 }, DZ).x).toBeCloseTo(1);
    const mid = applyDeadzone({ x: 0.5, y: 0 }, DZ).x;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.5);
  });

  it('yuqoriga tortish = gaz, pastga = tormoz, o\'ngga = rul', () => {
    const t = new TouchInput();
    t.down(1, 'stick', 100, 300, 0);
    t.move(1, 100, 300 - R, 0.5);
    expect(t.drain().throttle).toBeCloseTo(1);
    t.move(1, 100, 300 + R / 2, 1);
    const f = t.drain();
    expect(f.throttle).toBeLessThan(0);
    t.move(1, 100 + R, 300, 1.5);
    expect(t.drain().steer).toBeCloseTo(1);
    t.up(1);
    const z = t.drain();
    expect(z.steer).toBe(0);
    expect(z.throttle).toBe(0);
  });
});

describe('flick -> kombo tap', () => {
  it('tez siljish yo\'nalishni beradi', () => {
    const f = new FlickDetector();
    expect(f.push({ x: 0, y: 0 }, 0)).toBeNull();
    expect(f.push({ x: 0, y: 1 }, 0.08)).toBe('U');
    const g = new FlickDetector();
    g.push({ x: 0, y: 0 }, 0);
    expect(g.push({ x: -1, y: 0.1 }, 0.1)).toBe('L');
  });

  it('sekin siljish, markazga qaytish va diagonal flick emas', () => {
    const f = new FlickDetector();
    f.push({ x: 0, y: 0 }, 0);
    expect(f.push({ x: 0.3, y: 0 }, 0.3)).toBeNull();
    expect(f.push({ x: 0.9, y: 0 }, 0.6)).toBeNull();
    const g = new FlickDetector();
    g.push({ x: 0, y: 1 }, 0);
    expect(g.push({ x: 0, y: 0 }, 0.08)).toBeNull(); // qaytish
    const d = new FlickDetector();
    d.push({ x: 0, y: 0 }, 0);
    expect(d.push({ x: 0.7, y: 0.7 }, 0.08)).toBeNull();
  });

  it('cooldown: bitta harakat bitta tap', () => {
    const f = new FlickDetector();
    f.push({ x: 0, y: 0 }, 0);
    expect(f.push({ x: 0, y: 1 }, 0.05)).toBe('U');
    expect(f.push({ x: 0, y: 0.95 }, 0.1)).toBeNull();
  });

  it('PlayerController: U U U flick + pulemyot = missile.afterburner', () => {
    const pc = new PlayerController('p1', null, null);
    const t = new TouchInput();
    pc.setTouch(t);
    t.down(1, 'stick', 100, 300, 0);
    let now = 0;
    for (let i = 0; i < 3; i++) {
      now += 0.05;
      t.move(1, 100, 300 - R, now); // yuqoriga flick
      now += 0.05;
      t.move(1, 100, 300, now); // qaytish (tap emas)
      now += 0.2;
      t.move(1, 100, 300, now);
    }
    t.down(2, 'mg', 0, 0, now);
    const s = pc.sample(0.016);
    expect(s.fireMG).toBe(true);
    expect(s.combo).toBe(combos.find((c) => c.input.join('') === 'UUU')?.id);
  });
});

describe('multi-touch holati', () => {
  it('joystik + ikki tugma bir vaqtda, ikkinchi barmoq joystikni olmaydi', () => {
    const t = new TouchInput();
    expect(t.down(1, 'stick', 50, 300, 0)).toBe(true);
    expect(t.down(2, 'mg', 0, 0, 0)).toBe(true);
    expect(t.down(3, 'drift', 0, 0, 0)).toBe(true);
    expect(t.down(4, 'stick', 70, 300, 0)).toBe(false);
    t.move(1, 50, 300 - R, 0.1);
    const f = t.drain();
    expect(f.throttle).toBeCloseTo(1);
    expect(f.mg && f.drift).toBe(true);
    t.up(2);
    expect(t.isHeld('mg')).toBe(false);
    expect(t.isHeld('drift')).toBe(true);
    expect(t.stickActive).toBe(true);
  });

  it('edge lar bir marta chiqadi; tez bosib qo\'yib yuborilgan pulemyot ham fire beradi', () => {
    const pc = new PlayerController('p1', null, null);
    const t = new TouchInput();
    pc.setTouch(t);
    t.down(1, 'weapon', 0, 0, 0);
    t.down(2, 'mg', 0, 0, 0);
    t.up(2);
    const a = pc.sample(0.016);
    expect(a.fireWeapon).toBe(true);
    expect(a.fireMG).toBe(true);
    const b = pc.sample(0.016);
    expect(b.fireWeapon).toBe(false);
    expect(b.fireMG).toBe(false);
  });

  it('tugma ikki barmoqda: birinchisi ko\'tarilsa ham bosilgan qoladi', () => {
    const t = new TouchInput();
    t.down(1, 'mg', 0, 0, 0);
    t.down(2, 'mg', 0, 0, 0);
    t.up(1);
    expect(t.isHeld('mg')).toBe(true);
    t.up(2);
    expect(t.isHeld('mg')).toBe(false);
  });

  it('kombo paneli id si input.combo ga to\'g\'ridan-to\'g\'ri tushadi', () => {
    const pc = new PlayerController('p1', null, null);
    const t = new TouchInput();
    pc.setTouch(t);
    t.sendCombo('mine.bear_hug');
    expect(pc.sample(0.016).combo).toBe('mine.bear_hug');
    expect(pc.sample(0.016).combo).toBeNull();
  });
});

describe('ko\'rinish va yordamchilar', () => {
  it('touchVisible: Avto/Yoqilgan/O\'chirilgan', () => {
    expect(touchVisible('auto', true, false, false)).toBe(true);
    expect(touchVisible('auto', false, true, false)).toBe(true);
    expect(touchVisible('auto', false, false, false)).toBe(false);
    expect(touchVisible('auto', true, true, true)).toBe(false); // klaviatura bosildi
    expect(touchVisible('on', false, false, true)).toBe(true);
    expect(touchVisible('off', true, true, false)).toBe(false);
  });

  it('combosFor: har qurol uchun 3 ta', () => {
    for (const w of ['missile', 'rocket', 'mortar', 'cannon', 'mine'] as const) expect(combosFor(w)).toHaveLength(3);
    expect(combosFor(undefined)).toEqual([]);
  });

  it('swipeDir: faqat yetarli gorizontal siljish', () => {
    expect(swipeDir(-80, 5)).toBe(1);
    expect(swipeDir(80, 5)).toBe(-1);
    expect(swipeDir(20, 0)).toBe(0);
    expect(swipeDir(60, 60)).toBe(0);
  });

  it('sozlama: touch rejimi sanitize qilinadi', () => {
    expect(sanitize({ touch: 'on' }, vehicles).touch).toBe('on');
    expect(sanitize({ touch: 'x' }, vehicles).touch).toBe('auto');
    expect(sanitize(null, vehicles).touch).toBe(controls.touch.defaultMode);
  });
});
