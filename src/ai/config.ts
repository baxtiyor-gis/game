// AI sozlamalari (data/ai.json, data/ai_profiles.json) va ularning tiplari.
import aiJson from '../../data/ai.json';
import profilesJson from '../../data/ai_profiles.json';
import type { WeaponId } from '../core/types';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyCfg {
  aimError: number; // rad
  reactionTime: number; // s
  decisionInterval: number; // s
  leadAccuracy: number; // 0..1
  comboScale: number;
  throttleCap: number;
  fireInterval: number; // s
}

export interface UtilityCfg {
  attackRange: number; weakWeight: number; attackWeight: number; noAmmoAttackFactor: number;
  lowHp: number; healBelow: number; healWeight: number; evadeWeight: number; crowdWeight: number;
  crowdRadius: number; crowdCount: number; collectWeight: number; lowAmmo: number; lowAmmoNeed: number;
  pickupRange: number; wanderScore: number; hysteresis: number; greedWeight: number; preferredBonus: number;
}

export interface SteeringCfg {
  arriveRadius: number; turnThrottle: number; sharpAngle: number; steerGain: number;
  whiskerAngles: number[]; whiskerBase: number; whiskerPerSpeed: number; whiskerInterval: number;
  whiskerHeight: number; avoidWeight: number; brakeDanger: number;
  stuckSpeed: number; stuckTime: number; reverseTime: number; flipUpY: number;
  circleAngle: number; circleFlip: number; fleeDistance: number; zigzagPeriod: number; zigzagAmount: number;
  wanderRadius: number; wanderBounds: number; wanderRepick: number; reachRadius: number;
}

export interface WeaponRangeCfg { min: number; ideal: number; max: number; cone: number }

export interface AimCfg {
  fireCone: number; losInterval: number; losHeight: number; mineRange: number; mineRearDot: number;
  comboCooldown: number; mgRange: number; maxLeadTime: number; retargetInterval: number;
  weaponRanges: Record<WeaponId, WeaponRangeCfg>;
  offensiveCombos: string[];
}

export interface AiProfile {
  aggression: number; // 0..1
  caution: number; // 0..1
  comboChance: number; // 0..1
  preferredWeapons: WeaponId[];
}

const ai = aiJson as unknown as {
  difficulty: Record<Difficulty, DifficultyCfg>; utility: UtilityCfg; steering: SteeringCfg; aim: AimCfg;
};
const profiles = profilesJson as unknown as Record<string, AiProfile>;

export const difficultyCfg = (d: Difficulty): DifficultyCfg => ai.difficulty[d];
export const utilityCfg: UtilityCfg = ai.utility;
export const steeringCfg: SteeringCfg = ai.steering;
export const aimCfg: AimCfg = ai.aim;

/** Noma'lum haydovchi uchun o'rtacha profil qaytariladi. */
export function aiProfile(id: string): AiProfile {
  return profiles[id] ?? { aggression: 0.6, caution: 0.5, comboChance: 0.5, preferredWeapons: [] };
}
