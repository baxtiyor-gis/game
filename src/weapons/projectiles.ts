import * as THREE from 'three';
import type { GameWorld, System, VehicleHandle, WeaponId } from '../core/types';
import { detonate } from './impact';
import { tuning, weaponDef } from './params';
import { ProjectileView } from './projectileView';
import { castSegment } from './raycast';

export interface SpawnOpts {
  weapon: WeaponId;
  owner: VehicleHandle;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  gravity?: boolean;
  /** effektiv burilish tezligi (rad/s) — homing qiymati allaqachon avoidance bilan susaytirilgan */
  homing?: { target: VehicleHandle; rate: number };
  mine?: boolean;
}

class Projectile {
  active = false;
  weapon: WeaponId = 'rocket';
  owner!: VehicleHandle;
  readonly pos = new THREE.Vector3();
  readonly prev = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  life = 0;
  age = 0;
  gravity = false;
  homing: { target: VehicleHandle; rate: number } | null = null;
  mine = false;
  landed = false;
}

const dir = new THREE.Vector3();
const want = new THREE.Vector3();
const axis = new THREE.Vector3();
const hitPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
const render = new THREE.Vector3();

/** Snaryadlar pooli: 60 Hz harakat, Rapier ray bilan to'qnashuv, InstancedMesh render. */
export class ProjectileSystem implements System {
  readonly name = 'projectiles';
  private readonly pool: Projectile[];
  private readonly view: ProjectileView;

  constructor(private readonly world: GameWorld) {
    const max = tuning.projectiles.max;
    this.pool = Array.from({ length: max }, () => new Projectile());
    this.view = new ProjectileView(world.scene, max);
  }

  get activeCount(): number {
    return this.pool.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  spawn(o: SpawnOpts): boolean {
    const p = this.pool.find((x) => !x.active);
    if (!p) return false;
    p.active = true;
    p.weapon = o.weapon;
    p.owner = o.owner;
    p.pos.copy(o.pos);
    p.prev.copy(o.pos);
    p.vel.copy(o.vel);
    p.life = weaponDef(o.weapon).lifetime;
    p.age = 0;
    p.gravity = o.gravity ?? false;
    p.homing = o.homing ?? null;
    p.mine = o.mine ?? false;
    p.landed = false;
    return true;
  }

  fixedUpdate(dt: number): void {
    for (const p of this.pool) if (p.active) this.step(p, dt);
  }

  update(_dt: number, alpha: number): void {
    this.view.begin();
    for (const p of this.pool) {
      if (!p.active) continue;
      render.lerpVectors(p.prev, p.pos, alpha);
      const moving = p.vel.lengthSq() > 1e-6;
      this.view.add(p.weapon, render, moving && !p.mine ? tmp.copy(p.vel).normalize() : null);
    }
    this.view.end();
  }

  dispose(): void {
    this.view.dispose();
  }

  private step(p: Projectile, dt: number): void {
    p.age += dt;
    p.life -= dt;
    if (p.life <= 0) return this.explode(p, null);
    if (p.landed) return this.checkMine(p);
    p.prev.copy(p.pos);
    if (p.homing) this.steer(p, dt);
    if (p.gravity) p.vel.y += this.world.physics.gravity.y * dt;
    const speed = p.vel.length();
    const len = speed * dt;
    if (len < 1e-6) return;
    dir.copy(p.vel).divideScalar(speed);
    const hit = castSegment(this.world, p.pos, dir, len, p.owner.body);
    if (!hit) {
      p.pos.addScaledVector(dir, len);
      return;
    }
    hitPos.copy(p.pos).addScaledVector(dir, hit.t);
    if (p.mine && !hit.vehicle) {
      p.pos.copy(hitPos).y += tuning.mine.restHeight;
      p.prev.copy(p.pos);
      p.vel.set(0, 0, 0);
      p.landed = true;
      return;
    }
    p.pos.copy(hitPos);
    this.explode(p, hit.vehicle);
  }

  /** Burchak bo'yicha cheklangan burilish; avoidance allaqachon rate ga kiritilgan. */
  private steer(p: Projectile, dt: number): void {
    const h = p.homing!;
    if (!h.target.alive) {
      p.homing = null;
      return;
    }
    const speed = p.vel.length();
    dir.copy(p.vel).divideScalar(speed);
    want.copy(h.target.position(tmp)).sub(p.pos).normalize();
    const angle = Math.min(dir.angleTo(want), h.rate * dt);
    axis.crossVectors(dir, want);
    if (axis.lengthSq() < 1e-10) return;
    dir.applyAxisAngle(axis.normalize(), angle);
    p.vel.copy(dir).multiplyScalar(speed);
  }

  private checkMine(p: Projectile): void {
    const r = tuning.mine.triggerRadius;
    for (const v of this.world.vehicles) {
      if (!v.alive || (v === p.owner && p.age < tuning.mine.armDelay)) continue;
      if (v.position(tmp).distanceTo(p.pos) < r) return this.explode(p, null);
    }
  }

  private explode(p: Projectile, hit: VehicleHandle | null): void {
    p.active = false;
    const def = weaponDef(p.weapon);
    const d = p.vel.lengthSq() > 1e-6 ? tmp.copy(p.vel).normalize() : tmp.set(0, 1, 0);
    detonate(this.world, {
      weapon: p.weapon, sourceId: p.owner.id, pos: p.pos, dir: d, damage: def.damage,
      splash: def.splashRadius, knockback: def.knockback ?? 0, hit,
    });
  }
}
