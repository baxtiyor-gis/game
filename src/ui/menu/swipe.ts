// Gorizontal swipe (barmoq/sichqoncha): chapga -> +1 (keyingi), o'ngga -> -1. Chegaralar data/controls.json touch.swipe da.
import { controls } from '../../core/data';

/** dx/dy (px) bo'yicha swipe yo'nalishi: -1 | 0 | 1 (sof funksiya). */
export function swipeDir(dx: number, dy: number, minPx = controls.touch.swipe.minPx, ratio = controls.touch.swipe.ratio): -1 | 0 | 1 {
  if (Math.abs(dx) < minPx || Math.abs(dx) < Math.abs(dy) * ratio) return 0;
  return dx < 0 ? 1 : -1;
}

export function onSwipe(el: HTMLElement, cb: (d: -1 | 1) => void): void {
  let start: { id: number; x: number; y: number } | null = null;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') start = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointerup', (e) => {
    if (!start || start.id !== e.pointerId) return;
    const d = swipeDir(e.clientX - start.x, e.clientY - start.y);
    start = null;
    if (d) cb(d);
  });
  el.addEventListener('pointercancel', () => (start = null));
}
