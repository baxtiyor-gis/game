// Menyu sozlamalari (data/menu.json) va haydovchi ma'lumotlari (data/drivers.json): tiplangan eksport.
import menuJson from '../../../data/menu.json';
import driversJson from '../../../data/drivers.json';
import type { Faction, WeaponId } from '../../core/types';
import { ARENAS } from '../../levels/registry';
import { controls } from '../../core/data';
import type { TouchMode } from '../../input/touch';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type ScreenId = 'home' | 'select' | 'setup' | 'settings' | 'controls' | 'pause' | 'result';
export type Action = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'pause';

export interface DriverInfo { bio: string; specialName: string; specialDesc: string }

export interface MenuConfig {
  storageKey: string;
  playHash: string;
  defaults: Settings;
  home: { id: string; label: string; enabled: boolean }[];
  arenas: { id: string; name: string; enabled: boolean }[];
  difficulties: { id: Difficulty; label: string }[];
  rivals: { min: number; max: number };
  volume: { step: number };
  factions: { id: Faction; label: string; color: string }[];
  bars: { stat: 'accel' | 'topSpeed' | 'armor' | 'avoidance'; label: string }[];
  statMax: number;
  accel: { targetKmh: number; step: number; maxTime: number };
  endDelay: number;
  pad: Record<string, number>;
  repeat: { delay: number; rate: number };
  keys: Record<Action, string[]>;
  backdrop: { radius: number; height: number; lookHeight: number; speed: number; fov: number };
  /** Yuklanish bosqichlari chegaralari (0..1): muhit, arena, mashinalar; qolgani — shader isitish */
  loadingSteps: { env: number; arena: number; vehicles: number };
  /** Yuklanish ekrani: maslahat almashish oralig'i (s), so'nish (ms), maslahat kalitlari (strings.json) */
  loading: { tipSeconds: number; fadeMs: number; tips: string[] };
  preview: Record<string, number | string>;
  loadout: { player: { weapon: WeaponId; ammo: number }[]; bot: { weapon: WeaponId; ammo: number }[] };
  quickPlay: { vehicle: string; rivals: string[]; difficulty: Difficulty };
  arrows: Record<string, string>;
  keyLabels: Record<string, string>;
  padLabels: Record<string, string>;
  controlRows: { label: string; kb?: string[]; codes?: string[]; pad?: number[]; padText?: string }[];
}

export interface Settings {
  volume: number;
  retro: boolean;
  unlockAll: boolean;
  difficulty: Difficulty;
  rivals: number;
  vehicle: string;
  arena: string;
  touch: TouchMode;
}

/** Arena ro'yxati levels/registry.ts dan olinadi (menu.json da emas). */
export const MENU = {
  ...(menuJson as unknown as Omit<MenuConfig, 'arenas' | 'defaults'>),
  defaults: { ...menuJson.defaults, touch: controls.touch.defaultMode } as Settings,
  arenas: ARENAS.map((a) => ({ id: a.id, name: a.nameKey, enabled: a.available })),
} as MenuConfig;
export const DRIVERS = driversJson as Record<string, DriverInfo>;
