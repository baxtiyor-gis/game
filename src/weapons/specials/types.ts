import type { FireContext } from '../weapon';
import type { Timers } from './timers';

/** Maxsus harakat konteksti: oddiy FireContext + davomli effektlar uchun taymerlar. */
export interface SpecialContext extends FireContext {
  timers: Timers;
}

/** Combo id (combos.json) bo'yicha bajariladigan maxsus harakat. */
export interface SpecialMove {
  readonly id: string;
  fire(ctx: SpecialContext): void;
}
