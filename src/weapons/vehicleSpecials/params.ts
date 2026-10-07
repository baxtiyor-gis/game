// Mashina maxsus qurollari parametrlari: data/vehicleSpecials.json
import json from '../../../data/vehicleSpecials.json';

export const vsp = json;

/** Botlar uchun ishlatish ko'rsatmasi: qaysi vaziyatda maxsus qurol otiladi. */
export interface SpecialAiHint {
  mode: 'front' | 'around' | 'rear';
  min: number;
  max: number;
  cone: number;
}

interface Common { cooldown: number; ai: SpecialAiHint }

/** Maxsus qurol id si bo'yicha umumiy sozlamalar (cooldown, AI ko'rsatmasi). */
export function specialCfg(id: string): Common | undefined {
  const c = (vsp as unknown as Record<string, Common | undefined>)[id];
  return c && typeof c.cooldown === 'number' ? c : undefined;
}
