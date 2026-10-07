/** Gamepad API ustidan yupqa qatlam: tugma edge'larini kuzatadi. */
export class Gamepad {
  private prev: boolean[] = [];
  private cur: boolean[] = [];
  private axes: readonly number[] = [];

  constructor(private readonly index: number) {}

  poll(): boolean {
    const pad = navigator.getGamepads?.()[this.index];
    this.prev = this.cur;
    if (!pad) {
      this.cur = [];
      this.axes = [];
      return false;
    }
    this.cur = pad.buttons.map((b) => b.pressed);
    this.axes = pad.axes;
    return true;
  }

  isDown(btn: number): boolean {
    return !!this.cur[btn];
  }

  wasPressed(btn: number): boolean {
    return !!this.cur[btn] && !this.prev[btn];
  }

  value(btn: number): number {
    const pad = navigator.getGamepads?.()[this.index];
    return pad?.buttons[btn]?.value ?? 0;
  }

  axis(i: number, deadzone: number): number {
    const v = this.axes[i] ?? 0;
    return Math.abs(v) < deadzone ? 0 : v;
  }
}
