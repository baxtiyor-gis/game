// Modullararo kontraktlar. Boshqa modullar bir-biriga faqat shu tiplar orqali murojaat qiladi.
import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { EventBus } from './events';

export type Rapier = typeof RAPIER;
export type Dir = 'U' | 'D' | 'L' | 'R';
export type Faction = 'vigilante' | 'coyote' | 'secret';
export type WeaponId = 'missile' | 'rocket' | 'mortar' | 'cannon' | 'mine';
export type PickupKind = WeaponId | 'health' | 'special';

// ---------- Input ----------
export interface InputState {
  throttle: number; // -1..1 (manfiy = tormoz/orqaga)
  steer: number; // -1 chap .. 1 o'ng
  handbrake: boolean;
  fireMG: boolean; // bosib turilgan
  fireWeapon: boolean; // shu tickda bosildi (edge)
  fireSpecial: boolean; // shu tickda bosildi (edge)
  cycleWeapon: -1 | 0 | 1; // edge
  rearView: boolean;
  combo: string | null; // shu tickda bajarilgan maxsus harakat id si (combos.json)
}

/** O'yinchi ham, bot ham shu interfeys orqali mashinani boshqaradi. */
export interface Controller {
  readonly id: string;
  sample(dt: number): InputState;
}

// ---------- Data (data/*.json) ----------
export interface VehicleStats {
  accel: number; // 1..5
  topSpeed: number;
  armor: number;
  avoidance: number;
}

export interface VehicleDef {
  id: string;
  name: string; // strings.json kaliti
  driver: string; // strings.json kaliti
  faction: Faction;
  locked: boolean;
  stats: VehicleStats;
  mass: number; // kg
  size: [number, number, number]; // eni, balandligi, uzunligi (m)
  color: string; // #rrggbb
  special: string; // specials/<id>
}

export interface WeaponDef {
  id: WeaponId;
  ammoPerPickup: number;
  damage: number;
  speed: number; // m/s (mina uchun 0)
  cooldown: number; // s
  splashRadius: number; // m
  lifetime: number; // s
  homingTurnRate?: number; // rad/s
  knockback?: number; // impuls
}

export interface ComboDef {
  id: string; // masalan "missile.afterburner"
  weapon: WeaponId;
  input: Dir[]; // 3 yo'nalish, keyin pulemyot
  ammoCost: number;
}

// ---------- Runtime ----------
export interface WeaponSlot {
  weapon: WeaponId;
  ammo: number;
}

export interface Inventory {
  slots: WeaponSlot[]; // max 3
  selected: number;
  specialAmmo: number;
}

export interface VehicleHandle {
  readonly id: string;
  readonly def: VehicleDef;
  readonly body: RAPIER.RigidBody;
  readonly object: THREE.Object3D; // render (interpolatsiya qilingan)
  readonly maxHp: number;
  hp: number;
  alive: boolean;
  controller: Controller;
  input: InputState; // oxirgi sample
  inventory: Inventory;
  /** Engine "o'chirilgan" (Gridlock/White Lightning) qolgan vaqt, s */
  stalled: number;
  speed(): number; // m/s
  forward(out: THREE.Vector3): THREE.Vector3;
  position(out: THREE.Vector3): THREE.Vector3;
}

// ---------- Events ----------
export interface GameEvents {
  damage: { targetId: string; sourceId: string | null; amount: number; weapon: string };
  destroyed: { targetId: string; sourceId: string | null };
  pickup: { vehicleId: string; kind: PickupKind };
  fire: { sourceId: string; weapon: string };
  explosion: { pos: THREE.Vector3; radius: number; damage: number; sourceId: string | null };
  whammy: { sourceId: string; targetId: string; count: number };
  matchEnd: { winnerId: string | null };
}

// ---------- Systems / World ----------
export interface System {
  readonly name: string;
  /** Qat'iy 60 Hz qadam: fizika va gameplay mantig'i */
  fixedUpdate?(dt: number): void;
  /** Har kadr: render, kamera, VFX. alpha = interpolatsiya koeffitsienti */
  update?(dt: number, alpha: number): void;
  dispose?(): void;
}

export interface GameWorld {
  readonly rapier: Rapier;
  readonly physics: RAPIER.World;
  /** Kontakt-kuch eventlari (to'qnashuv shikasti). Test world larda bo'lmasligi mumkin. */
  readonly eventQueue?: RAPIER.EventQueue;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly events: EventBus<GameEvents>;
  readonly vehicles: VehicleHandle[];
  time: number; // o'yin vaqti, s
  addSystem(sys: System): void;
  removeSystem(sys: System): void;
}

/** Collision guruhlari (Rapier interactionGroups uchun bitlar) */
export const CG = {
  WORLD: 1 << 0,
  VEHICLE: 1 << 1,
  PROJECTILE: 1 << 2,
  PICKUP: 1 << 3,
  DEBRIS: 1 << 4,
} as const;
