// Nishonga olish: oldindan hisoblash (lead), xato, qurol va kombo tanlash. Sof mantiq.
import * as THREE from 'three';
import { combos, weapons } from '../core/data';
import type { WeaponId, WeaponSlot } from '../core/types';
import { aimCfg, type AiProfile, type DifficultyCfg } from './config';

export type Rng = () => number;

/** Snaryad tezligi bo'yicha to'siq nuqtasi: shooter + dir*speed*t = target + vel*t. t topilmasa — nishonning o'zi. */
export function leadPoint(
  shooter: THREE.Vector3, target: THREE.Vector3, vel: THREE.Vector3, projSpeed: number, out: THREE.Vector3,
  maxT: number = aimCfg.maxLeadTime,
): THREE.Vector3 {
  out.copy(target);
  if (projSpeed <= 0) return out;
  const dx = target.x - shooter.x, dy = target.y - shooter.y, dz = target.z - shooter.z;
  const a = vel.lengthSq() - projSpeed * projSpeed;
  const b = 2 * (dx * vel.x + dy * vel.y + dz * vel.z);
  const c = dx * dx + dy * dy + dz * dz;
  let t = -1;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const t1 = (-b - sq) / (2 * a);
      const t2 = (-b + sq) / (2 * a);
      t = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);
      if (!Number.isFinite(t)) t = -1;
    }
  }
  if (t <= 0) return out;
  return out.addScaledVector(vel, Math.min(t, maxT));
}

/** Lead ni qiyinlikka qarab susaytiradi: accuracy=1 to'liq lead, 0 — nishonning o'zi. */
export function blendLead(target: THREE.Vector3, lead: THREE.Vector3, accuracy: number, out: THREE.Vector3): THREE.Vector3 {
  return out.copy(target).lerp(lead, accuracy);
}

/** Aim xatosi burchagi: ±err rad ichida tasodifiy. */
export const aimNoise = (err: number, rng: Rng): number => (rng() * 2 - 1) * err;

/** Nuqtani `from` atrofida XZ tekisligida `ang` radianga buradi (aim xatosi). */
export function perturbAim(point: THREE.Vector3, from: THREE.Vector3, ang: number, out: THREE.Vector3): THREE.Vector3 {
  const dx = point.x - from.x, dz = point.z - from.z;
  const c = Math.cos(ang), s = Math.sin(ang);
  return out.set(from.x + dx * c - dz * s, point.y, from.z + dx * s + dz * c);
}

export const projectileSpeed = (w: WeaponId): number => weapons[w].speed;

/** Masofa bo'yicha qurol "mosligi" 0..1 (ideal masofada 1, diapazondan tashqarida ~0). */
export function rangeFit(w: WeaponId, dist: number): number {
  const r = aimCfg.weaponRanges[w];
  if (dist < r.min || dist > r.max) return 0;
  const span = Math.max(r.ideal - r.min, r.max - r.ideal, 1e-3);
  return 1 - Math.min(1, Math.abs(dist - r.ideal) / span) * 0.9;
}

/** Eng mos slot indeksi (-1 — ishlatadigan qurol yo'q). Mina faqat orqada quvuvchi bo'lsa. */
export function chooseWeapon(
  slots: readonly WeaponSlot[], selected: number, dist: number, chaserBehind: boolean, profile: AiProfile,
  preferredBonus: number,
): number {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.ammo <= 0) continue;
    let score = s.weapon === 'mine' ? (chaserBehind ? 1 : 0) : rangeFit(s.weapon, dist);
    if (score <= 0) continue;
    const pref = profile.preferredWeapons.indexOf(s.weapon);
    if (pref >= 0) score += preferredBonus / (1 + pref);
    if (i === selected) score += 0.05;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** Kombo id si (yoki null): hujumkor kombolar ichidan, ammo yetarli bo'lsa, profil ehtimoli bilan. */
export function pickCombo(slot: WeaponSlot | undefined, profile: AiProfile, diff: DifficultyCfg, rng: Rng): string | null {
  if (!slot || rng() >= profile.comboChance * diff.comboScale) return null;
  const options = combos.filter((c) => c.weapon === slot.weapon && c.ammoCost <= slot.ammo && aimCfg.offensiveCombos.includes(c.id));
  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length) % options.length].id;
}

/** Nishon yo'nalishi qurol konusiga tushdimi (angleErr — mashina oldi va nishon orasidagi burchak). */
export function inFireCone(w: WeaponId | null, angleErr: number, difficulty: DifficultyCfg): boolean {
  const cone = w ? aimCfg.weaponRanges[w].cone : aimCfg.fireCone;
  return Math.abs(angleErr) <= cone + difficulty.aimError;
}
