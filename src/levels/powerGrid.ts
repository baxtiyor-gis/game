import * as THREE from 'three';
import type { GameEvents, GameWorld, System } from '../core/types';
import type { BuildContext } from './context';
import { dam } from './props/damKit';

const G = dam.grid;
const tmp = new THREE.Vector3();
const HIDDEN = -1000;

/**
 * Elektr tarmog'i: transformator portlaganda ('explosion', manba — transformator id si) radius ichidagi
 * mashinalar dvigateli `stall` s o'chadi (VehicleHandle.stalled + 'status' eventi). Vizual: uchqunlar (Points) va
 * yorqin zig-zag yoylar (LineSegments), ikkalasi ham bitta ob'ekt/geometriya, har kadr yangilanadi.
 */
export class PowerGridSystem implements System {
  readonly name = 'powerGrid';
  private readonly off: Array<() => void>;
  private readonly sparks: THREE.Points;
  private readonly arcs: THREE.LineSegments;
  private readonly pos = new Float32Array(G.pool * 3);
  private readonly vel = new Float32Array(G.pool * 3);
  private readonly life = new Float32Array(G.pool);
  private readonly arcPos = new Float32Array(G.arcs * G.arcSegs * 6);
  private readonly arcOrigin: THREE.Vector3[] = Array.from({ length: G.arcs }, () => new THREE.Vector3());
  private readonly arcLife = new Float32Array(G.arcs);
  private nextSpark = 0;
  private nextArc = 0;
  /** Test/HUD uchun: shu paytgacha o'chirilgan mashinalar soni */
  stalls = 0;

  constructor(private readonly world: GameWorld, private readonly ids: ReadonlySet<string>, parent: THREE.Object3D) {
    this.pos.fill(HIDDEN);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({
      color: G.color, size: G.sparkSize, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.sparks.frustumCulled = false;
    const ag = new THREE.BufferGeometry();
    this.arcPos.fill(HIDDEN);
    ag.setAttribute('position', new THREE.BufferAttribute(this.arcPos, 3));
    this.arcs = new THREE.LineSegments(ag, new THREE.LineBasicMaterial({ color: G.color, toneMapped: false }));
    this.arcs.frustumCulled = false;
    parent.add(this.sparks, this.arcs);
    this.off = [world.events.on('explosion', (e) => this.onExplosion(e))];
  }

  private onExplosion(e: GameEvents['explosion']): void {
    if (!e.sourceId || !this.ids.has(e.sourceId)) return;
    for (const v of this.world.vehicles) {
      if (v.position(tmp).distanceTo(e.pos) >= e.radius) continue;
      if (v.stalled <= 0) this.stalls++;
      v.stalled = Math.max(v.stalled, G.stall);
      this.world.events.emit('status', { targetId: v.id, kind: 'stalled', duration: G.stall });
    }
    this.burst(e.pos);
  }

  private burst(p: THREE.Vector3): void {
    for (let i = 0; i < G.sparksPerBurst; i++) {
      const k = this.nextSpark;
      this.nextSpark = (k + 1) % G.pool;
      const a = Math.random() * Math.PI * 2;
      const s = G.sparkSpeed * (0.35 + Math.random() * 0.65);
      this.pos.set([p.x, p.y, p.z], k * 3);
      this.vel.set([Math.cos(a) * s, G.sparkSpeed * (0.4 + Math.random() * 0.8), Math.sin(a) * s], k * 3);
      this.life[k] = G.sparkLife * (0.5 + Math.random() * 0.5);
    }
    const a = this.nextArc;
    this.nextArc = (a + 1) % G.arcs;
    this.arcOrigin[a]!.copy(p);
    this.arcLife[a] = G.arcLife;
  }

  update(dt: number): void {
    const sp = this.pos;
    for (let k = 0; k < G.pool; k++) {
      if (this.life[k]! <= 0) continue;
      this.life[k]! -= dt;
      if (this.life[k]! <= 0) {
        sp[k * 3 + 1] = HIDDEN;
        continue;
      }
      this.vel[k * 3 + 1]! -= G.gravity * dt;
      for (let c = 0; c < 3; c++) sp[k * 3 + c]! += this.vel[k * 3 + c]! * dt;
    }
    this.sparks.geometry.getAttribute('position').needsUpdate = true;
    this.updateArcs(dt);
  }

  /** Yoylar: markazdan tasodifiy nuqtaga zig-zag (har kadr qayta), umri tugagach yashiriladi. */
  private updateArcs(dt: number): void {
    for (let a = 0; a < G.arcs; a++) {
      const base = a * G.arcSegs * 6;
      if (this.arcLife[a]! <= 0) {
        if (this.arcPos[base + 1] !== HIDDEN) this.arcPos.fill(HIDDEN, base, base + G.arcSegs * 6);
        continue;
      }
      this.arcLife[a]! -= dt;
      const o = this.arcOrigin[a]!;
      const ang = Math.random() * Math.PI * 2;
      const tx = o.x + Math.cos(ang) * G.arcReach;
      const tz = o.z + Math.sin(ang) * G.arcReach;
      let px = o.x;
      let py = o.y;
      let pz = o.z;
      for (let s = 0; s < G.arcSegs; s++) {
        const t = (s + 1) / G.arcSegs;
        const j = s === G.arcSegs - 1 ? 0 : 0.9;
        const nx = o.x + (tx - o.x) * t + (Math.random() - 0.5) * j;
        const ny = o.y * (1 - t) + 0.2 * t + (Math.random() - 0.5) * j;
        const nz = o.z + (tz - o.z) * t + (Math.random() - 0.5) * j;
        this.arcPos.set([px, py, pz, nx, ny, nz], base + s * 6);
        px = nx;
        py = ny;
        pz = nz;
      }
    }
    this.arcs.geometry.getAttribute('position').needsUpdate = true;
  }

  dispose(): void {
    for (const o of this.off) o();
    this.sparks.removeFromParent();
    this.arcs.removeFromParent();
    this.sparks.geometry.dispose();
    this.arcs.geometry.dispose();
    (this.sparks.material as THREE.Material).dispose();
    (this.arcs.material as THREE.Material).dispose();
  }
}

/** Arena qurilishida: def.destructibles dagi transformatorlar id lari (`transformer-N`, DestructibleSystem bilan bir xil raqamlash). */
export function createPowerGrid(ctx: BuildContext): PowerGridSystem | null {
  const ids = new Set<string>();
  let n = 0;
  for (const d of ctx.def.destructibles) if (d.type === 'transformer') ids.add(`transformer-${++n}`);
  return n > 0 ? new PowerGridSystem(ctx.world, ids, ctx.root) : null;
}
