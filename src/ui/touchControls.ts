// Sensorli boshqaruv qatlami (DOM/CSS): suzuvchi joystik, o'ng tugmalar, kombo paneli, pauza. Mantiq src/input/touch.ts da.
import { t } from '../core/data';
import type { WeaponId } from '../core/types';
import { TOUCH_CFG, TouchInput, combosFor, touchVisible, type TouchMode, type TouchTarget } from '../input/touch';
import { h } from './dom';
import { weaponIcon, type IconId } from './icons';
import { MENU } from './menu/config';
import { TOUCH_ICONS } from './touchIcons';
import { TOUCH_CSS } from './touchStyle';

export interface TouchHooks {
  onPause(): void;
  /** Tanlangan qurol (kombo paneli va qurol tugmasi ikonkasi uchun) */
  weapon(): WeaponId | undefined;
}

const FALLBACK_ICON: IconId = 'missile';
const rootClass = (): DOMTokenList => document.documentElement.classList;

export class TouchControls {
  readonly input = new TouchInput();
  private readonly style = document.createElement('style');
  private readonly root: HTMLElement;
  private readonly base: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly weaponIco: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly comboBtn: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly down = new Map<number, HTMLElement>();
  private readonly coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  private touched = false;
  private kbUsed = false;
  private shown = false;
  private visible = false;
  private weapon: WeaponId | undefined | null = null;
  private hintUntil = 0;
  private open = false;

  constructor(ui: HTMLElement, private mode: TouchMode, private readonly hooks: TouchHooks) {
    this.style.textContent = TOUCH_CSS;
    document.head.appendChild(this.style);
    const root = (this.root = h('div', 'tc-root', ui));
    root.style.setProperty('--r', `${TOUCH_CFG.stickRadius}px`);
    root.style.setProperty('--op', String(TOUCH_CFG.opacity));
    const zone = h('div', 'tc-zone', root);
    this.base = h('div', 'tc-base', root);
    this.thumb = h('div', 'tc-thumb', root);
    this.bindStick(zone);

    const pad = h('div', 'tc-pad', root);
    this.bindButton(this.btn(pad, 'tc-mg', weaponIcon('mg'), t('touch.mg')), 'mg');
    const wb = this.btn(pad, 'tc-weapon', weaponIcon(FALLBACK_ICON), t('touch.weapon'));
    this.weaponIco = wb.querySelector('.ico')!;
    this.bindButton(wb, 'weapon');
    this.bindButton(this.btn(pad, 'tc-special', weaponIcon('special'), t('touch.special')), 'special');
    this.bindButton(this.btn(pad, 'tc-drift', TOUCH_ICONS.drift, t('touch.drift')), 'drift');
    this.bindButton(this.btn(pad, 'tc-cycle', TOUCH_ICONS.cycle, t('touch.cycle')), 'cycle');
    this.comboBtn = this.btn(pad, 'tc-combo-btn', TOUCH_ICONS.combo, t('touch.combo'));
    this.press(this.comboBtn, () => this.togglePanel());
    this.panel = h('div', 'tc-panel', root);
    const pause = this.btn(root, 'tc-pause', TOUCH_ICONS.pause, '');
    pause.setAttribute('aria-label', t('touch.pause'));
    this.press(pause, () => this.hooks.onPause());
    this.hint = h('div', 'tc-hint', root, t('touch.rotate'));

    root.addEventListener('contextmenu', (e) => e.preventDefault());
    root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => this.visible && e.preventDefault());
    window.addEventListener('keydown', () => (this.kbUsed = true));
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.touched = true;
      this.kbUsed = false;
    }, true);
  }

  setMode(m: TouchMode): void {
    this.mode = m;
  }

  /** Har kadr: ko'rinish (rejim/qurilma/klaviatura), faqat o'yin davomida ko'rsatiladi. */
  update(playing: boolean): void {
    this.visible = touchVisible(this.mode, this.coarse, this.touched, this.kbUsed);
    rootClass().toggle('tc-on', this.visible);
    const show = this.visible && playing;
    if (show !== this.shown) {
      this.shown = show;
      this.root.classList.toggle('show', show);
      if (!show) this.release();
    }
    if (!show) return;
    const w = this.hooks.weapon();
    if (w !== this.weapon) this.setWeapon(w);
    const portrait = window.innerHeight > window.innerWidth;
    const now = performance.now();
    if (!portrait) this.hintUntil = 0;
    else if (this.hintUntil === 0) this.hintUntil = now + TOUCH_CFG.rotateHintSeconds * 1000;
    this.hint.classList.toggle('show', portrait && now < this.hintUntil);
  }

  private release(): void {
    this.input.reset();
    this.down.forEach((el) => el.classList.remove('down'));
    this.down.clear();
    this.root.classList.remove('stick');
    this.open = false;
    this.panel.classList.remove('open');
    this.comboBtn.classList.remove('on');
  }

  private setWeapon(w: WeaponId | undefined): void {
    this.weapon = w;
    this.weaponIco.innerHTML = weaponIcon(w ?? FALLBACK_ICON);
    this.panel.textContent = '';
    for (const c of combosFor(w)) {
      const b = h('div', 'tc-btn tc-act', this.panel);
      b.setAttribute('role', 'button');
      b.dataset.combo = c.id;
      h('b', '', b, c.input.map((d) => MENU.arrows[d]).join(''));
      h('small', '', b, t(`combo.${c.id}`));
      this.press(b, () => this.input.sendCombo(c.id), true);
    }
  }

  private togglePanel(): void {
    this.open = !this.open;
    this.panel.classList.toggle('open', this.open);
    this.comboBtn.classList.toggle('on', this.open);
  }

  private btn(parent: HTMLElement, cls: string, icon: string, label: string): HTMLElement {
    const b = h('div', `tc-btn ${cls}`, parent);
    b.setAttribute('role', 'button');
    if (label) b.setAttribute('aria-label', label);
    h('i', 'ico', b).innerHTML = icon;
    if (label) h('small', '', b, label);
    return b;
  }

  /** Bir martalik bosish (toggle/pauza/kombo): pointerdown da ishlaydi, bosib turilganda "down" ko'rinishi. */
  private press(el: HTMLElement, fn: () => void, hold = false): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fn();
      if (!hold) return;
      el.classList.add('down');
      el.setPointerCapture(e.pointerId);
      this.down.set(e.pointerId, el);
    });
    const end = (e: PointerEvent): void => {
      this.down.get(e.pointerId)?.classList.remove('down');
      this.down.delete(e.pointerId);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private bindButton(el: HTMLElement, target: TouchTarget): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!this.input.down(e.pointerId, target, e.clientX, e.clientY, e.timeStamp / 1000)) return;
      el.classList.add('down');
      el.setPointerCapture(e.pointerId);
      this.down.set(e.pointerId, el);
    });
    const end = (e: PointerEvent): void => {
      this.input.up(e.pointerId);
      this.down.delete(e.pointerId);
      if (![...this.down.values()].includes(el)) el.classList.remove('down');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private bindStick(zone: HTMLElement): void {
    const place = (el: HTMLElement, x: number, y: number): void => void (el.style.transform = `translate(${x}px,${y}px)`);
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.clientX > window.innerWidth * TOUCH_CFG.zoneFraction) return;
      if (!this.input.down(e.pointerId, 'stick', e.clientX, e.clientY, e.timeStamp / 1000)) return;
      zone.setPointerCapture(e.pointerId);
      place(this.base, e.clientX, e.clientY);
      place(this.thumb, e.clientX, e.clientY);
      this.root.classList.add('stick');
    });
    zone.addEventListener('pointermove', (e) => {
      e.preventDefault();
      this.input.move(e.pointerId, e.clientX, e.clientY, e.timeStamp / 1000);
      if (!this.input.stickActive) return;
      const { origin, raw } = this.input.stick;
      place(this.thumb, origin.x + raw.x * TOUCH_CFG.stickRadius, origin.y - raw.y * TOUCH_CFG.stickRadius);
    });
    const end = (e: PointerEvent): void => {
      this.input.up(e.pointerId);
      if (!this.input.stickActive) this.root.classList.remove('stick');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  dispose(): void {
    this.root.remove();
    this.style.remove();
    rootClass().remove('tc-on');
  }
}
