import * as THREE from 'three';
import type { GameWorld, System, VehicleHandle } from '../core/types';
import type { BuildContext } from './context';
import { buildSurface, makeZone } from './waterMesh';
import type { WaterSurface, WaterZone } from './waterMesh';
import { dam } from './props/damKit';

const W = dam.water;
const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

interface Wet {
  /** Chuqur suvda ketma-ket o'tgan vaqt, s */
  deep: number;
  /** Keyingi 'damage' eventigacha yig'ilgan vaqt, s */
  acc: number;
}

/**
 * Suv (daryo, ko'l). Mashina suvga kirsa (g'ildirak sathi suv sathidan past):
 *  - sayoz (< `shallow` m): yurish mumkin, tezlik eksponensial pasayadi (`dragWade`);
 *  - chuqurroq: kuchli qarshilik (`dragDeep`) va sekin zarar ('damage', weapon 'water');
 *  - juda chuqur (>= `deep`) `dwell` s davomida bo'lsa: eng yaqin quruq tekis qirg'oqqa qaytariladi (kichik jarima bilan).
 * Suzish/cho'kish yo'q: mashina tubida turadi, faqat sekinlashadi.
 */
export class WaterSystem implements System {
  readonly name = 'water';
  private readonly wet = new Map<string, Wet>();
  /** Test uchun: so'nggi qaytarishlar soni */
  respawns = 0;

  constructor(
    private readonly world: GameWorld,
    readonly zones: WaterZone[],
    private readonly heightAt: (x: number, z: number) => number,
    private readonly surface: WaterSurface | null,
    private readonly half: number,
  ) {}

  /** (x,z) dagi eng chuqur suv chuqurligi, yer sathiga nisbatan (<= 0 — quruq). */
  groundDepth(x: number, z: number): number {
    let d = -Infinity;
    for (const zn of this.zones) if (zn.contains(x, z)) d = Math.max(d, zn.y - this.heightAt(x, z));
    return d;
  }

  /** Mashina g'ildiraklari sathidan suv sathigacha (m); <= 0 — suvda emas. */
  depthFor(x: number, y: number, z: number): number {
    let d = 0;
    for (const zn of this.zones) if (zn.contains(x, z)) d = Math.max(d, zn.y - (y - W.clearance));
    return d;
  }

  private isDryFlat(x: number, z: number): boolean {
    if (Math.abs(x) > this.half - W.search.flat || Math.abs(z) > this.half - W.search.flat) return false;
    if (this.groundDepth(x, z) > -W.dryMargin) return false;
    const h = this.heightAt(x, z);
    const s = W.search.flat;
    for (const [dx, dz] of [[s, 0], [-s, 0], [0, s], [0, -s]] as const) {
      if (Math.abs(this.heightAt(x + dx, z + dz) - h) > W.search.flatMax) return false;
      if (this.groundDepth(x + dx, z + dz) > -W.dryMargin * 0.25) return false;
    }
    return true;
  }

  /** (x,z) ga eng yaqin quruq tekis nuqta (halqalar bo'ylab); topilmasa null. */
  findShore(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 | null {
    const S = W.search;
    for (let r = S.step; r <= S.max; r += S.step) {
      for (let k = 0; k < S.angles; k++) {
        const a = ((k + r * 0.37) / S.angles) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        if (this.isDryFlat(px, pz)) return out.set(px, this.heightAt(px, pz) + S.lift, pz);
      }
    }
    return null;
  }

  fixedUpdate(dt: number): void {
    for (const v of this.world.vehicles) {
      if (!v.alive) {
        this.wet.delete(v.id);
        continue;
      }
      v.position(tmp);
      const depth = this.depthFor(tmp.x, tmp.y, tmp.z);
      if (depth < W.wade) {
        this.wet.delete(v.id);
        continue;
      }
      this.slow(v, depth > W.shallow ? W.dragDeep : W.dragWade, dt);
      const st = this.wet.get(v.id) ?? { deep: 0, acc: 0 };
      this.wet.set(v.id, st);
      if (depth > W.shallow) {
        st.acc += dt;
        if (st.acc >= W.damageEvery) {
          this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: W.damagePerSec * st.acc, weapon: 'water' });
          st.acc = 0;
        }
      }
      st.deep = depth >= W.deep ? st.deep + dt : Math.max(0, st.deep - dt);
      if (st.deep >= W.dwell) this.respawn(v);
    }
  }

  /** Gorizontal tezlikni eksponensial pasaytiradi (vertikal — gravitatsiya uchun o'z holicha). */
  private slow(v: VehicleHandle, drag: number, dt: number): void {
    const f = Math.exp(-drag * dt);
    const lv = v.body.linvel();
    v.body.setLinvel({ x: lv.x * f, y: lv.y, z: lv.z * f }, true);
  }

  private respawn(v: VehicleHandle): void {
    this.wet.delete(v.id);
    v.position(tmp);
    const spot = this.findShore(tmp.x, tmp.z);
    if (!spot) return;
    // Yo'nalish saqlanadi (faqat yaw), qiyalik/aylanish tiklanadi
    const yaw = Math.atan2(v.forward(fwd).x, fwd.z);
    const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    v.body.setTranslation({ x: spot.x, y: spot.y, z: spot.z }, true);
    v.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    v.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    v.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.respawns++;
    this.world.events.emit('damage', { targetId: v.id, sourceId: null, amount: W.respawnDamage, weapon: 'water' });
  }

  update(dt: number): void {
    this.surface?.advance(dt);
  }

  dispose(): void {
    this.surface?.dispose();
    this.wet.clear();
  }
}

/** Arena qurilishida: def.water dagi yuzalar -> mesh + WaterSystem (yo'q bo'lsa null). */
export function createWater(ctx: BuildContext): WaterSystem | null {
  const defs = ctx.def.water;
  if (!defs || defs.length === 0) return null;
  const surface = buildSurface(defs);
  ctx.root.add(surface.group);
  return new WaterSystem(ctx.world, defs.map(makeZone), ctx.heightAt, surface, ctx.def.size / 2);
}
