// Sof mantiq (THREE/DOM siz): oldindan ajratilgan, swap-remove zarralar pooli.

export interface StyleJson {
  life: number;
  size0: number;
  size1: number;
  c0: string;
  c1: string;
  alpha: number;
  gravity: number; // m/s^2 pastga (manfiy = yuqoriga)
  drag: number; // 1/s
}

export interface ParticleStyle {
  life: number;
  size0: number;
  size1: number;
  c0: [number, number, number];
  c1: [number, number, number];
  alpha: number;
  gravity: number;
  drag: number;
}

const GAMMA = 2.2;

/** "#rrggbb" (sRGB) -> chiziqli [r,g,b] 0..1 (PS1 pass keyin sRGB ga qaytaradi). */
export function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (v: number) => Math.pow(v / 255, GAMMA);
  return [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
}

export function makeStyle(j: StyleJson): ParticleStyle {
  return { ...j, c0: hexToLinear(j.c0), c1: hexToLinear(j.c1) };
}

// Maydonlar ofsetlari (bitta zarra = STRIDE ta float)
const X = 0, Y = 1, Z = 2, VX = 3, VY = 4, VZ = 5, AGE = 6, LIFE = 7, S0 = 8, S1 = 9;
const R0 = 10, R1 = 13, A0 = 16, GRAV = 17, DRAG = 18;
const STRIDE = 19;

export class ParticlePool {
  readonly capacity: number;
  count = 0;
  private readonly d: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.d = new Float32Array(capacity * STRIDE);
  }

  /** Zarra ochadi. Pool to'lgan bo'lsa false (yangi zarra tashlab yuboriladi). */
  spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    s: ParticleStyle, sizeScale = 1, lifeScale = 1,
  ): boolean {
    if (this.count >= this.capacity) return false;
    const d = this.d;
    const o = this.count++ * STRIDE;
    d[o + X] = x; d[o + Y] = y; d[o + Z] = z;
    d[o + VX] = vx; d[o + VY] = vy; d[o + VZ] = vz;
    d[o + AGE] = 0;
    d[o + LIFE] = s.life * lifeScale;
    d[o + S0] = s.size0 * sizeScale;
    d[o + S1] = s.size1 * sizeScale;
    d[o + R0] = s.c0[0]; d[o + R0 + 1] = s.c0[1]; d[o + R0 + 2] = s.c0[2];
    d[o + R1] = s.c1[0]; d[o + R1 + 1] = s.c1[1]; d[o + R1 + 2] = s.c1[2];
    d[o + A0] = s.alpha;
    d[o + GRAV] = s.gravity;
    d[o + DRAG] = s.drag;
    return true;
  }

  private release(i: number): void {
    const last = --this.count;
    if (i !== last) this.d.copyWithin(i * STRIDE, last * STRIDE, (last + 1) * STRIDE);
  }

  update(dt: number): void {
    const d = this.d;
    for (let i = this.count - 1; i >= 0; i--) {
      const o = i * STRIDE;
      d[o + AGE] += dt;
      if (d[o + AGE] >= d[o + LIFE]) {
        this.release(i);
        continue;
      }
      const k = Math.max(0, 1 - d[o + DRAG] * dt);
      d[o + VX] *= k;
      d[o + VZ] *= k;
      d[o + VY] = d[o + VY] * k - d[o + GRAV] * dt;
      d[o + X] += d[o + VX] * dt;
      d[o + Y] += d[o + VY] * dt;
      d[o + Z] += d[o + VZ] * dt;
    }
  }

  clear(): void {
    this.count = 0;
  }

  /** GPU buferlarini to'ldiradi (compact, 0..count). */
  fill(pos: Float32Array, size: Float32Array, col: Float32Array): void {
    const d = this.d;
    for (let i = 0; i < this.count; i++) {
      const o = i * STRIDE;
      const t = d[o + AGE] / d[o + LIFE];
      pos[i * 3] = d[o + X]; pos[i * 3 + 1] = d[o + Y]; pos[i * 3 + 2] = d[o + Z];
      size[i] = d[o + S0] + (d[o + S1] - d[o + S0]) * t;
      for (let c = 0; c < 3; c++) col[i * 4 + c] = d[o + R0 + c] + (d[o + R1 + c] - d[o + R0 + c]) * t;
      col[i * 4 + 3] = d[o + A0] * (1 - t);
    }
  }
}
