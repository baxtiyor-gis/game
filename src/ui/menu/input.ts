// Menyu kiritishi: klaviatura + gamepad -> mavhum Action. Tutib turilganda navigatsiya takrorlanadi.
import { Gamepad } from '../../input/gamepad';
import { MENU, type Action } from './config';

export interface ActionEvent { action: Action; pad: boolean }

const NAV: Action[] = ['up', 'down', 'left', 'right'];

export class MenuInput {
  /** false bo'lsa kalitlar brauzerga qoldiriladi (o'yin davomida). */
  capture = true;
  private readonly pad = new Gamepad(0);
  private readonly hold = new Map<Action, number>();
  private readonly lookup = new Map<string, Action>();

  constructor(private readonly emit: (e: ActionEvent) => void, target: Window = window) {
    for (const [a, codes] of Object.entries(MENU.keys)) for (const c of codes) this.lookup.set(c, a as Action);
    target.addEventListener('keydown', (e) => {
      const a = this.lookup.get(e.code);
      if (!a || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat && !NAV.includes(a)) return;
      if (this.capture) e.preventDefault();
      this.emit({ action: a, pad: false });
    });
  }

  /** Har kadr: gamepad tugmalari (edge + takrorlash). */
  poll(dt: number): void {
    if (!this.pad.poll()) return;
    const p = MENU.pad;
    const th = p.axisThreshold ?? 0.6;
    const ax = this.pad.axis(p.axisX ?? 0, 0);
    const ay = this.pad.axis(p.axisY ?? 1, 0);
    const down: [Action, boolean][] = [
      ['up', this.pad.isDown(p.up ?? 12) || ay < -th],
      ['down', this.pad.isDown(p.down ?? 13) || ay > th],
      ['left', this.pad.isDown(p.left ?? 14) || ax < -th],
      ['right', this.pad.isDown(p.right ?? 15) || ax > th],
    ];
    for (const [a, on] of down) this.repeat(a, on, dt);
    if (this.pad.wasPressed(p.ok ?? 0)) this.emit({ action: 'ok', pad: true });
    if (this.pad.wasPressed(p.back ?? 1)) this.emit({ action: 'back', pad: true });
    if (this.pad.wasPressed(p.start ?? 9)) this.emit({ action: 'pause', pad: true });
  }

  private repeat(a: Action, on: boolean, dt: number): void {
    if (!on) return void this.hold.delete(a);
    const t = this.hold.get(a);
    if (t === undefined) {
      this.hold.set(a, MENU.repeat.delay);
      return this.emit({ action: a, pad: true });
    }
    const left = t - dt;
    if (left > 0) return void this.hold.set(a, left);
    this.hold.set(a, MENU.repeat.rate);
    this.emit({ action: a, pad: true });
  }
}
