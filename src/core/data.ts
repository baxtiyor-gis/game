// Barcha kontent shu yerdan import qilinadi (Vite JSON ni bundle qiladi).
import vehiclesJson from '../../data/vehicles.json';
import weaponsJson from '../../data/weapons.json';
import combosJson from '../../data/combos.json';
import stringsJson from '../../data/strings.json';
import controlsJson from '../../data/controls.json';
import type { ComboDef, VehicleDef, WeaponDef, WeaponId } from './types';

export const vehicles = vehiclesJson as unknown as VehicleDef[];
export const weapons = weaponsJson as unknown as Record<WeaponId, WeaponDef>;
export const combos = combosJson as unknown as ComboDef[];
export const controls = controlsJson;

const strings = stringsJson as Record<string, string>;
export const t = (key: string): string => strings[key] ?? key;

export function vehicleDef(id: string): VehicleDef {
  const def = vehicles.find((v) => v.id === id);
  if (!def) throw new Error(`Noma'lum mashina: ${id}`);
  return def;
}
