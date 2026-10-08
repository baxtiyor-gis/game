import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameWorld, System } from '../core/types';
import { registerHitTarget, unregisterHitTarget } from '../core/hitTargets';
import type { BuildContext } from './context';
import { rng } from './boundary';
import { createLaunchPad, createTerminal } from './props/launchPad';
import { createRocket, PARK_Y, TargetMark, Trail } from './props/rocket';
import type { RocketModel } from './props/rocket';
import { base } from './props/baseKit';

const L = base.launch;
const UP = new THREE.Vector3(0, 1, 0);

export type LaunchPhase = 'idle' | 'warn' | 'flight' | 'cool';

export interface LaunchRig {
  id: string;
  /** Terminal asosi (dunyo), plita markazi va old yo'nalish burchagi */
  terminal: THREE.Vector3;
  plate: THREE.Vector2;
  yaw: number;
  /** Raketa dumi turadigan nuqta */
  pad: THREE.Vector3;
  phase: LaunchPhase;
  /** Faza ichida o'tgan vaqt, s */
  t: number;
  /** Oxirgi ishga tushirishdan beri o'tgan vaqt, s (sovutish shu bo'yicha) */
  since: number;
  /** Ishga tushirgan mashina id si (portlash manbasi); yo'q bo'lsa null */
  source: string | null;
  target: THREE.Vector3;
  ctrl: THREE.Vector3;
  launches: number;
  collider: RAPIER.Collider;
  rocket: RocketModel;
  trail: Trail;
  mark: TargetMark;
  beacon: THREE.Mesh;
  markT: number;
  prevP: THREE.Vector3;
  curP: THREE.Vector3;
  prevQ: THREE.Quaternion;
  curQ: THREE.Quaternion;
  rand: () => number;
}

const tmp = new THREE.Vector3();
const tan = new THREE.Vector3();

/**
 * Uchirish maydonchasi (asl o'yindagi kabi): terminalni otsangiz yoki plitasi ustidan o'tsangiz `warn` s sirena + qizil belgi,
 * so'ng raketa uchadi va tanlangan nuqtaga (yaqin raqib yoki tasodifiy) 'explosion' (manba — ishga tushirgan mashina) bilan tushadi.
 * Qayta ishga tushirish: `cooldown` s (ishga tushirishdan hisoblanadi).
 */
export class LaunchSystem implements System {
  readonly name = 'launch';
  private readonly off: Array<() => void> = [];

  constructor(
    private readonly world: GameWorld,
    readonly rigs: LaunchRig[],
    private readonly heightAt: (x: number, z: number) => number,
    private readonly half: number,
  ) {
    this.off.push(world.events.on('damage', (e) => {
      const r = rigs.find((x) => x.id === e.targetId);
      if (r && e.amount > 0) this.trigger(r, e.sourceId);
    }));
    this.off.push(world.events.on('explosion', (e) => {
      if (e.damage <= 0 || !e.sourceId || !world.vehicles.some((v) => v.id === e.sourceId)) return;
      for (const r of rigs) {
        if (r.phase === 'idle' && e.pos.distanceTo(r.terminal) <= e.radius + L.terminal.hitRadius) this.trigger(r, e.sourceId);
      }
    }));
    for (const r of rigs) {
      registerHitTarget(world, r.collider.handle, { id: r.id, damage: (amount, src) => amount > 0 && this.trigger(r, src) });
      this.park(r);
    }
  }

  /** Ishga tushirish: faqat `idle` fazada. Manba — mavjud mashina id si, aks holda null. */
  trigger(r: LaunchRig, sourceId: string | null): boolean {
    if (r.phase !== 'idle') return false;
    r.source = sourceId && this.world.vehicles.some((v) => v.id === sourceId) ? sourceId : null;
    r.phase = 'warn';
    r.t = 0;
    r.since = 0;
    r.markT = 0;
    this.pickTarget(r);
    r.mark.show(r.target.x, r.target.y, r.target.z, L.explosion.radius);
    this.world.events.emit('fire', { sourceId: r.id, weapon: 'siren' });
    return true;
  }

  private pickTarget(r: LaunchRig): void {
    const src = this.world.vehicles.find((v) => v.id === r.source);
    const from = src ? src.position(tmp.set(0, 0, 0)).clone() : r.terminal.clone();
    let best: THREE.Vector3 | null = null;
    let bestD = L.target.maxRange;
    const p = new THREE.Vector3();
    for (const v of this.world.vehicles) {
      if (!v.alive || v.id === r.source) continue;
      v.position(p);
      const d = Math.hypot(p.x - from.x, p.z - from.z);
      if (d < bestD && Math.hypot(p.x - r.pad.x, p.z - r.pad.z) >= L.target.minPadDist) {
        bestD = d;
        best = p.clone();
      }
    }
    if (!best) {
      const span = this.half - L.target.margin;
      best = new THREE.Vector3();
      for (let i = 0; i < 8; i++) {
        best.set((r.rand() * 2 - 1) * span, 0, (r.rand() * 2 - 1) * span);
        if (Math.hypot(best.x - r.pad.x, best.z - r.pad.z) >= L.target.minPadDist) break;
      }
    }
    r.target.set(best.x, this.heightAt(best.x, best.z), best.z);
    // Kvadratik Bezier boshqaruv nuqtasi: cho'qqi `apex` m balandlikda
    r.ctrl.set((r.pad.x + r.target.x) / 2, 2 * L.apex - (r.pad.y + r.target.y) / 2, (r.pad.z + r.target.z) / 2);
  }

  private park(r: LaunchRig): void {
    r.rocket.group.position.set(r.pad.x, r.pad.y, r.pad.z);
    r.rocket.group.quaternion.identity();
    r.curP.copy(r.pad);
    r.prevP.copy(r.pad);
    r.curQ.identity();
    r.prevQ.identity();
    r.rocket.flame.scale.y = 0.0001;
  }

  /** Bezier nuqtasi (s: 0..1) va yo'nalishi */
  private bezier(r: LaunchRig, s: number, out: THREE.Vector3, dir: THREE.Vector3): void {
    const a = (1 - s) * (1 - s);
    const b = 2 * (1 - s) * s;
    const c = s * s;
    out.set(0, 0, 0).addScaledVector(r.pad, a).addScaledVector(r.ctrl, b).addScaledVector(r.target, c);
    dir.set(0, 0, 0).addScaledVector(tmp.subVectors(r.ctrl, r.pad), 2 * (1 - s)).addScaledVector(tan.subVectors(r.target, r.ctrl), 2 * s).normalize();
  }

  private impact(r: LaunchRig): void {
    const pos = r.target.clone();
    pos.y += 1;
    const ex = L.explosion;
    this.world.events.emit('explosion', { pos, radius: ex.radius, damage: ex.damage, sourceId: r.source });
    this.world.events.emit('shake', { pos: pos.clone(), radius: ex.shake });
    r.phase = 'cool';
    r.mark.hide();
    r.curP.set(r.pad.x, PARK_Y, r.pad.z);
    r.prevP.copy(r.curP);
  }

  private onPlate(r: LaunchRig): string | null {
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    for (const v of this.world.vehicles) {
      if (!v.alive) continue;
      v.position(tmp);
      const dx = tmp.x - r.plate.x;
      const dz = tmp.z - r.plate.y;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      if (Math.abs(lx) <= L.terminal.plateHalf && Math.abs(lz) <= L.terminal.plateHalf && tmp.y < r.terminal.y + 3) return v.id;
    }
    return null;
  }

  fixedUpdate(dt: number): void {
    for (const r of this.rigs) {
      if (r.phase !== 'idle') r.since += dt;
      r.prevP.copy(r.curP);
      r.prevQ.copy(r.curQ);
      switch (r.phase) {
        case 'idle': {
          const who = this.onPlate(r);
          if (who) this.trigger(r, who);
          break;
        }
        case 'warn':
          r.t += dt;
          if (r.t >= L.warn) {
            r.phase = 'flight';
            r.t = 0;
            r.launches++;
            this.world.events.emit('fire', { sourceId: r.id, weapon: 'rocket' });
          }
          break;
        case 'flight': {
          r.t += dt;
          const u = Math.min(1, r.t / L.flightTime);
          this.bezier(r, Math.pow(u, L.ease), r.curP, tan);
          r.curQ.setFromUnitVectors(UP, tan);
          if (u >= 1) this.impact(r);
          break;
        }
        default:
          if (r.since >= L.cooldown) {
            r.phase = 'idle';
            r.t = 0;
            this.park(r);
          }
      }
    }
  }

  update(dt: number, alpha: number): void {
    for (const r of this.rigs) {
      const g = r.rocket.group;
      if (r.phase === 'flight' || (r.phase === 'cool' && r.curP.y > PARK_Y + 1)) {
        g.position.lerpVectors(r.prevP, r.curP, alpha);
        g.quaternion.slerpQuaternions(r.prevQ, r.curQ, alpha);
        r.rocket.flame.scale.y = L.rocket.flameLen * (0.8 + 0.4 * Math.random());
        r.trail.step(dt, r.phase === 'flight' ? g.position : null);
      } else {
        r.trail.step(dt, null);
        if (r.phase === 'cool') {
          g.position.y = PARK_Y;
        } else {
          g.position.copy(r.pad);
          g.quaternion.identity();
          const ignite = r.phase === 'warn' ? Math.max(0, r.t - (L.warn - 0.5)) / 0.5 : 0;
          r.rocket.flame.scale.y = Math.max(0.0001, ignite * L.rocket.flameLen * (0.6 + 0.4 * Math.random()));
          g.position.x += (Math.random() - 0.5) * 0.12 * ignite;
        }
      }
      const m = r.beacon.material as THREE.MeshStandardMaterial;
      if (r.phase === 'warn') {
        r.markT += dt;
        r.mark.animate(r.markT);
        m.emissiveIntensity = Math.sin(r.markT * L.beacon.blink * Math.PI) > 0 ? 3.4 : 0.3;
      } else if (r.phase === 'flight') {
        r.markT += dt;
        r.mark.animate(r.markT);
        m.emissiveIntensity = 3.4;
      } else {
        m.emissiveIntensity = L.beacon.idle;
      }
    }
  }

  dispose(): void {
    for (const o of this.off) o();
    for (const r of this.rigs) {
      unregisterHitTarget(this.world, r.collider.handle);
      r.trail.dispose();
      r.mark.dispose();
      (r.beacon.material as THREE.Material).dispose();
    }
    this.rigs.length = 0;
  }
}

/** Arena qurilishida: interactives dagi 'launchSite' lar (maydoncha + terminal statik, raketa/belgi/maayoq dinamik). */
export function createLaunchSites(ctx: BuildContext): LaunchSystem | null {
  const R = ctx.world.rapier;
  const rigs: LaunchRig[] = [];
  for (const def of ctx.def.interactives) {
    if (def.type !== 'launchSite') continue;
    const [tx, tz] = def.pos;
    const [px, pz] = def.pad ?? [tx + 20, tz - 20];
    const yaw = def.yaw ?? 0;
    const ty = ctx.heightAt(tx, tz);
    const py = ctx.heightAt(px, pz);
    const pad = createLaunchPad(R, { x: px, y: py, z: pz, yaw: 0 });
    const term = createTerminal(R, { x: tx, y: ty, z: tz, yaw });
    ctx.statics.push(pad.object, term.object);
    for (const c of pad.colliders) ctx.addCollider(c);
    const collider = ctx.addCollider(term.colliders[0]!);
    const rocket = createRocket();
    const trail = new Trail();
    const mark = new TargetMark();
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.5, emissive: new THREE.Color('#ff3322'), emissiveIntensity: L.beacon.idle, toneMapped: false }),
    );
    beacon.position.set(tx, ty + L.terminal.h + 0.9, tz);
    ctx.root.add(rocket.group, trail.group, mark.group, beacon);
    ctx.onDispose(() => beacon.geometry.dispose());
    const off = L.terminal.plateOffset;
    rigs.push({
      id: `launch-${rigs.length + 1}`, terminal: new THREE.Vector3(tx, ty, tz), plate: new THREE.Vector2(tx + Math.sin(yaw) * off, tz + Math.cos(yaw) * off), yaw,
      pad: new THREE.Vector3(px, py + 0.2, pz), phase: 'idle', t: 0, since: 0, source: null, target: new THREE.Vector3(), ctrl: new THREE.Vector3(), launches: 0,
      collider, rocket, trail, mark, beacon, markT: 0, prevP: new THREE.Vector3(), curP: new THREE.Vector3(), prevQ: new THREE.Quaternion(), curQ: new THREE.Quaternion(),
      rand: rng(ctx.def.terrain.seed ^ (0x5bd1e995 + rigs.length)),
    });
  }
  return rigs.length > 0 ? new LaunchSystem(ctx.world, rigs, ctx.heightAt, ctx.def.size / 2) : null;
}
