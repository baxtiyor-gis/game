import * as THREE from 'three';
import type { GameEvents, GameWorld, System, VehicleHandle } from '../core/types';
import cfgJson from '../../data/render.json';
import { ParticlePool, makeStyle, type ParticleStyle, type StyleJson } from './particlePool';
import { PointsLayer } from './pointsLayer';

const cfg = cfgJson.vfx;
const S = cfgJson.styles as Record<string, StyleJson>;
const style = (k: string): ParticleStyle => makeStyle(S[k]!);
const ST = {
  fire: style('fire'), flash: style('flash'), spark: style('spark'),
  smokeDark: style('smokeDark'), smokeWhite: style('smokeWhite'), muzzle: style('muzzle'),
} as Record<string, ParticleStyle>;

interface StageCfg { smoke: string; rate: number; fire: number }
const STAGES = cfg.damage.stages as Record<string, StageCfg | undefined>;
const MUZZLE_SCALE = cfg.muzzle.weaponScale as Record<string, number | undefined>;

/** Portlash, tutun, uchqun, dulo chaqnashi. Zarralar pooli: olov (additive) + tutun (normal). */
export class VfxSystem implements System {
  readonly name = 'vfx';
  readonly fire = new ParticlePool(cfg.maxFire);
  readonly smoke = new ParticlePool(cfg.maxSmoke);
  private readonly layers: PointsLayer[];
  private readonly offs: Array<() => void> = [];
  private readonly acc = new Map<string, { smoke: number; fire: number }>();
  private readonly p = new THREE.Vector3();
  private readonly f = new THREE.Vector3();

  constructor(
    private readonly world: GameWorld,
    private readonly rng: () => number = Math.random,
  ) {
    this.layers = [new PointsLayer(this.fire, true, cfg.fireGlow), new PointsLayer(this.smoke, false)];
    for (const l of this.layers) world.scene.add(l.points);
    const ev = world.events;
    this.offs.push(ev.on('explosion', (e) => this.explode(e.pos, e.radius)));
    this.offs.push(ev.on('fire', (e) => this.muzzle(e)));
    this.offs.push(
      ev.on('destroyed', (e) => {
        const v = this.world.vehicles.find((x) => x.id === e.targetId);
        if (v) this.explode(v.position(this.p), cfg.destroyedRadius);
      }),
    );
  }

  private dir(out: [number, number, number]): void {
    const r = this.rng;
    const z = r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    out[0] = s * Math.cos(a); out[1] = z; out[2] = s * Math.sin(a);
  }

  private readonly d: [number, number, number] = [0, 0, 0];

  private burst(
    pool: ParticlePool, pos: THREE.Vector3, n: number, speed: number,
    st: ParticleStyle, sizeScale: number, lift: number,
  ): void {
    const d = this.d;
    for (let i = 0; i < n; i++) {
      this.dir(d);
      const sp = speed * (0.4 + this.rng() * 0.6);
      pool.spawn(
        pos.x, pos.y, pos.z, d[0] * sp, Math.abs(d[1]) * sp + lift, d[2] * sp,
        st, sizeScale * (0.7 + this.rng() * 0.6), 0.7 + this.rng() * 0.6,
      );
    }
  }

  /** Radiusga mos olovli shar + tutun + uchqunlar. */
  explode(pos: THREE.Vector3, radius: number): void {
    const e = cfg.explosion;
    this.fire.spawn(pos.x, pos.y, pos.z, 0, 0, 0, ST.flash!, e.flash.sizePerRadius * radius);
    this.burst(this.fire, pos, Math.ceil(e.fireball.perRadius * radius), e.fireball.speedPerRadius * radius, ST.fire!, e.fireball.sizePerRadius * radius, e.lift * radius);
    this.burst(this.smoke, pos, Math.ceil(e.smoke.perRadius * radius), e.smoke.speedPerRadius * radius, ST.smokeDark!, e.smoke.sizePerRadius * radius, e.lift * radius);
    this.burst(this.fire, pos, Math.ceil(e.sparks.perRadius * radius), e.sparks.speedPerRadius * radius, ST.spark!, e.sparks.sizePerRadius * radius, e.lift * radius);
  }

  private muzzle(e: GameEvents['fire']): void {
    const v = this.world.vehicles.find((x) => x.id === e.sourceId);
    if (!v) return;
    const m = cfg.muzzle;
    const k = MUZZLE_SCALE[e.weapon] ?? m.defaultScale;
    v.position(this.p);
    v.forward(this.f);
    const [, h, len] = v.def.size;
    this.p.addScaledVector(this.f, len * m.forwardFrac);
    this.p.y += h * m.heightFrac;
    const d = this.d;
    for (let i = 0; i < m.count; i++) {
      this.dir(d);
      const sp = m.speed * k * this.rng();
      this.fire.spawn(
        this.p.x, this.p.y, this.p.z,
        this.f.x * sp + d[0] * sp * 0.3, this.f.y * sp + d[1] * sp * 0.3, this.f.z * sp + d[2] * sp * 0.3,
        ST.muzzle!, m.size * k,
      );
    }
  }

  private damageSmoke(v: VehicleHandle, dt: number): void {
    const stage = (v.object.userData.damageStage as number | undefined) ?? 0;
    const sc = STAGES[String(stage)];
    if (!sc) return;
    const dm = cfg.damage;
    let a = this.acc.get(v.id);
    if (!a) this.acc.set(v.id, (a = { smoke: 0, fire: 0 }));
    a.smoke += sc.rate * dt;
    a.fire += sc.fire * dt;
    v.position(this.p);
    v.forward(this.f);
    const [, h, len] = v.def.size;
    this.p.addScaledVector(this.f, len * dm.forwardFrac);
    this.p.y += h * dm.heightFrac;
    const r = this.rng;
    for (; a.smoke >= 1; a.smoke--) {
      this.smoke.spawn(
        this.p.x + (r() - 0.5) * dm.spread, this.p.y, this.p.z + (r() - 0.5) * dm.spread,
        (r() - 0.5) * dm.spread, dm.riseSpeed * (0.7 + r() * 0.6), (r() - 0.5) * dm.spread,
        ST[sc.smoke]!, dm.size, 0.8 + r() * 0.4,
      );
    }
    for (; a.fire >= 1; a.fire--) {
      this.fire.spawn(
        this.p.x + (r() - 0.5) * dm.spread, this.p.y, this.p.z + (r() - 0.5) * dm.spread,
        (r() - 0.5) * dm.spread, dm.riseSpeed * (0.5 + r() * 0.5), (r() - 0.5) * dm.spread,
        ST.fire!, dm.size * 0.6,
      );
    }
  }

  update(dt: number): void {
    const step = Math.min(dt, cfg.maxDt);
    for (const v of this.world.vehicles) this.damageSmoke(v, step);
    this.fire.update(step);
    this.smoke.update(step);
    for (const l of this.layers) l.sync();
  }

  dispose(): void {
    for (const off of this.offs) off();
    for (const l of this.layers) {
      this.world.scene.remove(l.points);
      l.dispose();
    }
  }
}
