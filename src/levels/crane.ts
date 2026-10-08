import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameWorld, PickupKind, System, VehicleHandle } from '../core/types';
import { registerHitTarget } from '../core/hitTargets';
import type { BuildContext } from './context';
import { createCraneStructure, createLoadModel, HANG, loadSize } from './props/craneModel';
import { WORLD_GROUPS, cachedGeo } from './props/common';
import type { Vec3 } from './props/common';
import { amat } from './props/airKit';
import cfg from '../../data/levels/crane.json';

export type CranePhase = 'idle' | 'warn' | 'fall' | 'hold' | 'rise' | 'cool' | 'dead';

export interface CraneRig {
  id: string;
  x: number;
  z: number;
  yaw: number;
  groundY: number;
  size: Vec3;
  pivotY: number;
  /** Ilgak tepasidan to'sin tagigacha arqon uzunligi (yuk yuqorida turganda), m */
  rope0: number;
  /** Yuk markazidan ilgak uchigacha, m */
  hookTotal: number;
  phase: CranePhase;
  t: number;
  /** Yuk tushgan masofa: 0 = yuqorida, restClearance = yerda */
  drop: number;
  vy: number;
  sway: number;
  hp: number;
  cut: boolean;
  prevDrop: number;
  prevSway: number;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  pivot: THREE.Group;
  cable: THREE.Mesh;
  load: THREE.Group;
}

const qTmp = new THREE.Quaternion();
const eTmp = new THREE.Euler();
const vTmp = new THREE.Vector3();

/**
 * Kran yuklari (kinematik): yuqorida osilib turadi; tagida mashina paydo bo'lsa `warn` s tebranadi (ogohlantirish),
 * so'ng tez tushib 'damage' (weapon 'crane') + impuls beradi, `hold` s yerda turadi, asta ko'tariladi, sovutish.
 * Yukni otib uzish mumkin (hp): u tushib qoladi (to'siq), kran ishdan chiqadi va sandiq tushadi.
 */
export class CraneSystem implements System {
  readonly name = 'cranes';
  private readonly hitAt = new Map<string, number>();
  private readonly off: Array<() => void> = [];
  private drops = 0;

  constructor(
    private readonly world: GameWorld,
    readonly rigs: CraneRig[],
    private readonly onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void,
  ) {
    this.off.push(world.events.on('damage', (e) => {
      const r = rigs.find((x) => x.id === e.targetId);
      if (r) this.hurt(r, e.amount);
    }));
    for (const r of rigs) {
      registerHitTarget(world, r.collider.handle, { id: r.id, damage: (amount, _s, weapon) => this.hurt(r, weapon === 'mg' ? amount * cfg.cut.mgScale : amount) });
      this.pose(r, true);
    }
  }

  /** Yuk markazi (dunyo) va yo'nalishi */
  private center(r: CraneRig, drop: number, sway: number, outQ: THREE.Quaternion, out: THREE.Vector3): void {
    outQ.setFromEuler(eTmp.set(sway, r.yaw, 0, 'YXZ'));
    out.set(0, -(r.rope0 + drop + r.hookTotal), 0).applyQuaternion(outQ);
    out.x += r.x;
    out.y += r.pivotY;
    out.z += r.z;
  }

  private pose(r: CraneRig, snap = false): void {
    this.center(r, r.drop, r.sway, qTmp, vTmp);
    r.body.setNextKinematicTranslation(vTmp);
    r.body.setNextKinematicRotation(qTmp);
    if (snap) {
      r.body.setTranslation(vTmp, false);
      r.body.setRotation(qTmp, false);
    }
  }

  private local(r: CraneRig, v: VehicleHandle): { lx: number; lz: number; y: number } {
    v.position(vTmp);
    const dx = vTmp.x - r.x;
    const dz = vTmp.z - r.z;
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    return { lx: dx * c - dz * s, lz: dx * s + dz * c, y: vTmp.y };
  }

  private inside(r: CraneRig, v: VehicleHandle, margin: number): boolean {
    const l = this.local(r, v);
    return Math.abs(l.lx) <= r.size[0] / 2 + margin && Math.abs(l.lz) <= r.size[2] / 2 + margin;
  }

  private bottomY(r: CraneRig): number {
    return r.groundY + cfg.restClearance - r.drop;
  }

  private strike(r: CraneRig, landing: boolean): void {
    const im = cfg.impact;
    for (const v of this.world.vehicles) {
      if (!v.alive || !this.inside(r, v, im.margin)) continue;
      v.position(vTmp);
      if (!landing && this.bottomY(r) > vTmp.y + 2.2) continue;
      if (this.world.time - (this.hitAt.get(v.id) ?? -1e9) < im.cooldown) continue;
      this.hitAt.set(v.id, this.world.time);
      const push = new THREE.Vector3(vTmp.x - r.x, 0, vTmp.z - r.z);
      if (push.lengthSq() < 1e-6) push.set(1, 0, 0);
      push.normalize();
      push.y = im.lift;
      push.normalize().multiplyScalar(v.def.mass * im.impulseSpeed);
      v.body.applyImpulse(push, true);
      this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: im.damage, weapon: 'crane' });
    }
  }

  private land(r: CraneRig): void {
    r.drop = cfg.restClearance;
    r.sway = 0;
    this.strike(r, true);
    r.collider.setEnabled(true);
    r.phase = r.cut ? 'dead' : 'hold';
    r.t = 0;
    this.world.events.emit('shake', { pos: new THREE.Vector3(r.x, r.groundY, r.z), radius: cfg.impact.shakeRadius });
  }

  private startFall(r: CraneRig): void {
    r.phase = 'fall';
    r.vy = 0;
    r.collider.setEnabled(false);
  }

  private hurt(r: CraneRig, amount: number): void {
    if (r.cut || amount <= 0) return;
    r.hp -= amount;
    if (r.hp > 0) return;
    r.cut = true;
    if (r.phase === 'hold') r.phase = 'dead';
    else if (r.phase !== 'fall') this.startFall(r);
    const kinds = cfg.cut.drops as PickupKind[];
    const at = new THREE.Vector3(r.x, r.groundY + 0.6, r.z);
    at.x += Math.cos(r.yaw) * cfg.cut.dropOffset;
    at.z -= Math.sin(r.yaw) * cfg.cut.dropOffset;
    this.onDrop?.(at, kinds[this.drops++ % kinds.length]!);
  }

  fixedUpdate(dt: number): void {
    for (const r of this.rigs) {
      r.prevDrop = r.drop;
      r.prevSway = r.sway;
      switch (r.phase) {
        case 'idle':
          r.sway = 0.02 * Math.sin(this.world.time * 1.1 + r.x);
          if (this.world.vehicles.some((v) => v.alive && this.inside(r, v, cfg.trigger.margin))) {
            r.phase = 'warn';
            r.t = 0;
          }
          break;
        case 'warn':
          r.t += dt;
          r.sway = cfg.sway.amplitude * Math.sin(2 * Math.PI * cfg.sway.frequency * r.t) * Math.min(1, r.t / 0.15);
          if (r.t >= cfg.warn) this.startFall(r);
          break;
        case 'fall':
          r.vy += cfg.fall.accel * dt;
          r.drop = Math.min(cfg.restClearance, r.drop + r.vy * dt);
          r.sway *= 0.9;
          this.strike(r, false);
          if (r.drop >= cfg.restClearance) this.land(r);
          break;
        case 'hold':
          r.t += dt;
          if (r.t >= cfg.hold) r.phase = 'rise';
          break;
        case 'rise':
          r.drop = Math.max(0, r.drop - cfg.riseSpeed * dt);
          if (r.drop <= 0) {
            r.phase = 'cool';
            r.t = 0;
          }
          break;
        case 'cool':
          r.t += dt;
          if (r.t >= cfg.cooldown) r.phase = 'idle';
          break;
        default:
          break;
      }
      this.pose(r);
    }
  }

  update(_dt: number, alpha: number): void {
    for (const r of this.rigs) {
      const d = THREE.MathUtils.lerp(r.prevDrop, r.drop, alpha);
      const rope = r.rope0 + d;
      r.pivot.rotation.set(THREE.MathUtils.lerp(r.prevSway, r.sway, alpha), r.yaw, 0, 'YXZ');
      r.cable.scale.y = rope;
      r.cable.position.y = -rope / 2;
      r.load.position.y = -(rope + r.hookTotal);
    }
  }

  dispose(): void {
    for (const o of this.off) o();
    for (const r of this.rigs) this.world.physics.removeRigidBody(r.body);
    this.rigs.length = 0;
  }
}

/** Arena qurilishida: interactives dagi 'crane' lar (statik karkas + dinamik yuk) -> CraneSystem. */
export function createCranes(ctx: BuildContext, onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void): CraneSystem | null {
  const R = ctx.world.rapier;
  const rigs: CraneRig[] = [];
  for (const def of ctx.def.interactives) {
    if (def.type !== 'crane') continue;
    const [x, z] = def.pos;
    const yaw = def.yaw ?? 0;
    const groundY = Math.max(ctx.heightAt(x, z), ...[1, -1].map((s) => ctx.heightAt(x + s * cfg.span / 2 * Math.cos(yaw), z - s * cfg.span / 2 * Math.sin(yaw))));
    const struct = createCraneStructure(R, { x, y: groundY, z, yaw });
    ctx.statics.push(struct.object);
    for (const c of struct.colliders) ctx.addCollider(c);
    const kind = def.variant ?? 'container';
    const size = loadSize(kind);
    const hookTotal = size[1] / 2 + HANG + cfg.hookHeight;
    const pivotY = groundY + cfg.height;
    const hookTop = groundY + cfg.restClearance + size[1] + HANG + cfg.hookHeight;
    const body = ctx.world.physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    const collider = ctx.world.physics.createCollider(R.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setCollisionGroups(WORLD_GROUPS), body);
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, z);
    const cable = new THREE.Mesh(cachedGeo('unitCyl', () => new THREE.CylinderGeometry(1, 1, 1, 16)), amat('cable', 0.8, 0.3));
    cable.scale.set(0.07, 1, 0.07);
    cable.castShadow = true;
    const load = createLoadModel(kind);
    pivot.add(cable, load);
    ctx.root.add(pivot);
    rigs.push({
      id: `crane-${rigs.length + 1}`, x, z, yaw, groundY, size, pivotY, rope0: pivotY - hookTop, hookTotal,
      phase: 'idle', t: 0, drop: 0, vy: 0, sway: 0, hp: cfg.cut.hp, cut: false, prevDrop: 0, prevSway: 0, body, collider, pivot, cable, load,
    });
  }
  return rigs.length > 0 ? new CraneSystem(ctx.world, rigs, onDrop) : null;
}
