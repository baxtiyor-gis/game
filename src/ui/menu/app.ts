// Menyu ilovasi: #ui ichidagi overlay, ekranlar, navigatsiya. O'yin oqimi (World) bilan Hooks orqali bog'lanadi.
import { t, vehicles } from '../../core/data';
import { h } from '../dom';
import { type Action, type ScreenId, type Settings } from './config';
import { controlsScreen } from './controls';
import { homeScreen } from './home';
import { MenuNav } from './logic';
import { pauseScreen, resultScreen } from './pause';
import { selectScreen } from './select';
import { settingsScreen } from './settings';
import { setupScreen } from './setup';
import { saveSettings } from './store';
import { MENU_CSS } from './style';
import { SELECT_CSS } from './styleSelect';
import type { Host, MatchResult, Screen } from './screen';

export interface MenuHooks {
  /** Ekran almashdi (oqim sahnani shunga moslaydi) */
  onScreen(id: ScreenId): void;
  start(): void;
  resume(): void;
  restart(): void;
  /** Sozlamalar o'zgardi (ovoz darhol; retro keyingi sahnada) */
  onSettings(prev: Settings, cur: Settings): void;
}

export class MenuApp implements Host {
  readonly nav = new MenuNav();
  private readonly root: HTMLElement;
  private readonly style: HTMLStyleElement;
  private readonly screens = new Map<ScreenId, Screen>();
  private readonly result: ReturnType<typeof resultScreen>;
  private shown: Screen | null = null;
  private snapshot: Settings;

  constructor(ui: HTMLElement, readonly settings: Settings, private readonly hooks: MenuHooks) {
    this.snapshot = { ...settings };
    this.style = document.createElement('style');
    this.style.textContent = MENU_CSS + SELECT_CSS;
    document.head.appendChild(this.style);
    this.root = h('div', 'm-root', ui);
    for (const c of ['m-bg m-sunset', 'm-bg m-ground', 'm-bg m-sun', 'm-bg m-scrim']) h('div', c, this.root);
    h('div', 'm-loading', this.root, t('menu.loading'));
    this.result = resultScreen(this);
    const list: Screen[] = [
      homeScreen(this), selectScreen(this, vehicles), setupScreen(this), settingsScreen(this),
      controlsScreen(this), pauseScreen(this), this.result,
    ];
    for (const s of list) {
      this.screens.set(s.id, s);
      this.root.appendChild(s.el);
    }
  }

  get isOpen(): boolean {
    return this.shown !== null;
  }

  get screen(): ScreenId | null {
    return this.shown?.id ?? null;
  }

  /** Ekranni ko'rsatadi; null: menyuni yopadi (o'yin). */
  show(id: ScreenId | null): void {
    this.shown?.el.classList.remove('show');
    this.shown = id ? (this.screens.get(id) ?? null) : null;
    this.root.classList.toggle('open', this.shown !== null);
    if (!this.shown || !id) return;
    this.root.dataset.screen = id;
    this.nav.go(id);
    this.shown.el.classList.add('show');
    this.shown.enter();
    this.hooks.onScreen(id);
  }

  /** Sahna qurilayotganda: ekranlar yopiladi, "Yuklanmoqda" ko'rinadi. */
  setLoading(on: boolean): void {
    if (on) this.show(null);
    this.root.classList.toggle('loading', on);
    if (on) this.root.classList.add('open');
    else if (!this.shown) this.root.classList.remove('open');
  }

  showResult(r: MatchResult): void {
    this.result.show(r);
    this.show('result');
  }

  /** true: menyu harakatni qabul qildi. */
  action(a: Action): boolean {
    const s = this.shown;
    if (!s) return false;
    if (a === 'back') this.back();
    else s.action(a);
    return true;
  }

  tick(dt: number): void {
    this.shown?.tick?.(dt);
  }

  // ---- Host ----
  save(): void {
    saveSettings(this.settings);
    this.hooks.onSettings(this.snapshot, this.settings);
    this.snapshot = { ...this.settings };
  }

  go(s: ScreenId): void {
    this.show(s);
  }

  back(): void {
    const s = this.shown?.id;
    if (!s) return;
    if (s === 'pause') return this.hooks.resume();
    const to = this.nav.back();
    if (to) this.show(to);
  }

  startArcade(): void {
    this.hooks.start();
  }

  resume(): void {
    this.hooks.resume();
  }

  restart(): void {
    this.hooks.restart();
  }

  toHome(): void {
    this.show('home');
  }

  dispose(): void {
    for (const s of this.screens.values()) s.dispose?.();
    this.root.remove();
    this.style.remove();
  }
}

