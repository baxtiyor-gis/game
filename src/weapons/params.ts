// Qurol sozlamalari: data/weaponTuning.json (balans) + data/weapons.json (qurol parametrlari).
import tuningJson from '../../data/weaponTuning.json';
import { weapons } from '../core/data';
import type { WeaponDef, WeaponId } from '../core/types';

export const tuning = tuningJson;
export const weaponDef = (id: WeaponId): WeaponDef => weapons[id];
