import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameEvents, GameWorld, PickupKind, System } from '../core/types';
import { registerHitTarget } from '../core/hitTargets';
import type { BuildContext } from './context';
import type { TrainDef } from './types';
import { TrackPath } from './trackPath';
import { buildRails } from './props/rails';
import { WORLD_GROUPS } from './props/common';
import type { Vec3 } from './props/common';
import { buildCar } from './trainModel';
import type { CarKind, CarModel } from './trainModel';
import cfg from '../../data/levels/train.json';

/** Kollayder korpusi g'ildirak ustida boshlanadi (m) */
const BASE = 0.45;

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
}

export interface Car {
  id: string;
  kind: CarKind;
  size: Vec3;
  /** Poyezd boshidan shu vagon markazigacha masofa, m */
  offset: number;
  hp: number;
  dead: boolean;
  invulnerable: boolean;
  body: RAPIER.RigidBody;
  model: CarModel;
  prev: Pose;
  cur: Pose;
}

const up = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const qi = new THREE.Quaternion();
const basis = new THREE.Matrix4();

/**
 * Temir yo'l poyezdi: lokomotiv (yo'q qilinmaydi) + vagonlar, kinematik Rapier jismlari (kinematicPositionBased).
 * Iz bo'ylab o'tadi, oxirgi vagon chiqqach `respawnDelay` dan keyin yangi tsikl (vagonlar tiklanadi).
 * Vagonlar HP li: 'explosion' (vagon qutisigacha masofa bo'yicha) va 'damage' (targetId = vagon id) dan shikastlanadi;
 * HP 0 -> vayrona + o'z 'explosion' + 1-2 sandiq (onDrop). Mashinaga tegsa 'damage' weapon:'train' + impuls.
 */
export class TrainSystem implements System {
  readonly name = 'train';
  readonly cars: Car[] = [];
  /** Lokomotiv old uchining iz boshidan masofasi, m */
  headS: number;
  cycle = 0;
  waiting = 0;
  private readonly total: number;
  private readonly hitAt = new Map<string, number>();
  private readonly off: Array<() => void>;

  constructor(
    private readonly world: GameWorld,
    private readonly def: TrainDef,
    readonly track: TrackPath,
    private readonly heightAt: (x: number, z: number) => number,
    root: THREE.Object3D,
    private readonly onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void,
  ) {
    const kinds = cfg.kinds as CarKind[];
    const lw = cfg.loco.size as Vec3;
    const ww = cfg.wagon.size as Vec3;
    let off = lw[2] / 2;
    this.cars.push(this.makeCar('loco', 'loco', lw, off, root));
    off += lw[2] / 2 + cfg.gap;
    for (let i = 0; i < def.wagons; i++) {
      this.cars.push(this.makeCar(`wagon-${i + 1}`, kinds[i % kinds.length]!, ww, off + ww[2] / 2, root));
      off += ww[2] + cfg.gap;
    }
    this.total = off - cfg.gap;
    this.headS = def.startProgress * track.length;
    this.poseAll(true);
    this.off = [
      world.events.on('explosion', (e) => this.onExplosion(e)),
      world.events.on('damage', (e) => {
        const c = this.cars.find((x) => x.id === e.targetId);
        if (c) this.hurt(c, e.amount);
      }),
    ];
  }

  private makeCar(id: string, kind: CarKind, size: Vec3, offset: number, root: THREE.Object3D): Car {
    const R = this.world.rapier;
    const body = this.world.physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    const hh = (size[1] - BASE) / 2;
    const collider = this.world.physics.createCollider(
      R.ColliderDesc.cuboid(size[0] / 2, hh, size[2] / 2).setTranslation(0, BASE + hh, 0).setFriction(0.3).setCollisionGroups(WORLD_GROUPS), body);
    const model = buildCar(kind, size);
    root.add(model.group);
    const pose = (): Pose => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() });
    const car: Car = { id, kind, size, offset, hp: this.def.wagonHp, dead: false, invulnerable: kind === 'loco', body, model, prev: pose(), cur: pose() };
    if (!car.invulnerable) {
      registerHitTarget(this.world, collider.handle, {
        id, damage: (amount, _src, weapon) => this.hurt(car, weapon === 'mg' ? amount * cfg.mgScale : amount),
      });
    }
    return car;
  }

  isDestroyed(id: string): boolean {
    return this.cars.find((c) => c.id === id)?.dead ?? false;
  }

  hpOf(id: string): number {
    return this.cars.find((c) => c.id === id)?.hp ?? 0;
  }

  /** Vagon markazining dunyo pozitsiyasi (test/HUD uchun) */
  carPos(id: string): THREE.Vector3 {
    return this.cars.find((c) => c.id === id)!.cur.p.clone();
  }

  /** Vagon pozitsiyasi/yo'nalishini iz bo'yicha hisoblaydi: 2 ta aravacha nuqtasidan. */
  private poseAll(snap: boolean): void {
    for (const c of this.cars) {
      const center = this.headS - c.offset;
      const half = c.size[2] * 0.3;
      this.track.at(center + half, tmpA);
      this.track.at(center - half, tmpB);
      c.prev.p.copy(c.cur.p);
      c.prev.q.copy(c.cur.q);
      c.cur.p.addVectors(tmpA, tmpB).multiplyScalar(0.5);
      const fwd = tmpA.sub(tmpB).normalize();
      const side = tmpB.crossVectors(up, fwd).normalize();
      c.cur.q.setFromRotationMatrix(basis.makeBasis(side, new THREE.Vector3().crossVectors(fwd, side), fwd));
      if (snap) {
        c.prev.p.copy(c.cur.p);
        c.prev.q.copy(c.cur.q);
      }
      c.body.setNextKinematicTranslation(c.cur.p);
      c.body.setNextKinematicRotation(c.cur.q);
      if (snap) {
        c.body.setTranslation(c.cur.p, false);
        c.body.setRotation(c.cur.q, false);
      }
    }
  }

  fixedUpdate(dt: number): void {
    if (this.waiting > 0) {
      this.waiting -= dt;
      if (this.waiting <= 0) this.respawn();
      return;
    }
    this.headS += this.def.speed * dt;
    this.poseAll(false);
    this.hitVehicles();
    if (this.headS - this.total > this.track.length) this.finishCycle();
  }

  update(_dt: number, alpha: number): void {
    for (const c of this.cars) {
      const g = c.model.group;
      g.position.lerpVectors(c.prev.p, c.cur.p, alpha);
      g.quaternion.slerpQuaternions(c.prev.q, c.cur.q, alpha);
    }
  }

  private setActive(on: boolean): void {
    for (const c of this.cars) {
      c.body.setEnabled(on);
      c.model.group.visible = on;
    }
  }

  private finishCycle(): void {
    this.waiting = this.def.respawnDelay;
    this.setActive(false);
  }

  private respawn(): void {
    this.cycle++;
    this.headS = 0;
    for (const c of this.cars) {
      c.hp = this.def.wagonHp;
      c.dead = false;
      c.model.intact.visible = true;
      c.model.wreck.visible = false;
    }
    this.setActive(true);
    this.poseAll(true);
    this.hitAt.clear();
  }

  /** Nuqtani vagon lokal koordinatasiga o'tkazadi (y — izdan balandlik). */
  private local(c: Car, p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    qi.copy(c.cur.q).invert();
    return out.copy(p).sub(c.cur.p).applyQuaternion(qi);
  }

  private hitVehicles(): void {
    const h = cfg.hit;
    const pos = new THREE.Vector3();
    const l = new THREE.Vector3();
    for (const v of this.world.vehicles) {
      if (!v.alive || this.world.time - (this.hitAt.get(v.id) ?? -1e9) < h.cooldown) continue;
      v.position(pos);
      for (const c of this.cars) {
        this.local(c, pos, l);
        if (Math.abs(l.x) > c.size[0] / 2 + h.margin || Math.abs(l.z) > c.size[2] / 2 + h.margin) continue;
        if (l.y < -1.2 || l.y > c.size[1] + h.height) continue;
        this.hitAt.set(v.id, this.world.time);
        const push = new THREE.Vector3(Math.sign(l.x) || 1, 0, 0).multiplyScalar(1 - h.forwardShare).add(tmpA.set(0, 0, h.forwardShare));
        push.y = h.lift;
        push.applyQuaternion(c.cur.q).normalize().multiplyScalar(v.def.mass * h.impulseSpeed);
        v.body.applyImpulse(push, true);
        this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: h.damage, weapon: 'train' });
        break;
      }
    }
  }

  private onExplosion(e: GameEvents['explosion']): void {
    if (e.damage <= 0 || this.waiting > 0 || e.sourceId?.startsWith('wagon-')) return;
    const l = new THREE.Vector3();
    for (const c of this.cars) {
      if (c.dead || c.invulnerable) continue;
      this.local(c, e.pos, l);
      const [w, h, len] = c.size;
      const dx = Math.max(0, Math.abs(l.x) - w / 2);
      const dy = Math.max(0, Math.abs(l.y - h / 2) - h / 2);
      const dz = Math.max(0, Math.abs(l.z) - len / 2);
      const d = Math.hypot(dx, dy, dz);
      if (d < e.radius) this.hurt(c, e.damage * (1 - d / e.radius));
    }
  }

  private hurt(c: Car, amount: number): void {
    if (c.dead || c.invulnerable || amount <= 0 || this.waiting > 0) return;
    c.hp -= amount;
    if (c.hp <= 0) this.destroy(c);
  }

  private destroy(c: Car): void {
    c.dead = true;
    c.hp = 0;
    c.model.intact.visible = false;
    c.model.wreck.visible = true;
    const center = c.cur.p.clone();
    center.y += c.size[1] / 2;
    const d = cfg.drop;
    const n = d.min + ((this.cycle + this.cars.indexOf(c)) % (d.max - d.min + 1));
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(c.cur.q);
    for (let k = 0; k < n; k++) {
      const s = k % 2 === 0 ? 1 : -1;
      const at = c.cur.p.clone().addScaledVector(side, s * d.sideOffset);
      at.y = this.heightAt(at.x, at.z) + d.lift;
      this.onDrop?.(at, d.kinds[(this.cars.indexOf(c) + this.cycle * 3 + k) % d.kinds.length] as PickupKind);
    }
    this.world.events.emit('explosion', { pos: center, radius: cfg.explosion.radius, damage: cfg.explosion.damage, sourceId: c.id });
  }

  dispose(): void {
    for (const o of this.off) o();
    for (const c of this.cars) this.world.physics.removeRigidBody(c.body);
    this.cars.length = 0;
  }
}

/** Arena qurilishida: iz (rels) + poyezd tizimini yaratadi. */
export function createTrain(ctx: BuildContext, def: TrainDef, onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void): TrainSystem {
  const track = new TrackPath(def.path, ctx.heightAt, cfg.railLift);
  const rails = buildRails(track);
  ctx.root.add(rails);
  ctx.onDispose(() => rails.children.forEach((m) => (m as THREE.InstancedMesh).dispose()));
  return new TrainSystem(ctx.world, def, track, ctx.heightAt, ctx.root, onDrop);
}
