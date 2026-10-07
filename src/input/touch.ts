// Sensorli kiritish: DOM ga bog'liq bo'lmagan sof mantiq (joystik, flick -> kombo tap, multi-touch holati).
import { combos, controls } from '../core/data';
import type { ComboDef, Dir, WeaponId } from '../core/types';

export type TouchMode = 'auto' | 'on' | 'off';
export type TouchButton = 'mg' | 'weapon' | 'special' | 'drift' | 'cycle';
export type TouchTarget = 'stick' | TouchButton;
export const TOUCH_MODES: readonly TouchMode[] = ['auto', 'on', 'off'];
export const TOUCH_CFG = controls.touch;

export interface Axes { x: number; y: number }

/** Barmoq siljishini radius ichiga qisadi: -1..1 (y yuqoriga musbat), uzunligi <= 1. */
export function clipStick(dx: number, dy: number, radius: number): Axes {
  const len = Math.hypot(dx, dy) / radius;
  const k = len > 1 ? 1 / len : 1;
  return { x: (dx / radius) * k, y: (-dy / radius) * k };
}

/** Radial deadzone: ichida 0, tashqarisida 0..1 ga qayta tarqatiladi. */
export function applyDeadzone(a: Axes, dz: number): Axes {
  const m = Math.hypot(a.x, a.y);
  if (m <= dz) return { x: 0, y: 0 };
  const k = Math.min(1, (m - dz) / (1 - dz)) / m;
  return { x: a.x * k, y: a.y * k };
}

/** Joystikni tez "silkitish" (flick): qisqa oynada katta siljish va tashqi zonada tugash. */
export class FlickDetector {
  private hist: { x: number; y: number; t: number }[] = [];
  private blockedUntil = -Infinity;

  constructor(private readonly cfg = TOUCH_CFG.flick) {}

  reset(): void {
    this.hist = [];
    this.blockedUntil = -Infinity;
  }

  /** a: joystik holati (y yuqoriga musbat), t: soniya. Flick bo'lsa yo'nalish qaytaradi. */
  push(a: Axes, t: number): Dir | null {
    const c = this.cfg;
    this.hist.push({ x: a.x, y: a.y, t });
    while (this.hist.length > 1 && t - this.hist[0]!.t > c.window) this.hist.shift();
    if (t < this.blockedUntil || Math.hypot(a.x, a.y) < c.minEnd) return null;
    let best: Dir | null = null;
    let bestLen = 0;
    for (const p of this.hist) {
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const len = Math.hypot(dx, dy);
      if (len < c.minDist || len <= bestLen) continue;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (Math.max(ax, ay) < Math.min(ax, ay) * c.axisRatio) continue;
      best = ax > ay ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'U' : 'D';
      bestLen = len;
    }
    if (!best) return null;
    this.hist = [{ x: a.x, y: a.y, t }];
    this.blockedUntil = t + c.cooldown;
    return best;
  }
}

/** Tanlangan qurolga tegishli kombolar (panel tugmalari uchun). */
export function combosFor(weapon: WeaponId | undefined, list: readonly ComboDef[] = combos): ComboDef[] {
  return weapon ? list.filter((c) => c.weapon === weapon) : [];
}

/** Sensorli boshqaruv ko'rinishi: Yoqilgan/O'chirilgan majburiy, Avto: sensorli qurilma va klaviatura ishlatilmagan. */
export function touchVisible(mode: TouchMode, coarse: boolean, touched: boolean, keyboardUsed: boolean): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return (coarse || touched) && !keyboardUsed;
}

export interface TouchFrame {
  throttle: number;
  steer: number;
  mg: boolean;
  drift: boolean;
  mgPressed: boolean;
  weaponPressed: boolean;
  specialPressed: boolean;
  cycle: boolean;
  taps: Dir[];
  combo: string | null;
}

/** Ko'p barmoqli holat: har pointer id bitta rolga (joystik yoki tugma) bog'lanadi. */
export class TouchInput {
  private readonly roles = new Map<number, TouchTarget>();
  private readonly held = new Map<TouchButton, number>();
  private readonly flick = new FlickDetector();
  private stickId: number | null = null;
  private origin: Axes = { x: 0, y: 0 };
  private axes: Axes = { x: 0, y: 0 };
  private edges = { mg: false, weapon: false, special: false, cycle: false };
  private taps: Dir[] = [];
  private pendingCombo: string | null = null;

  constructor(private readonly cfg = TOUCH_CFG) {}

  get stickActive(): boolean {
    return this.stickId !== null;
  }

  /** Joystik asosi (ekran koordinatasi) va hozirgi qisilgan holati (y yuqoriga musbat). */
  get stick(): { origin: Axes; raw: Axes } {
    return { origin: this.origin, raw: this.axes };
  }

  isHeld(b: TouchButton): boolean {
    return (this.held.get(b) ?? 0) > 0;
  }

  /** true: pointer qabul qilindi. Joystik faqat bitta barmoqqa; tugma bir nechta barmoqqa ham beriladi. */
  down(id: number, target: TouchTarget, x: number, y: number, t: number): boolean {
    if (this.roles.has(id)) return false;
    if (target === 'stick') {
      if (this.stickId !== null) return false;
      this.stickId = id;
      this.origin = { x, y };
      this.axes = { x: 0, y: 0 };
      this.flick.reset();
      this.flick.push(this.axes, t);
    } else {
      const n = this.held.get(target) ?? 0;
      this.held.set(target, n + 1);
      if (n === 0) this.edge(target);
    }
    this.roles.set(id, target);
    return true;
  }

  move(id: number, x: number, y: number, t: number): void {
    if (id !== this.stickId) return;
    this.axes = clipStick(x - this.origin.x, y - this.origin.y, this.cfg.stickRadius);
    const dir = this.flick.push(this.axes, t);
    if (dir) this.taps.push(dir);
  }

  up(id: number): void {
    const role = this.roles.get(id);
    if (!role) return;
    this.roles.delete(id);
    if (role === 'stick') {
      this.stickId = null;
      this.axes = { x: 0, y: 0 };
      this.flick.reset();
    } else this.held.set(role, Math.max(0, (this.held.get(role) ?? 1) - 1));
  }

  /** Kombo paneli tugmasi: id to'g'ridan-to'g'ri keyingi sample ga beriladi. */
  sendCombo(id: string): void {
    this.pendingCombo = id;
  }

  reset(): void {
    this.roles.clear();
    this.held.clear();
    this.stickId = null;
    this.axes = { x: 0, y: 0 };
    this.flick.reset();
    this.edges = { mg: false, weapon: false, special: false, cycle: false };
    this.taps = [];
    this.pendingCombo = null;
  }

  /** Controller sample da chaqiriladi: holat + edge lar; edge lar tozalanadi. */
  drain(): TouchFrame {
    const a = applyDeadzone(this.axes, this.cfg.deadzone);
    const e = this.edges;
    const f: TouchFrame = {
      throttle: a.y, steer: a.x, mg: this.isHeld('mg'), drift: this.isHeld('drift'),
      mgPressed: e.mg, weaponPressed: e.weapon, specialPressed: e.special, cycle: e.cycle,
      taps: this.taps, combo: this.pendingCombo,
    };
    this.edges = { mg: false, weapon: false, special: false, cycle: false };
    this.taps = [];
    this.pendingCombo = null;
    return f;
  }

  private edge(b: TouchButton): void {
    if (b === 'mg') this.edges.mg = true;
    else if (b === 'weapon') this.edges.weapon = true;
    else if (b === 'special') this.edges.special = true;
    else if (b === 'cycle') this.edges.cycle = true;
  }
}
