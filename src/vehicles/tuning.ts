import { handling } from '../core/data';
import type { VehicleDef } from '../core/types';

/** Statlardan (1..5) hisoblangan fizik parametrlar. Barcha raqamlar data/handling.json dan. */
export interface Tuning {
  wheelPower: number; // W: g'ildirakdagi quvvat (dvigatel quvvati * FIK)
  launchForce: number; // N: past tezlikdagi maks. tortish kuchi (= quvvat / launchSpeed)
  dragArea: number; // m^2: Cd*A (topSpeed statdan kalibrlangan aerodinamik qarshilik)
  maxHp: number;
  damageFactor: number; // zirh koeffitsienti (kichik = bardoshli)
  steerMax: number; // rad
  steerRate: number; // 1/s
}

const pick = (table: number[], stat: number): number => table[Math.min(table.length, Math.max(1, Math.round(stat))) - 1];

/**
 * Maks. tezlik sun'iy chegara emas: muvozanat P = (0.5*rho*CdA*v^2 + Crr*m*g) * v.
 * Stat jadvalidagi topSpeed shu muvozanat nuqtasi bo'lishi uchun Cd*A shunga ko'ra tanlanadi.
 */
export function tuningFor(def: VehicleDef): Tuning {
  const b = handling.byStat;
  const p = handling.powertrain;
  const s = def.stats;
  const wheelPower = pick(b.power, s.accel) * 1000 * p.efficiency;
  const vTop = pick(b.topSpeed, s.topSpeed);
  const rolling = p.rollingResistance * def.mass * handling.world.gravity;
  const dragArea = Math.max(p.minDragArea, (wheelPower / vTop - rolling) / (0.5 * p.airDensity * vTop * vTop));
  return {
    wheelPower,
    launchForce: wheelPower / p.launchSpeed,
    dragArea,
    maxHp: pick(b.maxHp, s.armor),
    damageFactor: pick(b.damageFactor, s.armor),
    steerMax: pick(b.steerMax, s.avoidance),
    steerRate: pick(b.steerRate, s.avoidance),
  };
}
