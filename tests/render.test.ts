import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ParticlePool, hexToLinear, makeStyle } from '../src/render/particlePool';
import { ShakeState, shakeTrauma } from '../src/render/shake';
import { BAYER4, bayerThreshold, colorLevels, lowResSize } from '../src/render/ps1';
import cfg from '../data/render.json';
import { snapToTexelGrid } from '../src/render/environment';
import { generateGroundPixels, upgradeMaterials } from '../src/render/materials';

const style = makeStyle({ life: 1, size0: 1, size1: 2, c0: '#ffffff', c1: '#000000', alpha: 1, gravity: 0, drag: 0 });

describe('ParticlePool', () => {
  it('spawns up to capacity then refuses', () => {
    const p = new ParticlePool(3);
    expect([1, 2, 3, 4].map(() => p.spawn(0, 0, 0, 0, 0, 0, style))).toEqual([true, true, true, false]);
    expect(p.count).toBe(3);
  });

  it('releases expired particles and reuses slots', () => {
    const p = new ParticlePool(2);
    p.spawn(0, 0, 0, 0, 0, 0, style, 1, 0.5);
    p.spawn(0, 0, 0, 0, 0, 0, style, 1, 2);
    p.update(0.6);
    expect(p.count).toBe(1);
    expect(p.spawn(0, 0, 0, 0, 0, 0, style)).toBe(true);
    expect(p.count).toBe(2);
    p.update(5);
    expect(p.count).toBe(0);
  });

  it('integrates motion and fills buffers', () => {
    const p = new ParticlePool(2);
    p.spawn(0, 0, 0, 2, 0, 0, style);
    p.update(0.5);
    const pos = new Float32Array(6), size = new Float32Array(2), col = new Float32Array(8);
    p.fill(pos, size, col);
    expect(pos[0]).toBeCloseTo(1);
    expect(size[0]).toBeCloseTo(1.5);
    expect(col[3]).toBeCloseTo(0.5);
  });

  it('parses hex to linear', () => {
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
  });

  it('fits the 2000 particle budget', () => {
    expect(cfg.vfx.maxFire + cfg.vfx.maxSmoke).toBeLessThanOrEqual(2000);
  });
});

describe('shake', () => {
  it('decays to zero and clamps', () => {
    const s = new ShakeState();
    s.add(5);
    expect(s.trauma).toBe(1);
    for (let i = 0; i < 600; i++) s.step(1 / 60);
    expect(s.trauma).toBe(0);
    expect(s.offset(1, new THREE.Vector3()).length()).toBe(0);
  });

  it('falls off with distance and scales with radius', () => {
    expect(shakeTrauma(cfg.shake.maxDistance, 6)).toBe(0);
    expect(shakeTrauma(5, 6)).toBeGreaterThan(shakeTrauma(30, 6));
    expect(shakeTrauma(30, 12)).toBeGreaterThan(shakeTrauma(30, 3));
  });

  it('offset is bounded by maxOffset', () => {
    const s = new ShakeState();
    s.add(1);
    const o = new THREE.Vector3();
    for (let t = 0; t < 5; t += 0.01) expect(s.offset(t, o).length()).toBeLessThanOrEqual(cfg.shake.maxOffset * 2);
  });
});

describe('ps1 helpers', () => {
  it('low-res size keeps height and aspect', () => {
    expect(lowResSize(16 / 9)).toEqual({ w: 427, h: 240 });
  });
  it('15-bit levels and bayer range', () => {
    expect(colorLevels(5)).toBe(31);
    expect(new Set(BAYER4).size).toBe(16);
    for (let i = 0; i < 16; i++) expect(Math.abs(bayerThreshold(i, i >> 2))).toBeLessThan(0.5);
  });
});

describe('environment helpers', () => {
  it('shadow snap is texel-aligned and keeps depth', () => {
    const dir = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
    const focus = new THREE.Vector3(13.37, 0.2, -7.77);
    const texel = 0.04;
    const out = snapToTexelGrid(focus, dir, texel, new THREE.Vector3());
    const r = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    expect(out.dot(r) / texel).toBeCloseTo(Math.round(out.dot(r) / texel), 4);
    expect(out.dot(dir)).toBeCloseTo(focus.dot(dir), 4);
    expect(out.distanceTo(focus)).toBeLessThan(texel * 2);
  });

  it('ground pixels are deterministic, opaque, in range', () => {
    const a = generateGroundPixels(32, 3), b = generateGroundPixels(32, 3);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.length).toBe(32 * 32 * 4);
    expect(a[3]).toBe(255);
    expect(new Set(a).size).toBeGreaterThan(10);
  });

  it('upgrades Lambert to Standard, keeps color, shares materials', () => {
    const lam = new THREE.MeshLambertMaterial({ color: '#b5835a' });
    const s = new THREE.Scene();
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lam);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lam);
    s.add(m1, m2);
    upgradeMaterials(s);
    expect(m1.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(m1.material).toBe(m2.material);
    expect((m1.material as unknown as THREE.MeshStandardMaterial).color.getHexString()).toBe(new THREE.Color('#b5835a').getHexString());
    expect(m1.castShadow && m1.receiveShadow).toBe(true);
  });
});
