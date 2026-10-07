import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import strings from '../data/strings.json';
import menu from '../data/menu.json';
import { ARENAS } from '../src/levels/registry';
import { mergeStatic } from '../src/levels/mergeStatic';
import { tipsFor } from '../src/ui/loading';

describe('yuklanish ekrani maslahatlari', () => {
  it('har bir maslahat kaliti strings.json da bor', () => {
    for (const k of menu.loading.tips) expect((strings as Record<string, string>)[k], k).toBeTruthy();
  });

  it('arena maslahatlari faqat o\'z arenasida, umumiylar hammasida', () => {
    const oil = tipsFor('oil_fields');
    const farm = tipsFor('valley_farms');
    expect(oil).toContain('tip.combo');
    expect(farm).toContain('tip.combo');
    expect(oil.some((k) => k.startsWith('tip.valley_farms.'))).toBe(false);
    expect(farm.some((k) => k.startsWith('tip.oil_fields.'))).toBe(false);
    for (const a of ARENAS.filter((x) => x.available)) expect(tipsFor(a.id).some((k) => k.startsWith(`tip.${a.id}.`)), a.id).toBe(true);
  });

  it('progress bosqichlari tartibli (0..1)', () => {
    const s = menu.loadingSteps;
    expect(0 < s.env && s.env < s.arena && s.arena < s.vehicles && s.vehicles < 1).toBe(true);
  });
});

describe('mergeStatic', () => {
  it('bir xil materialli statik meshlar bittaga birlashadi, dunyo koordinatalari saqlanadi', () => {
    const mat = new THREE.MeshStandardMaterial();
    const other = new THREE.MeshStandardMaterial();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const roots = [0, 1, 2].map((i) => {
      const g = new THREE.Group();
      g.position.set(i * 5, 0, 0);
      g.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, i === 2 ? other : mat));
      return g;
    });
    const into = new THREE.Group();
    const dispose = mergeStatic(roots, into);
    expect(into.children.length).toBe(2);
    const merged = into.children.find((c) => (c as THREE.Mesh).material === mat) as THREE.Mesh;
    merged.geometry.computeBoundingBox();
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(10.5);
    expect(merged.geometry.getAttribute('position').count).toBe(5 * 36);
    dispose();
  });

  it('birlashmaydigan obyektli daraxt o\'zgarishsiz qo\'shiladi', () => {
    const g = new THREE.Group();
    g.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(), 2));
    const into = new THREE.Group();
    mergeStatic([g], into);
    expect(into.children).toEqual([g]);
  });
});
