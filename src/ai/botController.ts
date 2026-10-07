// Bot: o'yinchi bilan bir xil Controller interfeysi. Qaror (utility) -> harakat (steering) -> otish (aim).
import * as THREE from 'three';
import { weapons } from '../core/data';
import type { Controller, GameWorld, InputState, PickupKind, VehicleHandle } from '../core/types';
import { emptyInput } from '../input/playerController';
import {
  aimCfg, aiProfile, difficultyCfg, steeringCfg as sc, utilityCfg,
  type AiProfile, type Difficulty, type DifficultyCfg,
} from './config';
import { aimNoise, blendLead, chooseWeapon, inFireCone, leadPoint, perturbAim, pickCombo, projectileSpeed, type Rng } from './aim';
import { Sensors } from './sensors';
import { blendSteer, circlePoint, fleePoint, headingError, seek, StuckDetector, uprightY, type Drive } from './steering';
import { decide, type ActionKind, type UtilContext } from './utility';

export interface BotPickup { pos: THREE.Vector3; kind: PickupKind; available: boolean }
export interface BotOptions {
  profile: string; // haydovchi id si (ai_profiles.json)
  difficulty: Difficulty;
  getPickups?: () => BotPickup[];
  rng?: Rng;
}

const tmpPos = new THREE.Vector3();
const tmpFwd = new THREE.Vector3();
const ePos = new THREE.Vector3();
const eVel = new THREE.Vector3();
const lead = new THREE.Vector3();
const aimPt = new THREE.Vector3();
const goal = new THREE.Vector3();

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class BotController implements Controller {
  readonly id: string;
  private readonly profile: AiProfile;
  private readonly diff: DifficultyCfg;
  private readonly rng: Rng;
  private readonly sensors: Sensors;
  private readonly stuck = new StuckDetector();
  private readonly state: InputState = emptyInput();
  private readonly drive: Drive = { throttle: 0, steer: 0, err: 0 };
  private speedLimit = Infinity;
  private action: ActionKind = 'wander';
  private enemy: VehicleHandle | null = null;
  private pickupPos: THREE.Vector3 | null = null;
  private wander = new THREE.Vector3();
  private wanderUntil = 0;
  private time = 0;
  private nextThink = 0;
  private nextAimRoll = 0;
  private aimAngle = 0;
  private reactionLeft = 0;
  private nextFire = 0;
  private nextCombo = 0;
  private nextCycle = 0;
  private circleDir: 1 | -1 = 1;
  private nextCircleFlip = 0;
  private reverseSteer = 1;
  private desiredSlot = -1;
  private moveIdeal = 0;
  private chaserBehind = false;

  constructor(
    private readonly world: GameWorld,
    private readonly self: () => VehicleHandle | undefined,
    private readonly opts: BotOptions,
  ) {
    this.id = `bot:${opts.profile}`;
    this.profile = aiProfile(opts.profile);
    this.diff = difficultyCfg(opts.difficulty);
    let seed = 0;
    for (const ch of this.id) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    this.rng = opts.rng ?? mulberry32(seed);
    this.sensors = new Sensors(world);
  }

  /** Diagnostika (e2e): joriy harakat, nishon va masofa. */
  debugInfo(): string {
    const e = this.enemy;
    const d = e ? Math.round(e.position(ePos).distanceTo(tmpPos)) : -1;
    return `${this.action} tgt=${e?.id ?? '-'} d=${d} slot=${this.desiredSlot} los=${this.sensors.los} av=${this.sensors.avoid.steer.toFixed(2)}/${this.sensors.avoid.max.toFixed(2)} ${this.stuck.mode}`;
  }

  sample(dt: number): InputState {
    const s = this.state;
    s.throttle = 0; s.steer = 0; s.handbrake = false; s.fireMG = false;
    s.fireWeapon = false; s.fireSpecial = false; s.cycleWeapon = 0; s.combo = null;
    const me = this.self();
    if (!me || !me.alive) return s;
    this.time += dt;
    this.reactionLeft = Math.max(0, this.reactionLeft - dt);
    me.position(tmpPos);
    me.forward(tmpFwd);
    const speed = me.speed();
    const mode = this.stuck.update(dt, speed, me.stalled <= 0, uprightY(me.body.rotation()), sc);
    if (mode === 'flipped') return s; // fizika o'zi o'nglaydi, kutamiz

    if (this.time >= this.nextThink) this.think(me);
    this.sensors.updateWhiskers(me, tmpPos, tmpFwd, speed);
    const avoid = this.sensors.avoid;

    if (mode === 'reverse') {
      s.throttle = -1;
      s.steer = this.reverseSteer;
      return s;
    }
    this.reverseSteer = (this.drive.steer || avoid.steer || this.reverseSteer) > 0 ? -1 : 1;
    this.steer();
    s.steer = blendSteer(this.drive.steer, avoid);
    s.throttle = Math.min(this.drive.throttle, this.diff.throttleCap);
    // Tezlik nazorati: burilishda va yaqin jangda sekinlashadi (aks holda aylana radiusi juda katta).
    const lim = Math.min(this.speedLimit, sc.cornerSpeed + (sc.cruiseSpeed - sc.cornerSpeed) * (1 - Math.min(1, Math.abs(this.drive.err) / sc.sharpAngle)));
    s.throttle = Math.min(s.throttle, Math.max(-1, (lim - speed) / sc.speedGain));
    if (avoid.front > sc.brakeDanger && speed > sc.stuckSpeed * 3) s.throttle = Math.min(s.throttle, 0);
    if (this.action === 'attack' || this.action === 'evade') this.shoot(me);
    return s;
  }

  /** Qaror: harakat, nishon, qurol tanlovi. */
  private think(me: VehicleHandle): void {
    const diff = this.diff;
    this.nextThink = this.time + diff.decisionInterval * (0.8 + 0.4 * this.rng());
    const enemies = this.world.vehicles.filter((v) => v !== me && v.alive);
    const inv = me.inventory;
    let ammo = 0;
    for (const sl of inv.slots) ammo += sl.ammo;
    const ctx: UtilContext = {
      pos: tmpPos, hpFrac: me.hp / me.maxHp, totalAmmo: ammo, current: this.action,
      currentEnemy: this.enemy?.id,
      enemies: enemies.map((v) => ({ id: v.id, pos: v.position(new THREE.Vector3()), hpFrac: v.hp / v.maxHp, human: !(v.controller instanceof BotController) })),
      pickups: this.opts.getPickups?.() ?? [],
    };
    const d = decide(ctx, this.profile, utilityCfg);
    this.action = d.action;
    const target = d.enemy >= 0 ? enemies[d.enemy] : null;
    if (target?.id !== this.enemy?.id) this.reactionLeft = diff.reactionTime * (0.8 + 0.4 * this.rng());
    this.enemy = target;
    this.pickupPos = d.pickup >= 0 ? ctx.pickups[d.pickup].pos : null;
    if (this.time >= this.nextCircleFlip) {
      this.circleDir = this.rng() < 0.5 ? 1 : -1;
      this.nextCircleFlip = this.time + sc.circleFlip * (0.7 + 0.6 * this.rng());
    }
    // Qurol tanlovi va orqadagi quvuvchi (mina).
    this.chaserBehind = false;
    for (const e of ctx.enemies) {
      const dx = e.pos.x - tmpPos.x, dz = e.pos.z - tmpPos.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist < aimCfg.mineRange && (dx * tmpFwd.x + dz * tmpFwd.z) / dist < aimCfg.mineRearDot) this.chaserBehind = true;
    }
    const dist = target ? Math.hypot(ctx.enemies[d.enemy].pos.x - tmpPos.x, ctx.enemies[d.enemy].pos.z - tmpPos.z) : 0;
    this.desiredSlot = chooseWeapon(inv.slots, inv.selected, dist, this.chaserBehind, this.profile, utilityCfg.preferredBonus);
    const direct = chooseWeapon(inv.slots, inv.selected, dist, false, this.profile, utilityCfg.preferredBonus);
    this.moveIdeal = direct >= 0 ? aimCfg.weaponRanges[inv.slots[direct].weapon].ideal : aimCfg.mgRange * 0.5;
  }

  /** Harakat yo'nalishi: this.drive ni to'ldiradi. */
  private steer(): void {
    this.speedLimit = Infinity;
    switch (this.action) {
      case 'attack': if (this.enemy?.alive) return this.attackMove();
        break;
      case 'evade': if (this.enemy?.alive) {
        this.enemy.position(ePos);
        return void seek(tmpFwd, tmpPos, fleePoint(tmpPos, ePos, this.time, sc, goal), sc, false, this.drive);
      }
        break;
      case 'collect': case 'heal': if (this.pickupPos) return void seek(tmpFwd, tmpPos, this.pickupPos, sc, false, this.drive);
        break;
      default: break;
    }
    this.wanderMove();
  }

  private attackMove(): void {
    const e = this.enemy as VehicleHandle;
    e.position(ePos);
    this.aimPoint(e);
    const dist = Math.hypot(ePos.x - tmpPos.x, ePos.z - tmpPos.z);
    if (dist < this.moveIdeal * sc.attackSlowFactor) this.speedLimit = sc.attackSpeed;
    if (dist > this.moveIdeal * 1.3) seek(tmpFwd, tmpPos, aimPt, sc, false, this.drive);
    else seek(tmpFwd, tmpPos, circlePoint(tmpPos, ePos, Math.max(this.moveIdeal, 1), this.circleDir, sc, goal), sc, false, this.drive);
  }

  private wanderMove(): void {
    if (this.time >= this.wanderUntil || Math.hypot(this.wander.x - tmpPos.x, this.wander.z - tmpPos.z) < sc.reachRadius) {
      const a = this.rng() * Math.PI * 2;
      const r = sc.wanderRadius * (0.4 + 0.6 * this.rng());
      const b = sc.wanderBounds;
      this.wander.set(Math.max(-b, Math.min(b, tmpPos.x + Math.cos(a) * r)), tmpPos.y, Math.max(-b, Math.min(b, tmpPos.z + Math.sin(a) * r)));
      this.wanderUntil = this.time + sc.wanderRepick;
    }
    seek(tmpFwd, tmpPos, this.wander, sc, true, this.drive);
  }

  /** Nishon nuqtasi: lead (qiyinlik bo'yicha susaytirilgan) + aim xatosi (har retargetInterval da yangilanadi). */
  private aimPoint(e: VehicleHandle): void {
    const inv = (this.self() as VehicleHandle).inventory;
    const slot = inv.slots[inv.selected];
    const speed = slot && slot.ammo > 0 ? projectileSpeed(slot.weapon) : 0;
    const v = e.body.linvel();
    eVel.set(v.x, v.y, v.z);
    leadPoint(tmpPos, ePos, eVel, speed, lead);
    blendLead(ePos, lead, this.diff.leadAccuracy, lead);
    if (this.time >= this.nextAimRoll) {
      this.nextAimRoll = this.time + aimCfg.retargetInterval;
      this.aimAngle = aimNoise(this.diff.aimError, this.rng);
    }
    perturbAim(lead, tmpPos, this.aimAngle, aimPt);
  }

  /** Otish: qurol almashtirish, qurol/pulemyot/kombo. Reaksiya kechikishidan keyin. */
  private shoot(me: VehicleHandle): void {
    const s = this.state;
    const inv = me.inventory;
    const slot = inv.slots[inv.selected];
    if (this.desiredSlot >= 0 && this.desiredSlot !== inv.selected && this.time >= this.nextCycle) {
      this.nextCycle = this.time + 0.2;
      const n = inv.slots.length;
      s.cycleWeapon = (this.desiredSlot - inv.selected + n) % n <= n / 2 ? 1 : -1;
    }
    const e = this.enemy;
    if (this.action === 'evade') {
      if (this.chaserBehind && slot?.weapon === 'mine' && slot.ammo > 0 && this.time >= this.nextFire) this.fire(slot);
      return;
    }
    if (!e?.alive) return;
    if (this.reactionLeft > 0) return;
    e.position(ePos);
    this.sensors.updateLos(me, tmpPos, e, ePos);
    const dist = Math.hypot(ePos.x - tmpPos.x, ePos.z - tmpPos.z);
    const err = headingError(tmpFwd, tmpPos, aimPt);
    if (!this.sensors.los) return;
    if (dist <= aimCfg.mgRange && inFireCone(null, err, this.diff, dist)) s.fireMG = true;
    if (!slot || slot.ammo <= 0 || slot.weapon === 'mine' || this.time < this.nextFire) return;
    const r = aimCfg.weaponRanges[slot.weapon];
    if (dist < r.min || dist > r.max || !inFireCone(slot.weapon, err, this.diff)) return;
    this.fire(slot);
  }

  private fire(slot: { weapon: keyof typeof weapons; ammo: number }): void {
    const s = this.state;
    this.nextFire = this.time + Math.max(weapons[slot.weapon].cooldown, this.diff.fireInterval);
    if (this.time >= this.nextCombo) {
      const id = pickCombo(slot, this.profile, this.diff, this.rng);
      if (id) {
        this.nextCombo = this.time + aimCfg.comboCooldown;
        s.combo = id;
        s.fireMG = true;
        return;
      }
    }
    s.fireWeapon = true;
  }
}
