/** Davomli maxsus harakat effektlari uchun oddiy 60 Hz taymerlar. */
interface Job {
  t: number;
  duration: number;
  step: (dt: number, t: number) => void;
  done?: () => void;
}

export class Timers {
  private jobs: Job[] = [];

  get size(): number {
    return this.jobs.length;
  }

  /** `duration` soniya davomida har tickda step(dt, o'tgan vaqt) ni chaqiradi; tugagach done(). */
  run(duration: number, step: (dt: number, t: number) => void, done?: () => void): void {
    this.jobs.push({ t: 0, duration, step, done });
  }

  tick(dt: number): void {
    for (const j of [...this.jobs]) {
      j.t += dt;
      j.step(dt, j.t);
      if (j.t < j.duration) continue;
      this.jobs.splice(this.jobs.indexOf(j), 1);
      j.done?.();
    }
  }

  clear(): void {
    this.jobs = [];
  }
}
