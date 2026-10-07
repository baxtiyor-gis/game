// Arenalar ro'yxati: menyu, arcade va backdrop shu yerdan oladi. Yangi arena: shu massivga bitta yozuv.
import oilFields from '../../data/levels/oil_fields.json';
import valleyFarms from '../../data/levels/valley_farms.json';
import type { ArenaDef } from './types';

export interface ArenaEntry {
  id: string;
  /** data/strings.json kaliti */
  nameKey: string;
  /** Tayyor bo'lmagan arenalarda yo'q */
  def: ArenaDef | null;
  /** Menyu ko'rinishi uchun: asosiy rang (#rrggbb) va qisqa belgi */
  preview: { color: string; icon: string };
  available: boolean;
}

const soon = (id: string, color: string, icon: string): ArenaEntry => ({
  id, nameKey: `arena.${id}`, def: null, preview: { color, icon }, available: false,
});

export const ARENAS: ArenaEntry[] = [
  { id: 'oil_fields', nameKey: 'arena.oil_fields', def: oilFields as unknown as ArenaDef, preview: { color: '#c9a67a', icon: 'oil' }, available: true },
  { id: 'valley_farms', nameKey: 'arena.valley_farms', def: valleyFarms as unknown as ArenaDef, preview: { color: '#7fae4f', icon: 'train' }, available: true },
  soon('aircraft_graveyard', '#9aa3ab', 'plane'),
  soon('secret_base', '#4a5560', 'bunker'),
  soon('hoover_dam', '#b8b2a3', 'dam'),
  soon('ski_resort', '#dfe9f2', 'snow'),
  soon('casino_city', '#c0398a', 'dice'),
  soon('canyonlands', '#c8764a', 'canyon'),
];

export const DEFAULT_ARENA = 'oil_fields';

export const isAvailable = (id: string): boolean => ARENAS.some((a) => a.id === id && a.available);

/** Mavjud (o'ynash mumkin) arena ta'rifi; noma'lum yoki "tez kunda" bo'lsa xato. */
export function arenaDef(id: string): ArenaDef {
  const def = ARENAS.find((a) => a.id === id)?.def;
  if (!def) throw new Error(`Noma'lum arena: ${id}`);
  return def;
}

/** id mavjud bo'lsa shu, aks holda standart arena (orqa fon uchun xavfsiz). */
export const resolveArenaId = (id: string): string => (isAvailable(id) ? id : DEFAULT_ARENA);
