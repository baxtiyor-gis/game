// Vertikal qatorlar ro'yxati (home, setup, settings, pause, result uchun umumiy): fokus, sichqoncha, ←→ o'zgartirish.
import { h } from '../dom';
import { stepIndex } from './logic';

export interface Row {
  label: () => string;
  /** Qiymat matni (←→ bilan o'zgartiriladigan qatorlar uchun) */
  value?: () => string;
  /** Qo'shimcha belgi (masalan "Tez kunda") */
  tag?: () => string;
  enabled?: () => boolean;
  ok?: () => void;
  adjust?: (d: -1 | 1) => void;
}

export class Rows {
  readonly el: HTMLElement;
  private els: HTMLElement[] = [];
  private focus = 0;

  constructor(parent: HTMLElement, private readonly rows: Row[], cls = '') {
    this.el = h('div', `m-rows ${cls}`, parent);
    this.build();
  }

  private build(): void {
    this.rows.forEach((r, i) => {
      const e = h('div', 'm-row', this.el);
      e.setAttribute('role', 'button');
      h('span', 'm-label', e);
      if (r.adjust) {
        const v = h('span', 'm-val', e);
        const dec = h('span', 'm-arrow', v, '◀');
        h('span', 'm-vtext', v);
        const inc = h('span', 'm-arrow', v, '▶');
        dec.onclick = (ev) => (ev.stopPropagation(), this.setFocus(i), this.adjust(-1));
        inc.onclick = (ev) => (ev.stopPropagation(), this.setFocus(i), this.adjust(1));
      }
      h('span', 'm-tag', e);
      e.onpointerenter = () => this.enabled(i) && this.setFocus(i);
      e.onclick = () => (this.setFocus(i), this.ok());
      this.els.push(e);
    });
    this.refresh();
  }

  private enabled(i: number): boolean {
    return this.rows[i]?.enabled?.() ?? true;
  }

  get index(): number {
    return this.focus;
  }

  setFocus(i: number): void {
    this.focus = i;
    this.refresh();
  }

  move(d: number): void {
    this.focus = stepIndex(this.focus, d, this.rows.map((_, i) => this.enabled(i)));
    this.refresh();
  }

  ok(): void {
    const r = this.rows[this.focus];
    if (r && this.enabled(this.focus)) (r.ok ?? (() => r.adjust?.(1)))();
    this.refresh();
  }

  adjust(d: -1 | 1): void {
    const r = this.rows[this.focus];
    if (r?.adjust && this.enabled(this.focus)) r.adjust(d);
    this.refresh();
  }

  /** Matnlar va holatni qayta yozadi (faqat o'zgargan bo'lsa DOM ga tegadi). */
  refresh(): void {
    this.rows.forEach((r, i) => {
      const e = this.els[i]!;
      const on = this.enabled(i);
      e.classList.toggle('sel', i === this.focus && on);
      e.classList.toggle('off', !on);
      const set = (sel: string, s: string): void => {
        const n = e.querySelector(sel);
        if (n && n.textContent !== s) n.textContent = s;
      };
      set('.m-label', r.label());
      if (r.value) set('.m-vtext', r.value());
      set('.m-tag', r.tag?.() ?? '');
    });
  }
}
