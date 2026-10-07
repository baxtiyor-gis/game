// Utility AI: har ~0.25 s da harakat tanlash (ATTACK / EVADE / COLLECT / HEAL / WANDER). Sof mantiq.
import type * as THREE from 'three';
import type { PickupKind, WeaponId } from '../core/types';
import type { AiProfile, UtilityCfg } from './config';

export type ActionKind = 'attack' | 'evade' | 'collect' | 'heal' | 'wander';

export interface UtilEnemy { id: string; pos: THREE.Vector3; hpFrac: number }
export interface UtilPickup { pos: THREE.Vector3; kind: PickupKind; available: boolean }

export interface UtilContext {
  pos: THREE.Vector3;
  hpFrac: number;
  totalAmmo: number; // barcha slotlardagi o'q-dori yig'indisi
  enemies: UtilEnemy[]; // tirik raqiblar
  pickups: UtilPickup[];
  current: ActionKind | null;
}

export interface Decision {
  action: ActionKind;
  enemy: number; // enemies indeksi (-1 yo'q)
  pickup: number; // pickups indeksi (-1 yo'q)
  scores: Record<ActionKind, number>;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const dist2d = (a: THREE.Vector3, b: THREE.Vector3): number => Math.hypot(a.x - b.x, a.z - b.z);
const isWeapon = (k: PickupKind): k is WeaponId => k !== 'health' && k !== 'special';

/** Eng yaqin va eng zaif raqibni tanlaydi. */
export function pickTarget(ctx: UtilContext, cfg: UtilityCfg): number {
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < ctx.enemies.length; i++) {
    const e = ctx.enemies[i];
    const s = 1 - clamp01(dist2d(ctx.pos, e.pos) / cfg.attackRange) + cfg.weakWeight * (1 - e.hpFrac);
    if (s > bestScore) { bestScore = s; best = i; }
  }
  return best;
}

function nearestPickup(ctx: UtilContext, cfg: UtilityCfg, want: (p: UtilPickup) => number): { idx: number; score: number } {
  let idx = -1;
  let score = 0;
  for (let i = 0; i < ctx.pickups.length; i++) {
    const p = ctx.pickups[i];
    if (!p.available) continue;
    const w = want(p);
    if (w <= 0) continue;
    const prox = 1 - clamp01(dist2d(ctx.pos, p.pos) / cfg.pickupRange);
    const s = w * (0.4 + 0.6 * prox);
    if (s > score) { score = s; idx = i; }
  }
  return { idx, score };
}

export function decide(ctx: UtilContext, profile: AiProfile, cfg: UtilityCfg): Decision {
  const scores: Record<ActionKind, number> = { attack: 0, evade: 0, collect: 0, heal: 0, wander: cfg.wanderScore };
  const hpLow = clamp01((cfg.lowHp - ctx.hpFrac) / cfg.lowHp);
  const target = pickTarget(ctx, cfg);

  if (target >= 0) {
    const prox = 1 - clamp01(dist2d(ctx.pos, ctx.enemies[target].pos) / cfg.attackRange);
    const armed = ctx.totalAmmo > 0 ? 1 : cfg.noAmmoAttackFactor;
    scores.attack = cfg.attackWeight * profile.aggression * (0.5 + 0.5 * prox) * armed * (1 - hpLow * profile.caution);
    let near = 0;
    for (const e of ctx.enemies) if (dist2d(ctx.pos, e.pos) < cfg.crowdRadius) near++;
    const crowd = clamp01((near - 1) / Math.max(1, cfg.crowdCount - 1));
    scores.evade = profile.caution * (cfg.evadeWeight * hpLow + cfg.crowdWeight * crowd * (1 - profile.aggression));
  }

  const heal = nearestPickup(ctx, cfg, (p) => (p.kind === 'health' ? 1 : 0));
  const need = clamp01((cfg.healBelow - ctx.hpFrac) / cfg.healBelow);
  if (heal.idx >= 0) scores.heal = cfg.healWeight * need * (0.5 + heal.score);

  const noWeapon = ctx.totalAmmo <= 0;
  const ammoNeed = noWeapon ? 1 : cfg.lowAmmoNeed * (1 - clamp01(ctx.totalAmmo / cfg.lowAmmo));
  const collect = nearestPickup(ctx, cfg, (p) => {
    if (!isWeapon(p.kind) && p.kind !== 'special') return 0;
    const pref = isWeapon(p.kind) && profile.preferredWeapons.includes(p.kind) ? cfg.preferredBonus : 0;
    return 1 + pref;
  });
  if (collect.idx >= 0) scores.collect = cfg.collectWeight * ammoNeed * (collect.score + cfg.greedWeight * (1 - profile.aggression));

  if (ctx.current) scores[ctx.current] += cfg.hysteresis;

  let action: ActionKind = 'wander';
  let best = -Infinity;
  for (const k of Object.keys(scores) as ActionKind[]) {
    if (scores[k] > best) { best = scores[k]; action = k; }
  }
  return { action, enemy: target, pickup: action === 'heal' ? heal.idx : action === 'collect' ? collect.idx : -1, scores };
}
