import { handling } from '../core/data';
import type { VehicleDef } from '../core/types';

export interface WheelSpec {
  x: number;
  y: number; // g'ildirak osilgan nuqta (chassis lokal)
  z: number;
  radius: number;
  width: number;
  restLength: number;
  maxTravel: number;
  front: boolean;
}

/** 4 g'ildirak joylashuvi: [oldChap, oldO'ng, orqaChap, orqaO'ng]. Lokal +Z = old, +X = chap. */
export function wheelLayout(def: VehicleDef): WheelSpec[] {
  const w = handling.wheels;
  const [sx, sy, sz] = def.size;
  const radius = Math.min(w.radiusMax, Math.max(w.radiusMin, sy * w.radiusFactor));
  const width = radius * w.widthFactor;
  const x = sx / 2 - width / 2;
  const z = (sz / 2) * w.axleFactor;
  const y = -sy / 2 + radius * w.connectionLift;
  const base = { y, radius, width, restLength: radius * w.restLengthFactor, maxTravel: radius * w.maxTravelFactor };
  return [
    { ...base, x, z, front: true },
    { ...base, x: -x, z, front: true },
    { ...base, x, z: -z, front: false },
    { ...base, x: -x, z: -z, front: false },
  ];
}
