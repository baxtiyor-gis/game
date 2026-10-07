// Kichik DOM yordamchilari: faqat o'zgargan qiymatni yozadi (layout ni tejaydi).

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent?: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

/** Matn katagi: qiymat o'zgarmasa DOM ga tegmaydi. */
export class Txt {
  private last: string | null = null;
  constructor(readonly el: HTMLElement) {}
  set(s: string): void {
    if (s === this.last) return;
    this.last = s;
    this.el.textContent = s;
  }
}

/** CSS class bayrog'i: o'zgarsagina toggle. */
export class Flag {
  private last: boolean | null = null;
  constructor(
    readonly el: HTMLElement,
    private readonly cls: string,
  ) {}
  set(on: boolean): void {
    if (on === this.last) return;
    this.last = on;
    this.el.classList.toggle(this.cls, on);
  }
}

/** CSS o'zgaruvchi/style qiymati: o'zgarsagina yoziladi. */
export class Prop {
  private last: string | null = null;
  constructor(
    readonly el: HTMLElement,
    private readonly name: string,
  ) {}
  set(v: string): void {
    if (v === this.last) return;
    this.last = v;
    this.el.style.setProperty(this.name, v);
  }
}

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
