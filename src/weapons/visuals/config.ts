// data/weaponVisuals.json ning tiplangan ko'rinishi.
import json from '../../../data/weaponVisuals.json';
import type { WeaponId } from '../../core/types';

export interface RocketModel {
  kind: 'rocket';
  length: number; radius: number; noseFrac: number;
  bodyColor: string; noseColor: string; bandColor: string; bandAt: number; bandWidth: number;
  finCount: number; finSpan: number; finLength: number; finThick: number; finColor: string;
  nozzleColor: string; nozzleLength: number;
  flame?: { length: number; radius: number; color: string; core: string };
  tip?: { radius: number; color: string; at: number };
  flicker: number; roll: number; metalness: number; roughness: number;
}
export interface ShellModel {
  kind: 'shell';
  length: number; radius: number; tailLength: number;
  bodyColor: string; bandColor: string; stripeColor: string; tailColor: string;
  finSpan: number; finCount: number; tumble: number; metalness: number; roughness: number;
}
export interface DiskModel {
  kind: 'disk';
  length: number; radius: number; height: number; teeth: number; toothLength: number;
  bodyColor: string; toothColor: string; rimColor: string; lightColor: string; lightRadius: number;
  spin: number; blinkIdle: number; blinkArmed: number; duty: number; dim: number; metalness: number; roughness: number;
}
export type ModelCfg = RocketModel | ShellModel | DiskModel;

export interface TrailLayer {
  rate: number; life: number; size: [number, number];
  from: [number, number, number, number]; to: [number, number, number, number];
  add: number; drift: number; jitter: number; back: number;
}

export interface VisualsCfg {
  hdr: { flame: number; glow: number; tracerHead: number; tracerMid: number };
  viewMax: { trailParticles: number; trailMaxPerFrame: number; trailMaxPoint: number; trailResetDistance: number };
  models: Record<WeaponId, ModelCfg>;
  special: { scale: number; tintMix: number; tints: Record<WeaponId, string> };
  trails: Record<WeaponId, TrailLayer[]>;
  tracer: {
    speed: number; length: number; headWidth: number; tailWidth: number; minLife: number; maxTracers: number;
    head: string; mid: string; haloScale: number; haloIntensity: number;
  };
  flash: { intensity: number };
  crate: {
    bevel: number; bevelSegments: number; metalness: number; roughness: number; bandColor: string; bandOverhang: number;
    bandWidth: number; plateSize: number; plateBg: string; iconScale: number; iconTexture: number;
    modelScale: number; modelHeight: number; modelTilt: number; modelSpin: number;
    ring: { radius: number; tube: number; intensity: number; pulse: number; pulseSpeed: number; groundOffset: number };
    beam: { radius: number; height: number; opacity: number };
    ringColors: { weapon: string; health: string; special: string };
    burst: { pool: number; life: number; radius: number; intensity: number };
  };
  icons: { viewBox: number } & Record<IconId, string>;
}

export type IconId = WeaponId | 'mg' | 'special' | 'health';

export const vis = json as unknown as VisualsCfg;
