import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameEvents, GameWorld, System } from '../core/types';
import { registerHitTarget } from '../core/hitTargets';
import type { BuildContext } from './context';
import { destructibleTypes } from './destructible';
import { buildLayout } from './liftRoute';
import type { LiftRoute } from './liftRoute';
import { WORLD_GROUPS } from './props/common';
import { strut } from './props/damKit';
import { CABIN_DROP, createLiftCabin } from './props/liftCabin';
import { createLiftStation } from './props/liftStation';
import { smat, ski } from './props/skiKit';

const L = ski.lift;
const F = L.fall;
const HALF_H = L.cabin.h / 2;
const tmp = new THREE.Vector3();
const dirTmp = new THREE.Vector3();
const eul = new THREE.Euler();
const quat = new THREE.Quaternion();

export type CabinPhase = 'ride' | 'fall' | 'wreck';

export interface LiftCabin {
  id: string;
  s: number;
  phase: CabinPhase;
  hp: number;
  t: number;
  vy: number;
  yaw: number;
  roll: number;
  /** Arqonga mahkamlanish nuqtasi (dunyo) va oldingi tick dagi holati (render interpolatsiyasi) */
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  /** Shu yiqilishda zarar olgan mashinalar */
  hit: Set<string>;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  wrap: THREE.Group;
}

/**
 * Kanat yo'li: yopiq arqon bo'ylab `cabins` ta kabina (kinematik) `speed` m/s bilan aylanadi.
 * Kabinani otsangiz (hp) yoki ustun ('liftPylon-N') portlasa, shu atrofdagi kabinalar yiqiladi: tushish paytida va yerga
 * urilganda tagidagi mashinaga 'damage' (weapon 'lift') va impuls; `wreckTime` s to'siq bo'lib yotadi, so'ng
 * bo'sh joy bo'lsa pastki stansiyada qayta tiklanadi.
 */
export class SkiLiftSystem implements System {
  readonly name = 'skiLift';
  readonly cabins: LiftCabin[];
  private readonly off: Array<() => void>;
  /** Test/HUD uchun: yiqilgan kabinalar soni */
  falls = 0;

  constructor(
    private readonly world: GameWorld,
    readonly route: LiftRoute,
    cabins: LiftCabin[],
    private readonly pylons: Map<string, THREE.Vector2>,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly parent: THREE.Object3D,
  ) {
    this.cabins = cabins;
    for (const c of cabins) {
      parent.add(c.wrap);
      registerHitTarget(world, c.collider.handle, { id: c.id, damage: (amount, _s, weapon) => this.hurt(c, weapon === 'mg' ? amount * L.cabin.mgScale : amount) });
      this.place(c, true);
    }
    this.off = [
      world.events.on('damage', (e) => {
        const c = this.cabins.find((x) => x.id === e.targetId);
        if (c) this.hurt(c, e.amount);
      }),
      world.events.on('explosion', (e) => this.onExplosion(e)),
    ];
  }

  private center(c: LiftCabin, out: THREE.Vector3): THREE.Vector3 {
    return out.set(c.pos.x, c.pos.y - CABIN_DROP, c.pos.z);
  }

  /** Kabina ob'ektini (fizika + render) c.pos/yaw/roll bo'yicha qo'yadi; snap — oldingi holatni ham tenglaydi. */
  private place(c: LiftCabin, snap = false): void {
    this.center(c, tmp);
    quat.setFromEuler(eul.set(0, c.yaw, c.roll, 'YXZ'));
    c.body.setNextKinematicTranslation(tmp);
    c.body.setNextKinematicRotation(quat);
    if (snap) {
      c.body.setTranslation(tmp, false);
      c.body.setRotation(quat, false);
      c.prev.copy(c.pos);
    }
    c.wrap.quaternion.copy(quat);
    if (snap) c.wrap.position.copy(tmp);
  }

  private hurt(c: LiftCabin, amount: number): void {
    if (c.phase !== 'ride' || amount <= 0) return;
    c.hp -= amount;
    if (c.hp <= 0) this.drop(c);
  }

  private drop(c: LiftCabin): void {
    if (c.phase !== 'ride') return;
    c.phase = 'fall';
    c.vy = 0;
    c.t = 0;
    c.hit.clear();
    c.collider.setEnabled(false);
    this.falls++;
  }

  private onExplosion(e: GameEvents['explosion']): void {
    const pylon = e.sourceId ? this.pylons.get(e.sourceId) : undefined;
    for (const c of this.cabins) {
      if (c.phase !== 'ride') continue;
      if (pylon) {
        if (Math.hypot(c.pos.x - pylon.x, c.pos.z - pylon.y) < L.pylonReach) this.drop(c);
      } else if (e.damage > 0) {
        const d = Math.max(0, this.center(c, tmp).distanceTo(e.pos) - L.cabin.d / 2);
        if (d < e.radius) this.hurt(c, e.damage * (1 - d / e.radius));
      }
    }
  }

  /** Tagidagi mashinalarga zarar: tushish paytida kabina tubi mashina tomiga yetsa, yerga urilganda — keng doirada. */
  private strike(c: LiftCabin, landing: boolean): void {
    const bottom = c.pos.y - CABIN_DROP - HALF_H;
    for (const v of this.world.vehicles) {
      if (!v.alive || c.hit.has(v.id)) continue;
      v.position(tmp);
      if (Math.hypot(tmp.x - c.pos.x, tmp.z - c.pos.z) > (landing ? F.landRadius : F.radius)) continue;
      if (!landing && bottom > tmp.y + F.carTop) continue;
      c.hit.add(v.id);
      const push = dirTmp.set(tmp.x - c.pos.x, 0, tmp.z - c.pos.z);
      if (push.lengthSq() < 1e-6) push.set(1, 0, 0);
      push.normalize();
      push.y = F.lift;
      v.body.applyImpulse(push.normalize().multiplyScalar(v.def.mass * F.impulseSpeed), true);
      this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: F.damage, weapon: 'lift' });
    }
  }

  private land(c: LiftCabin, ground: number): void {
    c.pos.y = ground + CABIN_DROP + HALF_H;
    c.phase = 'wreck';
    c.t = 0;
    c.roll = F.wreckRoll;
    c.collider.setEnabled(true);
    this.strike(c, true);
    this.world.events.emit('shake', { pos: new THREE.Vector3(c.pos.x, ground, c.pos.z), radius: F.shakeRadius });
  }

  private slotFree(): boolean {
    return this.cabins.every((c) => {
      if (c.phase !== 'ride') return true;
      const d = Math.min(c.s % this.route.length, this.route.length - (c.s % this.route.length));
      return d >= L.respawnGap;
    });
  }

  private recover(c: LiftCabin): void {
    c.s = 0;
    c.phase = 'ride';
    c.hp = L.cabin.hp;
    c.roll = 0;
    c.hit.clear();
    this.route.at(0, c.pos, dirTmp);
    c.yaw = Math.atan2(dirTmp.x, dirTmp.z);
    this.place(c, true);
  }

  fixedUpdate(dt: number): void {
    for (const c of this.cabins) {
      c.prev.copy(c.pos);
      if (c.phase === 'ride') {
        c.s += L.speed * dt;
        this.route.at(c.s, c.pos, dirTmp);
        const target = Math.atan2(dirTmp.x, dirTmp.z);
        const diff = Math.atan2(Math.sin(target - c.yaw), Math.cos(target - c.yaw));
        c.yaw += diff * Math.min(1, dt * L.turnRate);
      } else if (c.phase === 'fall') {
        c.vy -= F.gravity * dt;
        c.pos.y += c.vy * dt;
        c.roll += F.spin * dt;
        const ground = this.heightAt(c.pos.x, c.pos.z);
        this.strike(c, false);
        if (c.pos.y - CABIN_DROP - HALF_H <= ground) this.land(c, ground);
      } else {
        c.t += dt;
        if (c.t >= L.wreckTime && this.slotFree()) this.recover(c);
      }
      this.place(c);
    }
  }

  update(_dt: number, alpha: number): void {
    for (const c of this.cabins) {
      c.wrap.position.set(
        THREE.MathUtils.lerp(c.prev.x, c.pos.x, alpha),
        THREE.MathUtils.lerp(c.prev.y, c.pos.y, alpha) - CABIN_DROP,
        THREE.MathUtils.lerp(c.prev.z, c.pos.z, alpha),
      );
    }
  }

  dispose(): void {
    for (const o of this.off) o();
    for (const c of this.cabins) {
      this.parent.remove(c.wrap);
      if (this.world.physics.getRigidBody(c.body.handle)) this.world.physics.removeRigidBody(c.body);
    }
    this.cabins.length = 0;
  }
}

/** Arena qurilishida: def.skiLift + destructibles dagi 'liftPylon' lar -> stansiyalar, arqonlar (statik) va kabinalar (SkiLiftSystem). */
export function createSkiLift(ctx: BuildContext): SkiLiftSystem | null {
  const def = ctx.def.skiLift;
  if (!def) return null;
  const R = ctx.world.rapier;
  const pylons = new Map<string, THREE.Vector2>();
  let n = 0;
  for (const d of ctx.def.destructibles) if (d.type === 'liftPylon') pylons.set(`liftPylon-${++n}`, new THREE.Vector2(d.pos[0], d.pos[1]));
  const top = destructibleTypes.liftPylon!.height;
  const lay = buildLayout(def, [...pylons.values()].map((p) => [p.x, p.y]), top, ctx.heightAt);
  const cables = new THREE.Group();
  const cableMat = smat('cable', 0.6, 0.3);
  for (const line of [lay.up, lay.down]) {
    for (let i = 0; i + 1 < line.length; i++) cables.add(strut(line[i]!, line[i + 1]!, L.cableR, cableMat));
  }
  ctx.statics.push(cables);
  const yaw = Math.atan2(lay.dir[0], lay.dir[1]);
  [[def.bottom, yaw], [def.top, yaw + Math.PI]].forEach(([p, yw]) => {
    const [x, z] = p as [number, number];
    const st = createLiftStation(R, { x, y: ctx.heightAt(x, z), z, yaw: yw as number }, L.station.cableY);
    ctx.statics.push(st.object);
    for (const c of st.colliders) ctx.addCollider(c);
  });
  const cabins: LiftCabin[] = [];
  for (let i = 0; i < def.cabins; i++) {
    const s = (lay.route.length * i) / def.cabins;
    const pos = new THREE.Vector3();
    lay.route.at(s, pos, dirTmp);
    const body = ctx.world.physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    const collider = ctx.world.physics.createCollider(
      R.ColliderDesc.cuboid(L.cabin.w / 2, HALF_H, L.cabin.d / 2).setCollisionGroups(WORLD_GROUPS), body);
    const wrap = new THREE.Group();
    const model = createLiftCabin();
    model.position.y = CABIN_DROP;
    wrap.add(model);
    cabins.push({
      id: `liftCabin-${i + 1}`, s, phase: 'ride', hp: L.cabin.hp, t: 0, vy: 0, yaw: Math.atan2(dirTmp.x, dirTmp.z), roll: 0,
      pos, prev: pos.clone(), hit: new Set(), body, collider, wrap,
    });
  }
  return new SkiLiftSystem(ctx.world, lay.route, cabins, pylons, ctx.heightAt, ctx.root);
}
