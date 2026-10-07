import { combos, controls } from '../core/data';
import type { Controller, Dir, InputState } from '../core/types';
import { ComboBuffer } from './combo';
import type { Gamepad } from './gamepad';
import type { Keyboard } from './keyboard';

export function emptyInput(): InputState {
  return {
    throttle: 0, steer: 0, handbrake: false, fireMG: false, fireWeapon: false,
    fireSpecial: false, cycleWeapon: 0, rearView: false, combo: null,
  };
}

const kb = controls.keyboard;
const gp = controls.gamepad;
const DIRS: [Dir, readonly string[], number][] = [
  ['U', kb.throttle, gp.dpadUp],
  ['D', kb.brake, gp.dpadDown],
  ['L', kb.left, gp.dpadLeft],
  ['R', kb.right, gp.dpadRight],
];

/** Klaviatura va/yoki gamepad dan InputState yig'adi. */
export class PlayerController implements Controller {
  private readonly buffer = new ComboBuffer(combos, controls.comboWindow);
  private time = 0;
  private readonly state = emptyInput();

  constructor(
    readonly id: string,
    private readonly keyboard: Keyboard | null,
    private readonly pad: Gamepad | null,
  ) {}

  sample(dt: number): InputState {
    this.time += dt;
    const k = this.keyboard;
    const p = this.pad?.poll() ? this.pad : null;
    const s = this.state;

    const up = (k?.isDown(kb.throttle) ? 1 : 0) || (p ? Math.max(p.value(gp.throttle), p.isDown(gp.dpadUp) ? 1 : 0) : 0);
    const down = (k?.isDown(kb.brake) ? 1 : 0) || (p ? Math.max(p.value(gp.brake), p.isDown(gp.dpadDown) ? 1 : 0) : 0);
    let steer = (k?.isDown(kb.right) ? 1 : 0) - (k?.isDown(kb.left) ? 1 : 0);
    if (p) steer += p.axis(gp.steerAxis, gp.deadzone) + (p.isDown(gp.dpadRight) ? 1 : 0) - (p.isDown(gp.dpadLeft) ? 1 : 0);

    for (const [dir, keys, btn] of DIRS) {
      if (k?.wasPressed(keys) || p?.wasPressed(btn)) this.buffer.tap(dir, this.time);
    }

    const mgPressed = !!(k?.wasPressed(kb.mg) || p?.wasPressed(gp.mg));
    s.combo = mgPressed ? this.buffer.trigger(this.time) : null;
    s.throttle = up - down;
    s.steer = Math.max(-1, Math.min(1, steer));
    s.handbrake = !!k?.isDown(kb.handbrake);
    s.fireMG = !!(k?.isDown(kb.mg) || p?.isDown(gp.mg));
    s.fireWeapon = !!(k?.wasPressed(kb.weapon) || p?.wasPressed(gp.weapon));
    s.fireSpecial = !!(k?.wasPressed(kb.special) || p?.wasPressed(gp.special));
    s.cycleWeapon = k?.wasPressed(kb.next) || p?.wasPressed(gp.next) ? 1 : k?.wasPressed(kb.prev) || p?.wasPressed(gp.prev) ? -1 : 0;
    s.rearView = !!(k?.isDown(kb.rear) || p?.isDown(gp.rear));
    return s;
  }
}
