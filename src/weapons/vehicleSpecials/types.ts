import type { Timers } from '../specials/timers';
import type { FireContext, Weapon } from '../weapon';
import type { SpecialFx } from './fx';

/** Maxsus qurol konteksti: oddiy FireContext + davomli effektlar (taymerlar) + vizual (fx). */
export interface SpecialContext extends FireContext {
  timers: Timers;
  fx: SpecialFx;
}

/** Mashinaning o'z maxsus quroli: Weapon kontrakti + ixtiyoriy "otish mumkinmi" tekshiruvi. */
export interface VehicleSpecial extends Weapon {
  /** false = otilmaydi, ammo sarflanmaydi (masalan nishon yo'q). Berilmasa doim mumkin. */
  ready?(ctx: SpecialContext): boolean;
  fire(ctx: SpecialContext): void;
}
