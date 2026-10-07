// Ekranlar uchun umumiy interfeyslar.
import type { Action, ScreenId, Settings } from './config';
import { h } from '../dom';
import { t } from '../../core/data';

export interface MatchResult {
  won: boolean;
  score: number;
  kills: number;
  time: number;
  whammies: number;
}

/** Ekranlar ko'rinadigan menyu ilovasi (MenuApp) imkoniyatlari. */
export interface Host {
  readonly settings: Settings;
  save(): void;
  go(s: ScreenId): void;
  back(): void;
  startArcade(): void;
  resume(): void;
  restart(): void;
  toHome(): void;
}

export interface Screen {
  readonly id: ScreenId;
  readonly el: HTMLElement;
  enter(): void;
  action(a: Action): void;
  tick?(dt: number): void;
  dispose?(): void;
}

/** Chap yuqoridagi "← Orqaga" tugmasi (sichqoncha/sensor uchun). */
export function backButton(parent: HTMLElement, host: Host): HTMLElement {
  const b = h('div', 'm-row m-topback', parent, '');
  h('span', 'm-label', b, `← ${t('menu.back')}`);
  b.onclick = () => host.back();
  return b;
}
