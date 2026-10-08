import * as THREE from 'three';
import { cachedGeo } from './common';
import { put, unitCyl } from './farmKit';
import { base, bmat, glow } from './baseKit';

const L = base.launch;
const RK = L.rocket;
/** Ko'rinmas holatdagi obyektlar saqlanadigan chuqurlik (sahnada `visible` qoladi: shader oldindan kompilyatsiya bo'ladi) */
export const PARK_Y = -500;

export interface RocketModel {
  group: THREE.Group;
  flame: THREE.Mesh;
}

/** Raketa: o'qi +Y, koordinata boshi — dum (pastki) markazi. Oq korpus, qizil belbog', burun konusi, to'rt stabilizator, olov (flame.scale.y = 0 — o'chiq). */
export function createRocket(): RocketModel {
  const body = bmat('rocket', 0.4, 0.4);
  const red = bmat('rocketRed', 0.5, 0.3);
  const dark = bmat('metalDark', 0.5, 0.6);
  const g = new THREE.Group();
  const bodyLen = RK.length - RK.noseLen;
  put(g, unitCyl(), body, [0, bodyLen / 2, 0], [RK.radius, bodyLen, RK.radius]);
  put(g, unitCyl(), red, [0, bodyLen * 0.72, 0], [RK.radius * 1.02, 1.6, RK.radius * 1.02]);
  put(g, unitCyl(), red, [0, bodyLen * 0.2, 0], [RK.radius * 1.02, 0.8, RK.radius * 1.02]);
  put(g, cachedGeo('rocket.nose', () => new THREE.ConeGeometry(1, 1, 18)), red, [0, bodyLen + RK.noseLen / 2, 0], [RK.radius, RK.noseLen, RK.radius]);
  put(g, unitCyl(), dark, [0, 0.35, 0], [RK.radius * 0.8, 0.7, RK.radius * 0.8]);
  const fin = cachedGeo('rocket.fin', () => new THREE.BoxGeometry(0.18, 1, 1));
  for (let i = 0; i < RK.fins; i++) {
    const a = (i / RK.fins) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    put(holder, fin, dark, [0, RK.finLen / 2, RK.radius + RK.finSpan / 2 - 0.2], [1, RK.finLen, RK.finSpan]);
    g.add(holder);
  }
  const flame = new THREE.Mesh(cachedGeo('rocket.flame', () => new THREE.ConeGeometry(0.85, 1, 12, 1, true).rotateX(Math.PI).translate(0, -0.5, 0)), glow('flame'));
  flame.scale.set(RK.radius, 0.0001, RK.radius);
  flame.position.y = 0.1;
  g.add(flame);
  return { group: g, flame };
}

const puffMat = (): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color: '#ffb868', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

/** Raketa izi: oldindan yaratilgan olovli/tutunli sharlar (pool), kichrayib so'nadi. Hammasi sahnada, kerak bo'lmaganda chuqurda. */
export class Trail {
  readonly group = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];
  private readonly age: number[] = [];
  private readonly mat = puffMat();
  private next = 0;
  private acc = 0;

  constructor() {
    const geo = cachedGeo('trail.puff', () => new THREE.SphereGeometry(1, 8, 6));
    for (let i = 0; i < L.trail.count; i++) {
      const m = new THREE.Mesh(geo, this.mat);
      m.position.y = PARK_Y;
      this.puffs.push(m);
      this.age.push(Infinity);
      this.group.add(m);
    }
  }

  /** Raketa (dt davomida) pos da: interval bo'yicha yangi shar qo'yadi, mavjudlarini qariydi. */
  step(dt: number, pos: THREE.Vector3 | null): void {
    this.acc += dt;
    if (pos && this.acc >= L.trail.interval) {
      this.acc = 0;
      const i = this.next++ % this.puffs.length;
      this.puffs[i]!.position.copy(pos);
      this.age[i] = 0;
    }
    for (let i = 0; i < this.puffs.length; i++) {
      const a = (this.age[i]! += dt);
      const k = a / L.trail.life;
      const m = this.puffs[i]!;
      if (k >= 1) {
        m.position.y = PARK_Y;
        continue;
      }
      m.scale.setScalar(L.trail.size * (0.6 + k * 1.8) * (1 - k * 0.6));
    }
  }

  dispose(): void {
    this.mat.dispose();
  }
}

const ringMat = (): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color: '#ff2a1c', transparent: true, opacity: L.mark.opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });

/** Yerdagi qizil ogohlantirish belgisi: tashqi halqa (portlash radiusi), siqiladigan ichki halqa va xoch. */
export class TargetMark {
  readonly group = new THREE.Group();
  private readonly mat = ringMat();
  private readonly pulse: THREE.Mesh;
  private radius = 1;

  constructor() {
    const w = L.mark.ringWidth;
    const ring = cachedGeo('mark.ring', () => new THREE.RingGeometry(1 - w, 1, 48).rotateX(-Math.PI / 2));
    const outer = new THREE.Mesh(ring, this.mat);
    this.pulse = new THREE.Mesh(ring, this.mat);
    const bar = cachedGeo('mark.bar', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    this.group.add(outer, this.pulse);
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const m = new THREE.Mesh(bar, this.mat);
      m.rotation.y = a;
      m.scale.set(1.9, 1, 0.07);
      m.name = 'cross';
      this.group.add(m);
    }
    this.group.position.y = PARK_Y;
  }

  show(x: number, y: number, z: number, radius: number): void {
    this.radius = radius;
    this.group.position.set(x, y + 0.25, z);
    for (const c of this.group.children) if (c.name === 'cross') c.scale.set(radius * 1.9, 1, radius * 0.07);
    this.group.children[0]!.scale.set(radius, 1, radius);
  }

  hide(): void {
    this.group.position.y = PARK_Y;
  }

  /** t — belgi ko'ringanidan beri o'tgan vaqt (s) */
  animate(t: number): void {
    const k = (t * L.mark.pulse) % 1;
    this.pulse.scale.set(this.radius * (1 - k * 0.85), 1, this.radius * (1 - k * 0.85));
    this.mat.opacity = L.mark.opacity * (0.55 + 0.45 * Math.abs(Math.sin(t * L.mark.pulse * Math.PI)));
  }

  dispose(): void {
    this.mat.dispose();
  }
}
