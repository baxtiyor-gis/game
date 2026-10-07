import { handling } from '../core/data';
import type { VehicleDef } from '../core/types';

/** Statlardan (1..5) hisoblangan fizik parametrlar. Barcha raqamlar data/handling.json dan. */
export interface Tuning {
  engineAccel: number; // m/s^2 (massaga bog'liq emas)
  maxSpeed: number; // m/s
  maxHp: number;
  damageFactor: number; // zirh koeffitsienti (kichik = bardoshli)
  steerMax: number; // rad
  steerRate: number; // 1/s
}

const pick = (table: number[], stat: number): number => table[Math.min(table.length, Math.max(1, Math.round(stat))) - 1];

export function tuningFor(def: VehicleDef): Tuning {
  const b = handling.byStat;
  const s = def.stats;
  return {
    engineAccel: pick(b.engineAccel, s.accel),
    maxSpeed: pick(b.maxSpeed, s.topSpeed),
    maxHp: pick(b.maxHp, s.armor),
    damageFactor: pick(b.damageFactor, s.armor),
    steerMax: pick(b.steerMax, s.avoidance),
    steerRate: pick(b.steerRate, s.avoidance),
  };
}
