// Sozlamalar saqlash (localStorage; mavjud bo'lmasa yoki xato bersa jim ishlaydi).
import type { VehicleDef } from '../../core/types';
import { MENU, type Settings } from './config';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Saqlangan (noma'lum/buzilgan bo'lishi mumkin) qiymatni to'g'ri Settings ga keltiradi. */
export function sanitize(raw: unknown, vehicles: readonly VehicleDef[]): Settings {
  const d = MENU.defaults;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const num = (v: unknown, fb: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fb);
  const bool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb);
  const unlockAll = bool(r.unlockAll, d.unlockAll);
  const vehicle = vehicles.find((v) => v.id === r.vehicle && (unlockAll || !v.locked))?.id ?? d.vehicle;
  const diff = MENU.difficulties.find((x) => x.id === r.difficulty)?.id ?? d.difficulty;
  const arena = MENU.arenas.find((a) => a.id === r.arena && a.enabled)?.id ?? d.arena;
  return {
    volume: clamp(num(r.volume, d.volume), 0, 1),
    retro: bool(r.retro, d.retro),
    unlockAll,
    difficulty: diff,
    rivals: Math.round(clamp(num(r.rivals, d.rivals), MENU.rivals.min, MENU.rivals.max)),
    vehicle,
    arena,
  };
}

export function loadSettings(vehicles: readonly VehicleDef[]): Settings {
  let raw: unknown = null;
  try {
    const s = globalThis.localStorage?.getItem(MENU.storageKey);
    raw = s ? JSON.parse(s) : null;
  } catch {
    raw = null;
  }
  return sanitize(raw, vehicles);
}

export function saveSettings(s: Settings): void {
  try {
    globalThis.localStorage?.setItem(MENU.storageKey, JSON.stringify(s));
  } catch {
    /* saqlash imkonsiz (private rejim / kvota): e'tiborsiz */
  }
}

export const isUnlocked = (def: VehicleDef, s: Settings): boolean => !def.locked || s.unlockAll;
