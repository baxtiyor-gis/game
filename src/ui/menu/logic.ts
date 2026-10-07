// Menyu sof mantiqi (DOM va three.js siz): navigatsiya holat mashinasi, statistika, raqib tanlash.
import { handling } from '../../core/data';
import type { VehicleDef } from '../../core/types';
import { tuningFor } from '../../vehicles/tuning';
import { MENU, type ScreenId } from './config';

/** Esc/B bosilganda qaysi ekranga qaytiladi (null: ekran o'zi hal qiladi). */
export const BACK: Record<ScreenId, ScreenId | null> = {
  home: null, select: 'home', setup: 'select', settings: 'home', controls: 'home', pause: null, result: null,
};

/** Fokusni delta bo'yicha siljitadi: o'chirilgan qatorlar o'tkazib yuboriladi, chekkada aylanadi. */
export function stepIndex(i: number, delta: number, enabled: readonly boolean[]): number {
  const n = enabled.length;
  if (n === 0 || !enabled.some(Boolean)) return i;
  let k = i;
  for (let s = 0; s < n; s++) {
    k = (((k + delta) % n) + n) % n;
    if (enabled[k]) return k;
  }
  return i;
}

/** Ekranlar bo'yicha fokus indeksi va joriy ekran. */
export class MenuNav {
  screen: ScreenId = 'home';
  private focus = new Map<ScreenId, number>();

  go(s: ScreenId, focus?: number): void {
    this.screen = s;
    if (focus !== undefined) this.focus.set(s, focus);
  }

  index(s: ScreenId = this.screen): number {
    return this.focus.get(s) ?? 0;
  }

  setIndex(i: number, s: ScreenId = this.screen): void {
    this.focus.set(s, i);
  }

  move(delta: number, enabled: readonly boolean[]): number {
    const i = stepIndex(this.index(), delta, enabled);
    this.focus.set(this.screen, i);
    return i;
  }

  /** Esc: BACK jadvali bo'yicha oldingi ekranga o'tadi; yo'q bo'lsa null. */
  back(): ScreenId | null {
    const to = BACK[this.screen];
    if (to) this.screen = to;
    return to;
  }
}

// ---------- Xarakteristikalar ----------

export interface StatBar { stat: string; label: string; value: number; fraction: number }

/** 4 ta bar: qiymat 1..statMax, to'ldirilish ulushi 0..1. */
export function statBars(def: VehicleDef): StatBar[] {
  return MENU.bars.map((b) => {
    const value = Math.min(MENU.statMax, Math.max(1, Math.round(def.stats[b.stat])));
    return { stat: b.stat, label: b.label, value, fraction: value / MENU.statMax };
  });
}

const pick = (table: readonly number[], stat: number): number =>
  table[Math.min(table.length, Math.max(1, Math.round(stat))) - 1] ?? 0;

/** Maks. tezlik, km/h (handling.json jadvalidan; fizika drag muvozanati aynan shu nuqtaga kalibrlangan). */
export function topSpeedKmh(def: VehicleDef): number {
  return Math.round(pick(handling.byStat.topSpeed, def.stats.topSpeed) * 3.6);
}

/** Taxminiy 0→100 km/h, s (fizika bilan bir xil tortish/qarshilik modeli). Yetib bo'lmasa null. */
export function accelTime(def: VehicleDef): number | null {
  const tn = tuningFor(def);
  const pt = handling.powertrain;
  const target = MENU.accel.targetKmh / 3.6;
  if (pick(handling.byStat.topSpeed, def.stats.topSpeed) <= target) return null;
  const rolling = pt.rollingResistance * def.mass * handling.world.gravity;
  const dt = MENU.accel.step;
  let v = 0;
  let time = 0;
  while (v < target) {
    const drive = Math.min(tn.launchForce, tn.wheelPower / Math.max(v, 1e-3));
    const drag = 0.5 * pt.airDensity * tn.dragArea * v * v + rolling;
    v += ((drive - drag) / def.mass) * dt;
    time += dt;
    if (time > MENU.accel.maxTime) return null;
  }
  return time;
}

// ---------- Ro'yxat va raqiblar ----------

/** Fraksiya bo'yicha guruhlangan tartib (menu.json factions tartibi, ichida vehicles.json tartibi). */
export function factionGroups(vehicles: readonly VehicleDef[]): { faction: string; items: VehicleDef[] }[] {
  return MENU.factions
    .map((f) => ({ faction: f.id as string, items: vehicles.filter((v) => v.faction === f.id) }))
    .filter((g) => g.items.length > 0);
}

/** ↑↓: oldingi/keyingi fraksiya guruhiga o'tadi (guruh ichidagi o'rin saqlanadi, chekkada qisqaradi). */
export function stepGroup(order: readonly VehicleDef[], idx: number, dir: -1 | 1): number {
  const cur = order[idx];
  if (!cur) return idx;
  const groups = factionGroups(order);
  const gi = groups.findIndex((g) => g.faction === cur.faction);
  const next = groups[(gi + dir + groups.length) % groups.length];
  if (!next) return idx;
  const pos = Math.min(groups[gi]?.items.indexOf(cur) ?? 0, next.items.length - 1);
  return order.indexOf(next.items[pos] ?? cur);
}

/** Guruhlangan tartibdagi tekis ro'yxat (←→ shu tartibda yuradi). */
export const flatOrder = (vehicles: readonly VehicleDef[]): VehicleDef[] => factionGroups(vehicles).flatMap((g) => g.items);

/** Tanlangan mashinadan boshqa mashinalardan `count` ta tasodifiy raqib (takrorsiz; count > mavjud bo'lsa kesiladi). */
export function pickRivals(vehicles: readonly VehicleDef[], selectedId: string, count: number, rng: () => number = Math.random): string[] {
  const pool = vehicles.filter((v) => v.id !== selectedId).map((v) => v.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, Math.max(0, count));
}

/** Soniyalarni m:ss ko'rinishiga keltiradi. */
export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "{n}" shablonini to'ldiradi. */
export const fill = (tpl: string, n: string | number): string => tpl.replace('{n}', String(n));
