export const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25; // spiral-of-death himoyasi

/** Qat'iy qadamli fizika + interpolatsiyali render uchun akkumulyator. */
export class FixedLoop {
  private acc = 0;

  constructor(
    private readonly fixed: (dt: number) => void,
    private readonly render: (dt: number, alpha: number) => void,
  ) {}

  /** frameDt — haqiqiy o'tgan vaqt (s). Bajarilgan fixed qadamlar sonini qaytaradi. */
  advance(frameDt: number): number {
    const dt = Math.min(Math.max(frameDt, 0), MAX_FRAME);
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_DT) {
      this.fixed(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    this.render(dt, this.acc / FIXED_DT);
    return steps;
  }
}
