// Arena identifikatori -> arena ta'rifi (data/levels/*.json). Yangi arena qo'shish: shu yerga bitta qator.
import oilFields from '../../data/levels/oil_fields.json';
import type { ArenaDef } from '../levels/types';

export const ARENA_DEFS: Record<string, ArenaDef> = {
  oil_fields: oilFields as unknown as ArenaDef,
};

export function arenaDef(id: string): ArenaDef {
  const def = ARENA_DEFS[id];
  if (!def) throw new Error(`Noma'lum arena: ${id}`);
  return def;
}
