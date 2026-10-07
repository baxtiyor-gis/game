// Yuklanish ekrani: arena nomi, haydovchi/mashina, progress bar, tasodifiy maslahat. 70-yillar funk arkada uslubi
// (menyu palitrasi). Klaviatura (Enter/Space/strelkalar) va sensor (teginish) maslahatni almashtiradi.
import { t } from '../core/data';
import { h } from './dom';
import { MENU } from './menu/config';

const cfg = MENU.loading;

const CSS = `
.ld-root{position:absolute;inset:0;z-index:12;display:none;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1.6vh,14px);
  padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
  overflow:hidden;font-family:Impact,'Arial Black',sans-serif;color:#ffd23f;text-transform:uppercase;letter-spacing:.04em;text-shadow:2px 2px 0 #000;
  user-select:none;-webkit-user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;pointer-events:auto;
  background:linear-gradient(180deg,#14041f 0%,#4a0f48 34%,#b8281f 62%,#ff8a1f 82%,#2a0a00 82%,#0d0300 100%);transition:opacity var(--ld-fade) ease-out}
.ld-root *{box-sizing:border-box}
.ld-root.show{display:flex}
.ld-root.out{opacity:0}
.ld-sun{position:absolute;left:50%;bottom:18%;width:min(64vw,70vh,480px);aspect-ratio:1;border-radius:50%;transform:translateX(-50%);opacity:.5;pointer-events:none;
  background:linear-gradient(180deg,#ffd23f,#ff8a1f 55%,#e5252a);
  -webkit-mask-image:linear-gradient(#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 70%,#000 70% 78%,transparent 78% 85%,#000 85%);
  mask-image:linear-gradient(#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 70%,#000 70% 78%,transparent 78% 85%,#000 85%)}
.ld-grid{position:absolute;left:0;right:0;bottom:0;height:18%;pointer-events:none;
  background:repeating-linear-gradient(90deg,rgba(255,210,63,.18) 0 2px,transparent 2px 48px)}
.ld-root>:not(.ld-sun):not(.ld-grid){position:relative}
.ld-kicker{font-size:clamp(11px,2.4vw,18px);color:#fff;letter-spacing:.3em}
.ld-arena{margin:0;font-weight:400;font-size:clamp(34px,min(11vw,13vh),104px);line-height:.95;text-align:center;transform:skewX(-8deg);
  background:linear-gradient(180deg,#fff2a0 0%,#ffd23f 40%,#ff8a1f 72%,#e5252a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:none;filter:drop-shadow(3px 3px 0 #000) drop-shadow(6px 6px 0 #b3120f);animation:ld-pop .6s cubic-bezier(.2,1.4,.4,1) both}
@keyframes ld-pop{from{transform:skewX(-8deg) scale(.6);opacity:0}to{transform:skewX(-8deg) scale(1);opacity:1}}
.ld-stripe{width:min(86vw,520px);height:clamp(6px,1.3vh,11px);transform:skewX(-20deg);box-shadow:3px 3px 0 #000;
  background:linear-gradient(90deg,#ffd23f 0 34%,#ff8a1f 34% 67%,#e5252a 67%)}
.ld-who{font-size:clamp(14px,3.4vw,24px);color:#fff;text-align:center}
.ld-who b{font-weight:400;color:#ffd23f}
.ld-who i{font-style:normal;color:#ff8a1f}
.ld-vs{font-size:clamp(10px,2.2vw,15px);color:#ffb37a;letter-spacing:.2em}
.ld-bar{position:relative;width:min(86vw,520px);height:clamp(18px,3.6vh,28px);margin-top:clamp(4px,1.2vh,12px);transform:skewX(-14deg);
  border:3px solid #ffd23f;box-shadow:4px 4px 0 #000;background:rgba(0,0,0,.72);overflow:hidden}
.ld-fill{position:absolute;inset:0;transform-origin:left;transform:scaleX(0);transition:transform .25s ease-out;
  background:repeating-linear-gradient(90deg,#ffd23f 0 14px,#ff8a1f 14px 28px,#e5252a 28px 42px)}
.ld-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(11px,2.4vw,16px);color:#fff}
.ld-tip{width:min(90vw,560px);margin-top:clamp(6px,2vh,18px);padding:clamp(8px,1.6vh,14px) clamp(12px,3vw,20px);border:3px solid #ff8a1f;
  background:linear-gradient(135deg,rgba(0,0,0,.8),rgba(70,12,0,.75));box-shadow:4px 4px 0 #000;transform:skewX(-6deg);text-transform:none;
  cursor:pointer;transition:opacity .2s}
.ld-tip.swap{opacity:0}
.ld-tag{display:inline-block;margin-bottom:6px;padding:.1em .6em;font-size:clamp(10px,2vw,13px);color:#fff;background:#e5252a;border:2px solid #000;
  box-shadow:2px 2px 0 #000;text-transform:uppercase}
.ld-text{font-family:'Arial Black',Arial,sans-serif;font-size:clamp(12px,2.6vw,17px);line-height:1.3;color:#ffe9b0;letter-spacing:.01em}
.ld-hint{font-size:clamp(9px,2vw,13px);color:#b9863a;letter-spacing:.12em;text-align:center}
@media (max-height:480px){.ld-arena{font-size:clamp(28px,10vh,60px)}.ld-tip{margin-top:4px}.ld-sun{display:none}}
@media (prefers-reduced-motion:reduce){.ld-root,.ld-root *{animation:none!important;transition:none!important}}
`;

export interface LoadingInfo {
  arenaId: string;
  arena: string;
  driver: string;
  vehicle: string;
  rivals: number;
}

/** Shu arena uchun maslahatlar: umumiylar (`tip.x`) + arena xususiyatlari (`tip.<arenaId>.x`). */
export function tipsFor(arenaId: string, keys: string[] = cfg.tips): string[] {
  return keys.filter((k) => k.split('.').length === 2 || k.startsWith(`tip.${arenaId}.`));
}

export class LoadingScreen {
  private readonly root: HTMLElement;
  private readonly style: HTMLStyleElement;
  private readonly arena: HTMLElement;
  private readonly who: HTMLElement;
  private readonly vs: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly pct: HTMLElement;
  private readonly tipBox: HTMLElement;
  private readonly tipText: HTMLElement;
  private readonly hint: HTMLElement;
  private tips: string[] = [];
  private tipIdx = 0;
  private shown = 0;
  private timer = 0;
  private hideTimer = 0;
  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.visible && ['Enter', 'NumpadEnter', 'Space', 'ArrowRight', 'ArrowLeft'].includes(e.code)) this.nextTip(e.code === 'ArrowLeft' ? -1 : 1);
  };

  constructor(ui: HTMLElement) {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    const r = (this.root = h('div', 'ld-root', ui));
    r.style.setProperty('--ld-fade', `${cfg.fadeMs}ms`);
    h('div', 'ld-sun', r);
    h('div', 'ld-grid', r);
    h('div', 'ld-kicker', r, t('loading.arena'));
    this.arena = h('h1', 'ld-arena', r);
    h('div', 'ld-stripe', r);
    this.who = h('div', 'ld-who', r);
    this.vs = h('div', 'ld-vs', r);
    const bar = h('div', 'ld-bar', r);
    this.fill = h('div', 'ld-fill', bar);
    this.pct = h('div', 'ld-pct', bar);
    this.tipBox = h('div', 'ld-tip', r);
    h('div', 'ld-tag', this.tipBox, t('loading.tip'));
    this.tipText = h('div', 'ld-text', this.tipBox);
    this.hint = h('div', 'ld-hint', r);
    r.addEventListener('pointerdown', () => this.nextTip(1));
    addEventListener('keydown', this.onKey);
  }

  get visible(): boolean {
    return this.root.classList.contains('show') && !this.root.classList.contains('out');
  }

  show(info: LoadingInfo): void {
    clearTimeout(this.hideTimer);
    this.root.classList.remove('out');
    this.arena.textContent = info.arena;
    this.who.innerHTML = '';
    h('b', '', this.who, info.driver);
    h('i', '', this.who, `  ·  ${info.vehicle}`);
    this.vs.textContent = t('loading.vs').replace('{n}', String(info.rivals));
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    this.hint.textContent = t(coarse ? 'loading.next.touch' : 'loading.next.kb');
    this.tips = tipsFor(info.arenaId);
    this.tipIdx = Math.floor(Math.random() * this.tips.length);
    this.renderTip();
    this.shown = 0;
    this.setBar(0);
    this.root.classList.add('show');
    clearInterval(this.timer);
    this.timer = window.setInterval(() => this.nextTip(1), cfg.tipSeconds * 1000);
  }

  /** 0..1; faqat oldinga siljiydi */
  progress(f: number): void {
    if (f > this.shown) this.setBar((this.shown = Math.min(1, f)));
  }

  hide(): void {
    clearInterval(this.timer);
    this.setBar(1);
    this.root.classList.add('out');
    this.hideTimer = window.setTimeout(() => this.root.classList.remove('show', 'out'), cfg.fadeMs);
  }

  dispose(): void {
    clearInterval(this.timer);
    clearTimeout(this.hideTimer);
    removeEventListener('keydown', this.onKey);
    this.root.remove();
    this.style.remove();
  }

  private setBar(f: number): void {
    this.fill.style.transform = `scaleX(${f})`;
    this.pct.textContent = `${Math.round(f * 100)}%`;
  }

  private nextTip(dir: number): void {
    if (this.tips.length < 2) return;
    this.tipIdx = (this.tipIdx + dir + this.tips.length) % this.tips.length;
    this.tipBox.classList.add('swap');
    setTimeout(() => (this.renderTip(), this.tipBox.classList.remove('swap')), cfg.fadeMs / 2);
  }

  private renderTip(): void {
    this.tipText.textContent = t(this.tips[this.tipIdx] ?? '');
  }
}
