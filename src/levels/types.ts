// Arena JSON sxemasi (data/levels/<arena>.json) va runtime tiplari.
import type * as THREE from 'three';
import type { PickupKind } from '../core/types';
import type { DestructibleSystem } from './destructible';

export type Vec2 = [number, number];

export interface HillDef {
  pos: Vec2;
  radius: number;
  height: number;
}

/** Tekislangan maydon (bino, shoxobcha, rezervuar ostida): radius ichida `height`, blend m ichida tepalikka o'tadi. */
export interface FlatDef {
  pos: Vec2;
  radius: number;
  blend: number;
  height?: number;
  /** Kesma oxiri: bo'lsa tekislik (pos -> to) kapsula (yo'l/daryo/to'g'on); balandlik `height` dan `toHeight` ga chiziqli o'zgaradi */
  to?: Vec2;
  toHeight?: number;
}

/** Suv yuzasi: `rect` [x0,z0,x1,z1] yoki `path` (+ `width`) lentasi; `y` — suv sathi. Chuqurlik = y - yer balandligi. */
export interface WaterDef {
  id: string;
  y: number;
  rect?: [number, number, number, number];
  path?: Vec2[];
  width?: number;
}

export interface TerrainDef {
  /** Har tomondagi katak soni (heightfield (n+1)^2 tugun) */
  resolution: number;
  seed: number;
  noise: { amplitude: number; frequency: number; octaves: number };
  hills: HillDef[];
  flats: FlatDef[];
  /** Yer teksturasi ustiga ko'paytiriladigan rang (#rrggbb): arenaga o'z tusini beradi */
  tint?: string;
}

export interface BoundaryDef {
  wallHeight: number;
  wallThickness: number;
  /** Chegara bo'ylab qo'yiladigan qoyalar soni (ko'rinish uchun, InstancedMesh) */
  rockCount: number;
  rockScale: [number, number];
}

export type PropType =
  | 'building' | 'pipe' | 'rock' | 'station'
  | 'barn' | 'silo' | 'farmhouse' | 'waterTower' | 'tree' | 'fence' | 'crops' | 'bridge' | 'creek'
  | 'airplane' | 'hangar' | 'controlTower' | 'runway' | 'barbedFence'
  | 'bunker' | 'guardTower' | 'militaryTruck' | 'ufoWreck' | 'lampPost'
  | 'damWall' | 'powerHouse' | 'powerPylon' | 'intakeTower' | 'cliff';

export interface PropDef {
  type: PropType;
  pos: Vec2;
  yaw?: number;
  scale?: number;
  /** building: eni, balandligi, uzunligi (m) */
  size?: [number, number, number];
  /** pipe: uzunligi (m) */
  length?: number;
  /** pipe: yerdan ko'tarilish (m); >0 bo'lsa ustunlarda turadi */
  lift?: number;
  /** crops: 'corn' | 'wheat' | 'plowed'; bridge/creek: qo'shimcha tur */
  variant?: string;
  /** creek: oqim markaz chizig'i nuqtalari; width — oqim eni (m) */
  points?: Vec2[];
  width?: number;
  /** airplane: buzilish turi ('wingless' | 'tailless' | 'split' | 'noEngines' | 'belly'); bo'sh = butun */
  damage?: string;
  /** airplane: bo'yoq sxemasi indeksi (tur ranglari ro'yxatidan) */
  scheme?: number;
  /** damWall: to'g'on o'qi bo'ylab uzunlik `length`, yo'l eni `width`; cliff: `size` = eni, balandligi, chuqurligi; powerPylon: `points[0]` — sim tortiladigan keyingi ustun */
  /** guardTower: chiroq turi — 'spot' (haqiqiy SpotLight + nur) yoki 'beam' (faqat ko'rinadigan nur); bo'sh = chiroqsiz */
  light?: 'spot' | 'beam';
}

export interface DestructibleInstance {
  /** data/levels/destructibles.json dagi tur ("tank", "barrel") */
  type: string;
  pos: Vec2;
  yaw?: number;
  /** Vayron bo'lganda tushadigan sandiq (onDrop orqali) */
  drop?: PickupKind;
}

export interface InteractiveDef {
  type: 'pumpjack' | 'windmill' | 'crane' | 'radar' | 'launchSite';
  pos: Vec2;
  yaw?: number;
  /** crane: yuk turi ('container' | 'engine'); radar: 'bar' | 'dish' */
  variant?: string;
  /** launchSite: pos — terminal; pad — raketa maydonchasi markazi */
  pad?: Vec2;
  /** Aylanish tezligi, rad/s (default data/levels/props.json) */
  speed?: number;
}

export interface SpawnDef {
  pos: Vec2;
  yaw: number;
}

/** weapons/pickups PickupSpawn bilan strukturaviy mos: arena.pickupSpawns da pos[1] mutlaq balandlik. */
export interface PickupSpawnDef {
  /** JSON da [x, yOffset, z] (yOffset yerga qo'shiladi); Arena.pickupSpawns da mutlaq y */
  pos: [number, number, number];
  kind: PickupKind;
}

/** Temir yo'l: spline nuqtalari (arena chetidan chetiga, chegaradan tashqarigacha) va poyezd parametrlari. */
export interface TrainDef {
  path: Vec2[];
  /** m/s */
  speed: number;
  /** Lokomotivdan keyingi vagonlar soni (4-6) */
  wagons: number;
  wagonHp: number;
  /** Poyezd izning shu ulushida (0..1) boshlanadi: o'yin boshida kadrda bo'lishi uchun */
  startProgress: number;
  /** Oxirgi vagon izdan chiqqach, qayta paydo bo'lguncha, s */
  respawnDelay: number;
}

/** Yo'lak bo'ylab o'tuvchi samolyot (kinematik): iz arena chetidan chetigacha, har `interval` s da takrorlanadi. */
export interface PlaneRouteDef {
  /** data/levels/props.json air.planes dagi tur */
  kind: string;
  path: Vec2[];
  /** m/s */
  speed: number;
  /** Birinchi paydo bo'lguncha, s */
  delay: number;
  /** Chiqib ketgandan keyin qayta paydo bo'lguncha, s */
  interval: number;
  /** Izning shu ulushidan keyin ko'tarilib ketadi (0..1); 1 = yerda qoladi */
  liftAt: number;
}

/** Arena osmoni/tumani/quyoshi (hammasi ixtiyoriy; yo'q bo'lsa data/render.json default). */
export interface EnvironmentDef {
  sky?: { top?: string; horizon?: string; ground?: string; sunColor?: string };
  fog?: { color?: string; near?: number; far?: number };
  sun?: { color?: string; direction?: [number, number, number]; intensity?: number };
  hemi?: { sky?: string; ground?: string; intensity?: number };
}

export interface ArenaDef {
  id: string;
  /** Maydon tomoni, m (kvadrat, markaz 0,0) */
  size: number;
  /** O'yinchi spawn nuqtasi yerdan necha metr yuqorida */
  spawnLift: number;
  terrain: TerrainDef;
  boundary: BoundaryDef;
  props: PropDef[];
  destructibles: DestructibleInstance[];
  interactives: InteractiveDef[];
  playerSpawns: SpawnDef[];
  pickupSpawns: PickupSpawnDef[];
  environment?: EnvironmentDef;
  train?: TrainDef;
  planes?: PlaneRouteDef[];
  /** Suv yuzalari (daryo, ko'l): WaterSystem */
  water?: WaterDef[];
}

/** data/levels/destructibles.json: tur parametrlari */
export interface DestructibleType {
  hp: number;
  /** To'qnashuv silindri (m) */
  radius: number;
  height: number;
  /** Portlash markazi yerdan necha metr balandlikda */
  centerHeight: number;
  explosion: { radius: number; damage: number };
  /** O'lgandan portlashgacha kechikish, s (zanjir ketma-ketligi uchun) */
  fuse: number;
  /** Pulemyot (hitscan) zarari ko'paytirgichi: hp / (dps * soniya) bo'yicha balans */
  mgScale: number;
}

export interface LoadOptions {
  /** Destructible yo'q bo'lganda sandiq chiqarish uchun (main PickupSystem ga ulaydi) */
  onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void;
  /** Qurilish jarayoni (0..1): yuklanish ekrani uchun; qadamlar orasida bosh oqim bo'shatiladi */
  onProgress?: (fraction: number) => void;
}

export interface Arena {
  def: ArenaDef;
  spawns: { pos: THREE.Vector3; yaw: number }[];
  pickupSpawns: PickupSpawnDef[];
  heightAt(x: number, z: number): number;
  /** Destructible tizimi (holat so'rash: alive, isDestroyed) */
  destructibles: DestructibleSystem;
  dispose(): void;
}
