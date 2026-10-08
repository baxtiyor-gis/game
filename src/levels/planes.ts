import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameWorld, System } from '../core/types';
import type { BuildContext } from './context';
import type { PlaneRouteDef } from './types';
import { TrackPath } from './trackPath';
import { buildPlane } from './props/airplane';
import type { PlaneModel } from './props/airplane';
import { WORLD_GROUPS } from './props/common';
import cfg from '../../data/levels/planes.json';

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
}

export interface PlaneRoute {
  def: PlaneRouteDef;
  track: TrackPath;
  model: PlaneModel;
  body: RAPIER.RigidBody;
  /** Samolyot markazining iz boshidan masofasi, m */
  s: number;
  active: boolean;
  /** Faol bo'lmaganda: keyingi paydo bo'lishgacha qolgan vaqt, s */
  wait: number;
  cycle: number;
  prev: Pose;
  cur: Pose;
}

const tmpA = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const qi = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

/**
 * Yo'lak bo'ylab o'tuvchi samolyotlar (kinematik): sekin tezlanib, `liftAt` dan keyin ko'tarilib ketadi.
 * Arena chetidan chetigacha o'tadi, so'ng `interval` s kutib qayta paydo bo'ladi. Tegsa mashinaga 'damage' (weapon 'plane') + impuls.
 */
export class PlaneSystem implements System {
  readonly name = 'planes';
  private readonly hitAt = new Map<string, number>();

  constructor(
    private readonly world: GameWorld,
    readonly routes: PlaneRoute[],
  ) {
    for (const r of routes) this.pose(r, true);
  }

  private pose(r: PlaneRoute, snap: boolean): void {
    r.track.at(r.s, tmpA, tmpD);
    const climb = Math.max(0, r.s - r.def.liftAt * r.track.length);
    const pitch = climb > 0 ? cfg.climbAngle : 0;
    tmpA.y += climb * Math.tan(cfg.climbAngle);
    r.prev.p.copy(r.cur.p);
    r.prev.q.copy(r.cur.q);
    qYaw.setFromAxisAngle(UP, Math.atan2(tmpD.x, tmpD.z));
    qPitch.setFromAxisAngle(RIGHT, -pitch);
    r.cur.p.copy(tmpA);
    r.cur.q.copy(qYaw).multiply(qPitch);
    if (snap) {
      r.prev.p.copy(r.cur.p);
      r.prev.q.copy(r.cur.q);
    }
    r.body.setNextKinematicTranslation(r.cur.p);
    r.body.setNextKinematicRotation(r.cur.q);
    if (snap) {
      r.body.setTranslation(r.cur.p, false);
      r.body.setRotation(r.cur.q, false);
    }
  }

  private setActive(r: PlaneRoute, on: boolean): void {
    r.active = on;
    r.body.setEnabled(on);
    r.model.group.visible = on;
  }

  fixedUpdate(dt: number): void {
    for (const r of this.routes) {
      if (!r.active) {
        r.wait -= dt;
        if (r.wait <= 0) {
          r.s = 0;
          this.setActive(r, true);
          this.pose(r, true);
        }
        continue;
      }
      const share = Math.min(1, r.s / (r.track.length * cfg.accelDistance));
      r.s += r.def.speed * (cfg.startSpeedShare + (1 - cfg.startSpeedShare) * share) * dt;
      this.pose(r, false);
      this.hitVehicles(r);
      if (r.s > r.track.length + r.model.halfLen + 20) {
        this.setActive(r, false);
        r.wait = r.def.interval;
        r.cycle++;
      }
    }
  }

  update(dt: number, alpha: number): void {
    for (const r of this.routes) {
      if (!r.active) continue;
      const g = r.model.group;
      g.position.lerpVectors(r.prev.p, r.cur.p, alpha);
      g.quaternion.slerpQuaternions(r.prev.q, r.cur.q, alpha);
      for (const sp of r.model.spinners) sp.rotation.z += cfg.spinSpeed * dt;
    }
  }

  private hitVehicles(r: PlaneRoute): void {
    const h = cfg.hit;
    const pos = new THREE.Vector3();
    const l = new THREE.Vector3();
    qi.copy(r.cur.q).invert();
    for (const v of this.world.vehicles) {
      if (!v.alive || this.world.time - (this.hitAt.get(v.id) ?? -1e9) < h.cooldown) continue;
      v.position(pos);
      l.copy(pos).sub(r.cur.p).applyQuaternion(qi);
      const box = r.model.boxes.find((b) => {
        const dx = l.x - b.c[0];
        const dz = l.z - b.c[2];
        const c = Math.cos(b.rotY);
        const s = Math.sin(b.rotY);
        return Math.abs(dx * c - dz * s) <= b.h[0] + h.margin && Math.abs(dx * s + dz * c) <= b.h[2] + h.margin
          && l.y >= b.c[1] - b.h[1] - 1.2 && l.y <= b.c[1] + b.h[1] + h.height;
      });
      if (!box) continue;
      this.hitAt.set(v.id, this.world.time);
      const push = new THREE.Vector3(Math.sign(l.x) || 1, 0, 0).multiplyScalar(1 - h.forwardShare).add(tmpA.set(0, 0, h.forwardShare));
      push.y = h.lift;
      push.applyQuaternion(r.cur.q).normalize().multiplyScalar(v.def.mass * h.impulseSpeed);
      v.body.applyImpulse(push, true);
      this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: h.damage, weapon: 'plane' });
    }
  }

  dispose(): void {
    for (const r of this.routes) this.world.physics.removeRigidBody(r.body);
    this.routes.length = 0;
  }
}

/** Arena qurilishida: har bir marshrut uchun model + kinematik jism (to'qnashuv qutilari) yaratadi. */
export function createPlanes(ctx: BuildContext, defs: PlaneRouteDef[]): PlaneSystem {
  const R = ctx.world.rapier;
  const routes: PlaneRoute[] = defs.map((def) => {
    const model = buildPlane(def.kind, '', 0);
    ctx.root.add(model.group);
    const body = ctx.world.physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    for (const b of model.boxes) {
      ctx.world.physics.createCollider(
        R.ColliderDesc.cuboid(...b.h).setTranslation(...b.c).setRotation({ x: 0, y: Math.sin(b.rotY / 2), z: 0, w: Math.cos(b.rotY / 2) }).setFriction(0.3).setCollisionGroups(WORLD_GROUPS), body);
    }
    const pose = (): Pose => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() });
    const route: PlaneRoute = { def, track: new TrackPath(def.path, ctx.heightAt, cfg.lift), model, body, s: 0, active: false, wait: def.delay, cycle: 0, prev: pose(), cur: pose() };
    body.setEnabled(false);
    model.group.visible = false;
    return route;
  });
  return new PlaneSystem(ctx.world, routes);
}
