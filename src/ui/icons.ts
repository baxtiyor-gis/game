// HUD qurol ikonkalari: inline SVG (currentColor), 70-yillar arkada uslubi. Yo'llar data/weaponVisuals.json da.
import json from '../../data/weaponVisuals.json';

export type IconId = 'missile' | 'rocket' | 'mortar' | 'cannon' | 'mine' | 'mg' | 'special' | 'health';

const paths = json.icons;
const cache = new Map<IconId, string>();

/** Ikonka SVG matni (keshlangan). Faqat statik, ishonchli data dan quriladi. */
export function weaponIcon(id: IconId): string {
  let s = cache.get(id);
  if (!s) {
    const v = paths.viewBox;
    s = `<svg viewBox="0 0 ${v} ${v}" width="1em" height="1em" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false"><path d="${paths[id]}"/></svg>`;
    cache.set(id, s);
  }
  return s;
}

export const ICON_IDS = Object.keys(paths).filter((k) => k !== 'viewBox') as IconId[];
