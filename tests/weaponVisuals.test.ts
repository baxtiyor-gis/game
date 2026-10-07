import { afterAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../src/core/events';
import type { GameEvents, GameWorld, PickupKind, WeaponId } from '../src/core/types';
import { Effects } from '../src/weapons/effects';
import { ProjectileView, type ViewExtra } from '../src/weapons/projectileView';
import { vis } from '../src/weapons/visuals/config';
import { CrateKit } from '../src/weapons/visuals/crate';
import { disposeIconTextures, iconTexture, iconTextureCount } from '../src/weapons/visuals/crateIcon';
import { disposeModels, getModel, modelIds } from '../src/weapons/visuals/models';
import { PickupFlash } from '../src/weapons/visuals/pickupFlash';
import { TrailPool } from '../src/weapons/visuals/trails';
import pickups from '../data/pickups.json';
import { ICON_IDS, weaponIcon } from '../src/ui/icons';

const IDS: WeaponId[] = ['missile', 'rocket', 'mortar', 'cannon', 'mine'];
const DIR = new THREE.Vector3(0, 0, 1);
const extra = (id: number, age: number, tag: string | null = null, splash = 1): ViewExtra => ({ id, age, moving: true, tag, splash });
const meshes = (scene: THREE.Scene): THREE.InstancedMesh[] => scene.children.filter((c): c is THREE.InstancedMesh => c instanceof THREE.InstancedMesh);

afterAll(() => disposeModels());

describe('snaryad modellari (Node, DOM siz)', () => {
  it('har qurol uchun model yaratiladi va keshlanadi', () => {
    for (const w of IDS) {
      const m = getModel(w);
      expect(m.body.getAttribute('position').count).toBeGreaterThan(30);
      expect(m.body.getAttribute('color')).toBeDefined();
      expect(getModel(w)).toBe(m);
    }
    expect(modelIds()).toEqual(IDS);
  });

  it('yorqin qism: raketa/mina/to\'pda bor, mortirada yo\'q; rang > 1 (bloom)', () => {
    expect(getModel('mortar').glow).toBeNull();
    for (const w of ['missile', 'rocket', 'cannon', 'mine'] as WeaponId[]) {
      const g = getModel(w).glow!;
      expect(g).not.toBeNull();
      const c = g.getAttribute('color');
      let max = 0;
      for (let i = 0; i < c.count; i++) max = Math.max(max, c.getX(i), c.getY(i), c.getZ(i));
      expect(max).toBeGreaterThan(1.1);
    }
  });

  it('missile korpusi 4 qanotli: rocket (3) dan ko\'proq uchburchak', () => {
    expect(getModel('missile').body.getAttribute('position').count).toBeGreaterThan(getModel('rocket').body.getAttribute('position').count);
  });
});

describe('ProjectileView', () => {
  it('har qurol o\'z InstancedMesh iga chiziladi; pool limiti max dan oshmaydi', () => {
    const scene = new THREE.Scene();
    const v = new ProjectileView(scene, 10);
    v.begin(1 / 60);
    for (let i = 0; i < 25; i++) v.add(IDS[i % 5], new THREE.Vector3(i, 0, 0), DIR, extra(i % 10, 0.5));
    v.end();
    expect(v.drawn).toBe(10);
    const total = meshes(scene).reduce((n, m) => n + m.count, 0);
    expect(total).toBeGreaterThanOrEqual(10);
    for (const m of meshes(scene)) expect(m.count).toBeLessThanOrEqual(10);
    v.dispose();
    expect(meshes(scene).length).toBe(0);
  });

  it('maxsus harakat (tag) kattaroq va rangli', () => {
    const scene = new THREE.Scene();
    const v = new ProjectileView(scene, 4);
    v.begin(1 / 60);
    v.add('missile', new THREE.Vector3(), DIR, extra(0, 0.2));
    v.add('missile', new THREE.Vector3(), DIR, extra(1, 0.2, 'missile.swarm'));
    v.end();
    const body = meshes(scene).find((m) => m.geometry === getModel('missile').body)!;
    const a = new THREE.Matrix4();
    const b = new THREE.Matrix4();
    body.getMatrixAt(0, a);
    body.getMatrixAt(1, b);
    const sa = new THREE.Vector3().setFromMatrixScale(a);
    const sb = new THREE.Vector3().setFromMatrixScale(b);
    expect(sb.x).toBeCloseTo(sa.x * vis.special.scale, 4);
    const c0 = new THREE.Color();
    const c1 = new THREE.Color();
    body.getColorAt(0, c0);
    body.getColorAt(1, c1);
    expect(c0.r + c0.g + c0.b).toBeGreaterThan(c1.r + c1.g + c1.b);
    v.dispose();
  });

  it('mina chirog\'i armed bo\'lganda tezroq miltillaydi', () => {
    const scene = new THREE.Scene();
    const v = new ProjectileView(scene, 2);
    const glow = () => meshes(scene).find((m) => m.geometry === getModel('mine').glow)!;
    const flips = (from: number): number => {
      let prev = -1;
      let n = 0;
      for (let k = 0; k < 120; k++) {
        v.begin(1 / 60);
        v.add('mine', new THREE.Vector3(), null, { id: 0, age: from + k / 60, moving: false, tag: null, splash: 1 });
        v.end();
        const c = new THREE.Color();
        glow().getColorAt(0, c);
        const on = c.r > 0.5 ? 1 : 0;
        if (prev >= 0 && on !== prev) n++;
        prev = on;
      }
      return n;
    };
    const idle = flips(0.0);
    const armed = flips(10);
    expect(armed).toBeGreaterThan(idle);
    v.dispose();
  });

  it('izlar: 300 snaryad bilan zarrachalar pool sig\'imidan oshmaydi va so\'nadi', () => {
    const scene = new THREE.Scene();
    const v = new ProjectileView(scene, 300);
    const p = new THREE.Vector3();
    for (let f = 0; f < 120; f++) {
      v.begin(1 / 60);
      for (let i = 0; i < 300; i++) {
        p.set(i, 1, f * 1.2);
        v.add(IDS[i % 4], p, DIR, extra(i, f / 60 + 0.1));
      }
      v.end();
      expect(v.trailParticles).toBeLessThanOrEqual(v.trailCapacity);
    }
    expect(v.trailParticles).toBeGreaterThan(100);
    for (let f = 0; f < 240; f++) {
      v.begin(1 / 60);
      v.end();
    }
    expect(v.trailParticles).toBe(0);
    v.dispose();
  });
});

describe('TrailPool', () => {
  it('halqa-bufer: capacity dan ortiq emit qilinsa ham live <= capacity', () => {
    const pool = new TrailPool(20);
    const layer = vis.trails.missile[0];
    for (let i = 0; i < 100; i++) pool.emit(layer, 0, 0, i);
    expect(pool.live).toBe(20);
    pool.update(10);
    expect(pool.live).toBe(0);
    pool.dispose();
  });
});

describe('Effects (tracer)', () => {
  const world = (): GameWorld => ({ scene: new THREE.Scene(), events: new EventBus<GameEvents>() }) as unknown as GameWorld;

  it('tracer pooli cheklangan, qisqa umrli, bloom uchun toneMapped=false', () => {
    const w = world();
    const fx = new Effects(w);
    for (let i = 0; i < 200; i++) fx.tracer(new THREE.Vector3(), new THREE.Vector3(0, 0, 40));
    expect(fx.activeTracers).toBe(vis.tracer.maxTracers);
    fx.update(1 / 60);
    const tr = meshes(w.scene)[0];
    expect((tr.material as THREE.MeshBasicMaterial).toneMapped).toBe(false);
    expect(tr.count).toBeGreaterThan(0);
    fx.update(2);
    expect(fx.activeTracers).toBe(0);
    fx.dispose();
  });
});

describe('sandiqlar', () => {
  const kinds = Object.keys(pickups.colors) as PickupKind[];

  it('ikonka teksturasi lazy va keshlanadi (DOM siz DataTexture)', () => {
    disposeIconTextures();
    expect(iconTextureCount()).toBe(0);
    const t = iconTexture('rocket', '#ff8a2a');
    expect(iconTextureCount()).toBe(1);
    expect(iconTexture('rocket', '#ff8a2a')).toBe(t);
  });

  it('CrateKit barcha turlar uchun sandiq quradi; geometriya umumiy', () => {
    const kit = new CrateKit(pickups.crateSize, pickups.crateColor, pickups.colors as Record<PickupKind, string>);
    const views = kinds.map((k) => kit.build(k));
    const body = (views[0].group.children[0] as THREE.Mesh).geometry;
    for (const v of views) {
      expect((v.group.children[0] as THREE.Mesh).geometry).toBe(body);
      kit.animate(v, 1.3, 0.9);
      expect(v.holder.rotation.y).toBeCloseTo(1.3 * vis.crate.modelSpin);
    }
    expect(iconTextureCount()).toBe(kinds.length);
    kit.dispose();
  });

  it('PickupFlash pooli aylanadi va so\'nadi', () => {
    const scene = new THREE.Scene();
    const f = new PickupFlash(scene);
    for (let i = 0; i < vis.crate.burst.pool * 3; i++) f.burst(new THREE.Vector3(), '#ff8a2a');
    expect(f.active).toBe(vis.crate.burst.pool);
    f.update(vis.crate.burst.life + 0.1);
    expect(f.active).toBe(0);
    f.dispose();
  });
});

describe('HUD ikonkalari', () => {
  it('8 ta ikonka, currentColor, yo\'llari bor', () => {
    expect(ICON_IDS.sort()).toEqual(['cannon', 'health', 'mg', 'mine', 'missile', 'mortar', 'rocket', 'special']);
    for (const id of ICON_IDS) {
      const s = weaponIcon(id);
      expect(s).toContain('currentColor');
      expect(s).toMatch(/<path d="M/);
      expect(weaponIcon(id)).toBe(s);
    }
  });
});
