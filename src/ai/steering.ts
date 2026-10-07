// Haydash: nuqtaga borish (seek/arrive), aylanish, qochish, whisker to'siqdan qochish, tiqilib qolish. Sof mantiq.
// Koordinata: mashina oldi = forward(); haydovchining o'ngi = fwd x up = (-fz, 0, fx). steer > 0 — o'ngga.
import type * as THREE from 'three';
import type { SteeringCfg } from './config';

export interface Drive { throttle: number; steer: number; err: number }

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** Nishon `to` ga burchak xatosi (rad). Musbat — nishon mashinaning o'ng tomonida. */
export function headingError(fwd: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3): number {
  const dx = to.x - from.x, dz = to.z - from.z;
  return Math.atan2(-fwd.z * dx + fwd.x * dz, fwd.x * dx + fwd.z * dz);
}

/** Nuqtaga seek; `arrive` bo'lsa yaqinlashganda sekinlashadi. Natija `out` ga yoziladi. */
export function seek(
  fwd: THREE.Vector3, pos: THREE.Vector3, target: THREE.Vector3, cfg: SteeringCfg, arrive: boolean, out: Drive,
): Drive {
  const err = headingError(fwd, pos, target);
  out.err = err;
  out.steer = clamp(err * cfg.steerGain, -1, 1);
  out.throttle = Math.abs(err) > cfg.sharpAngle ? cfg.turnThrottle : 1;
  if (arrive) {
    const d = Math.hypot(target.x - pos.x, target.z - pos.z);
    if (d < cfg.arriveRadius) out.throttle *= Math.max(cfg.turnThrottle * 0.5, d / cfg.arriveRadius);
  }
  return out;
}

/** Raqib atrofida aylanish nuqtasi: o'zimizning burchak holatini `dir*circleAngle` ga buramiz, radius saqlanadi. */
export function circlePoint(
  pos: THREE.Vector3, enemy: THREE.Vector3, radius: number, dir: 1 | -1, cfg: SteeringCfg, out: THREE.Vector3,
): THREE.Vector3 {
  const dx = pos.x - enemy.x, dz = pos.z - enemy.z;
  const a = Math.atan2(dz, dx) + dir * cfg.circleAngle;
  return out.set(enemy.x + Math.cos(a) * radius, pos.y, enemy.z + Math.sin(a) * radius);
}

/** Tahdiddan qochish nuqtasi: teskari yo'nalish + zigzag (vaqt bo'yicha). */
export function fleePoint(pos: THREE.Vector3, threat: THREE.Vector3, time: number, cfg: SteeringCfg, out: THREE.Vector3): THREE.Vector3 {
  let dx = pos.x - threat.x, dz = pos.z - threat.z;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len; dz /= len;
  const zig = Math.sin((time / cfg.zigzagPeriod) * Math.PI * 2) * cfg.zigzagAmount;
  return out.set(pos.x + (dx - dz * zig) * cfg.fleeDistance, pos.y, pos.z + (dz + dx * zig) * cfg.fleeDistance);
}

/** Whisker yo'nalishi: oldingi yo'nalishni gorizontal tekislikda `angle` (musbat = o'ng) ga buradi. */
export function whiskerDir(fwd: THREE.Vector3, angle: number, out: THREE.Vector3): THREE.Vector3 {
  const len = Math.hypot(fwd.x, fwd.z) || 1;
  const fx = fwd.x / len, fz = fwd.z / len;
  const c = Math.cos(angle), s = Math.sin(angle);
  return out.set(fx * c + -fz * s, 0, fz * c + fx * s);
}

export const whiskerLength = (speed: number, cfg: SteeringCfg): number => cfg.whiskerBase + speed * cfg.whiskerPerSpeed;

export interface Avoid { steer: number; front: number; max: number }

/** dangers[i] (0..1, 1 = yopishib turibdi) -> to'siqdan burilish. Markaz yopiq bo'lsa — bo'sh tomonga. */
export function avoidSteer(dangers: readonly number[], cfg: SteeringCfg, out: Avoid): Avoid {
  const angles = cfg.whiskerAngles;
  let left = 0, right = 0, center = 0, front = 0, max = 0;
  for (let i = 0; i < angles.length; i++) {
    const d = dangers[i] ?? 0;
    if (d > max) max = d;
    if (Math.abs(angles[i]) < 0.6 && d > front) front = d;
    if (angles[i] < 0) left += d;
    else if (angles[i] > 0) right += d;
    else center += d;
  }
  let s = left - right; // chap xavfli (left katta) -> o'ngga (musbat)
  if (center > 0 && Math.abs(s) < center) s += (left <= right ? -1 : 1) * center;
  out.steer = clamp((s * cfg.avoidWeight) / Math.max(1, angles.length / 2), -1, 1);
  out.front = front;
  out.max = max;
  return out;
}

/** Xohlangan rul + to'siqdan qochish. Xavf qancha katta bo'lsa, xohish shuncha kamayadi. */
export function blendSteer(desired: number, avoid: Avoid): number {
  return clamp(desired * (1 - avoid.max * 0.7) + avoid.steer, -1, 1);
}

export const uprightY = (q: { x: number; y: number; z: number; w: number }): number => 1 - 2 * (q.x * q.x + q.z * q.z);

export type StuckMode = 'ok' | 'reverse' | 'flipped';

/** Tiqilib qolish (harakat kerak, lekin tezlik past) va ag'darilishni aniqlaydi. */
export class StuckDetector {
  private slowTime = 0;
  private reverseLeft = 0;
  mode: StuckMode = 'ok';

  reset(): void {
    this.slowTime = 0;
    this.reverseLeft = 0;
    this.mode = 'ok';
  }

  update(dt: number, speed: number, wantsMove: boolean, upY: number, cfg: SteeringCfg): StuckMode {
    if (upY < cfg.flipUpY) {
      this.slowTime = 0;
      return (this.mode = 'flipped');
    }
    if (this.reverseLeft > 0) {
      this.reverseLeft -= dt;
      return (this.mode = this.reverseLeft > 0 ? 'reverse' : 'ok');
    }
    this.slowTime = wantsMove && speed < cfg.stuckSpeed ? this.slowTime + dt : 0;
    if (this.slowTime >= cfg.stuckTime) {
      this.slowTime = 0;
      this.reverseLeft = cfg.reverseTime;
      return (this.mode = 'reverse');
    }
    return (this.mode = 'ok');
  }
}
