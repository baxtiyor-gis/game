import { combos } from '../../core/data';
import type { VehicleHandle } from '../../core/types';
import type { FireContext } from '../weapon';
import { SPECIALS } from './index';
import { Timers } from './timers';

/** Kombo bajaruvchi: inventar/ammo tekshiruvi, ammo yechish, harakatni ishga tushirish, davomli taymerlar. */
export class Specials {
  readonly timers = new Timers();

  tick(dt: number): void {
    this.timers.tick(dt);
  }

  /** Bajarilgan kombo id si, aks holda null (qurol yo'q / ammo yetarli emas / noma'lum kombo). */
  perform(v: VehicleHandle, comboId: string, makeContext: () => FireContext): string | null {
    const def = combos.find((c) => c.id === comboId);
    const move = SPECIALS.get(comboId);
    if (!def || !move) return null;
    const inv = v.inventory;
    const idx = inv.slots.findIndex((s) => s.weapon === def.weapon);
    if (idx < 0 || inv.slots[idx].ammo < def.ammoCost) return null;
    inv.slots[idx].ammo -= def.ammoCost;
    if (inv.slots[idx].ammo <= 0) {
      inv.slots.splice(idx, 1);
      if (idx < inv.selected) inv.selected--;
      inv.selected = Math.max(0, Math.min(inv.selected, inv.slots.length - 1));
    }
    move.fire({ ...makeContext(), timers: this.timers });
    return comboId;
  }
}
