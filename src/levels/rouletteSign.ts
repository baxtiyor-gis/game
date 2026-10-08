import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { System } from '../core/types';
import type { BuildContext } from './context';
import type { PropDef } from './types';
import { cachedGeo, WORLD_GROUPS } from './props/common';
import type { Origin } from './props/common';
import { put, unitBox } from './props/farmKit';
import { casino, cmat, neon } from './props/casinoKit';
import { mergeStatic } from './mergeStatic';

const R = casino.roulette;

interface Spinner {
  holder: THREE.Object3D;
  axis: 'y' | 'z';
  speed: number;
}

/** Ruletka g'ildiragi: qizil/qora sektorlar (har rang — bitta geometriya), oltin gupchak, chetda lampochkalar. Disk normali +z. */
function wheelGroup(): THREE.Group {
  const g = new THREE.Group();
  const geo = (k: number): THREE.BufferGeometry =>
    cachedGeo(`casino.wheel:${k}`, () => {
      const parts: THREE.BufferGeometry[] = [];
      for (let i = k; i < R.slices; i += 2) {
        const p = new THREE.CylinderGeometry(R.wheelR, R.wheelR, 0.6, 3, 1, false, (i / R.slices) * Math.PI * 2, (Math.PI * 2) / R.slices);
        parts.push(p.rotateX(Math.PI / 2));
      }
      const m = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      return m;
    });
  g.add(new THREE.Mesh(geo(0), neon('red')), new THREE.Mesh(geo(1), cmat('dark', 0.5, 0.3)));
  const hub = new THREE.Mesh(cachedGeo('casino.hub', () => new THREE.CylinderGeometry(1.1, 1.1, 0.9, 14).rotateX(Math.PI / 2)), neon('amber'));
  g.add(hub);
  for (let i = 0; i < R.slices; i++) {
    const a = (i / R.slices) * Math.PI * 2;
    put(g, unitBox(), neon(i % 2 ? 'white' : 'amber'), [Math.cos(a) * (R.wheelR + 0.25), Math.sin(a) * (R.wheelR + 0.25), 0.1], [0.4, 0.4, 0.8]);
  }
  return g;
}

/** Zar: oq kub, qirralarda nuqtalar (neon), yon tomonlarda pushti belbog'. */
function diceGroup(): THREE.Group {
  const g = new THREE.Group();
  const s = R.diceSize;
  put(g, unitBox(), cmat('diceBody', 0.4, 0.1), [0, 0, 0], [s, s, s]);
  const faces: Array<[[number, number, number], number]> = [[[0, 0, 1], 1], [[0, 0, -1], 6], [[1, 0, 0], 3], [[-1, 0, 0], 4], [[0, 1, 0], 2], [[0, -1, 0], 5]];
  const layout: Record<number, Array<[number, number]>> = {
    1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, 1], [-1, 1], [1, -1]],
    5: [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]], 6: [[-1, -1], [1, 1], [-1, 1], [1, -1], [-1, 0], [1, 0]],
  };
  for (const [n, count] of faces) {
    for (const [u, v] of layout[count]!) {
      const p = new THREE.Vector3(n[0], n[1], n[2]).multiplyScalar(s / 2 + 0.05);
      const t1 = n[1] !== 0 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const t2 = new THREE.Vector3().crossVectors(new THREE.Vector3(n[0], n[1], n[2]), t1);
      p.addScaledVector(t1, u * s * 0.28).addScaledVector(t2, v * s * 0.28);
      const pip = put(g, cachedGeo('casino.pip', () => new THREE.SphereGeometry(0.42, 8, 6)), neon(count % 2 ? 'pink' : 'cyan'), [p.x, p.y, p.z]);
      pip.castShadow = false;
    }
  }
  return g;
}

/** Aylanuvchi ruletka/zar vivekalari + neon "pulsatsiya" (2 ta yorug' material intensivligi sinus bilan). Dekorativ, kollayderli ustun bilan. */
export class CasinoDecoSystem implements System {
  readonly name = 'casinoDeco';
  private t = 0;
  private readonly pulsed: THREE.MeshStandardMaterial[] = neonPulse();

  constructor(readonly spinners: Spinner[]) {}

  update(dt: number): void {
    this.t += dt;
    for (const s of this.spinners) s.holder.rotation[s.axis] += s.speed * dt;
    const k = Math.sin(this.t * R.pulseSpeed);
    this.pulsed.forEach((m, i) => (m.emissiveIntensity = m.userData.base * (1 + R.pulse * (i % 2 ? k : -k))));
  }
}

function neonPulse(): THREE.MeshStandardMaterial[] {
  return ['pink', 'cyan'].map((k) => {
    const m = neon(k);
    m.userData.base ??= m.emissiveIntensity;
    return m;
  });
}

/** Arena qurilishida: 'rouletteSign' proplari (variant 'wheel' | 'dice') -> ustun (statik) + aylanuvchi qism. Hech biri bo'lmasa null. */
export function createRouletteSigns(ctx: BuildContext, origin: (p: [number, number], yaw: number, w: number, d: number) => Origin): System | null {
  const spinners: Spinner[] = [];
  for (const def of ctx.def.props as PropDef[]) {
    if (def.type !== 'rouletteSign') continue;
    const dice = def.variant === 'dice';
    const o = origin(def.pos, def.yaw ?? 0, R.pylonW, R.pylonW);
    const top = dice ? R.diceH : R.wheelH;
    const post = new THREE.Group();
    put(post, unitBox(), cmat('steelDark', 0.6, 0.4), [0, top / 2, 0], [R.pylonW, top, R.pylonW]);
    put(post, unitBox(), cmat('steelDark', 0.6, 0.4), [0, 0.4, 0], [R.pylonW * 2.2, 0.8, R.pylonW * 2.2]);
    post.position.set(o.x, o.y, o.z);
    post.rotation.y = o.yaw;
    ctx.statics.push(post);
    ctx.addCollider(ctx.world.rapier.ColliderDesc.cuboid(R.pylonW / 2, top / 2, R.pylonW / 2).setTranslation(o.x, o.y + top / 2, o.z).setCollisionGroups(WORLD_GROUPS));

    // Aylanuvchi qism: avval nol nuqtada qurib birlashtiriladi, so'ng tayanch nuqtaga qo'yiladi
    const src = dice ? diceGroup() : wheelGroup();
    const holder = new THREE.Group();
    const free = mergeStatic([src], holder);
    ctx.onDispose(free);
    holder.position.set(o.x, o.y + top + (dice ? R.diceSize * 0.5 : R.wheelR * 0.55), o.z);
    holder.rotation.order = dice ? 'YXZ' : 'XYZ';
    if (dice) holder.rotation.x = 0.5;
    ctx.root.add(holder);
    if (!dice) holder.rotation.y = o.yaw;
    spinners.push({ holder, axis: dice ? 'y' : 'z', speed: dice ? R.diceSpeed : R.speed });
  }
  return spinners.length > 0 ? new CasinoDecoSystem(spinners) : null;
}
