// Arena JSON sxemasi (data/levels/<arena>.json) va runtime tiplari.
import type * as THREE from 'three';
import type { PickupKind } from '../core/types';

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
}

export interface TerrainDef {
  /** Har tomondagi katak soni (heightfield (n+1)^2 tugun) */
  resolution: number;
  seed: number;
  noise: { amplitude: number; frequency: number; octaves: number };
  hills: HillDef[];
  flats: FlatDef[];
}

export interface BoundaryDef {
  wallHeight: number;
  wallThickness: number;
  /** Chegara bo'ylab qo'yiladigan qoyalar soni (ko'rinish uchun, InstancedMesh) */
  rockCount: number;
  rockScale: [number, number];
}

export type PropType = 'building' | 'pipe' | 'rock' | 'station';

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
  type: 'pumpjack';
  pos: Vec2;
  yaw?: number;
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

export interface EnvironmentDef {
  sky?: string;
  fog?: string;
  fogDensity?: number;
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
}

export interface LoadOptions {
  /** Destructible yo'q bo'lganda sandiq chiqarish uchun (main PickupSystem ga ulaydi) */
  onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void;
}

export interface Arena {
  def: ArenaDef;
  spawns: { pos: THREE.Vector3; yaw: number }[];
  pickupSpawns: PickupSpawnDef[];
  heightAt(x: number, z: number): number;
  dispose(): void;
}
