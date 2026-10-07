/** Klaviatura holati: bosib turilgan tugmalar + shu kadrda bosilganlar (edge). */
export class Keyboard {
  private down = new Set<string>();
  private pressed = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  isDown(codes: readonly string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(codes: readonly string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  /** Har fixed tick oxirida chaqiriladi. */
  endTick(): void {
    this.pressed.clear();
  }
}
