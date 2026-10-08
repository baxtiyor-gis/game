import * as THREE from 'three';
import type { GameWorld } from '../core/types';
import type { FlatDef, TerrainDef } from './types';
import { makeGroundMaterial } from '../render/materials';
import renderCfg from '../../data/render.json';
import { WORLD_GROUPS } from './props/common';

export interface Terrain {
  heightAt(x: number, z: number): number;
  dispose(): void;
}

function hash(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fz = fade(z - iz);
  const a = hash(ix, iz, seed);
  const b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed);
  const d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}

/** Terrain parametrlaridan xom balandlik funksiyasi (m). */
export function makeHeightFn(def: TerrainDef): (x: number, z: number) => number {
  const { noise, hills, flats, seed } = def;
  return (x, z) => {
    let h = 0;
    let amp = noise.amplitude;
    let freq = noise.frequency;
    for (let o = 0; o < noise.octaves; o++) {
      h += (valueNoise(x * freq, z * freq, seed + o * 101) - 0.5) * 2 * amp;
      amp *= 0.5;
      freq *= 2;
    }
    for (const hill of hills) {
      const t = 1 - Math.hypot(x - hill.pos[0], z - hill.pos[1]) / hill.radius;
      if (t > 0) h += hill.height * fade(t);
    }
    for (const f of flats) {
      const [d, target] = flatReach(f, x, z);
      const w = d <= f.radius ? 1 : 1 - fade(Math.min(1, (d - f.radius) / f.blend));
      if (w > 0) h += (target - h) * w;
    }
    return h;
  };
}

/** Nuqtadan tekislik markazigacha (yoki `to` bo'lsa kesmagacha) masofa va shu joydagi maqsad balandlik (kesmada chiziqli). */
function flatReach(f: FlatDef, x: number, z: number): [number, number] {
  const h0 = f.height ?? 0;
  if (!f.to) return [Math.hypot(x - f.pos[0], z - f.pos[1]), h0];
  const dx = f.to[0] - f.pos[0];
  const dz = f.to[1] - f.pos[1];
  const t = Math.min(1, Math.max(0, ((x - f.pos[0]) * dx + (z - f.pos[1]) * dz) / (dx * dx + dz * dz || 1)));
  return [Math.hypot(x - f.pos[0] - dx * t, z - f.pos[1] - dz * t), h0 + ((f.toHeight ?? h0) - h0) * t];
}

/** Heightfield kollayder + mos mesh. heightAt — to'rning bilinear interpolyatsiyasi (mesh bilan bir xil). */
export function buildTerrain(world: GameWorld, def: TerrainDef, size: number): Terrain {
  const n = def.resolution;
  const stride = n + 1;
  const half = size / 2;
  const cell = size / n;
  const raw = makeHeightFn(def);
  const grid = new Float32Array(stride * stride); // grid[iz * stride + ix]
  for (let iz = 0; iz < stride; iz++) {
    for (let ix = 0; ix < stride; ix++) grid[iz * stride + ix] = raw(ix * cell - half, iz * cell - half);
  }

  const heightAt = (x: number, z: number): number => {
    const gx = Math.min(n - 1e-6, Math.max(0, (x + half) / cell));
    const gz = Math.min(n - 1e-6, Math.max(0, (z + half) / cell));
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const i = iz * stride + ix;
    const top = grid[i]! + (grid[i + 1]! - grid[i]!) * fx;
    const bot = grid[i + stride]! + (grid[i + stride + 1]! - grid[i + stride]!) * fx;
    return top + (bot - top) * fz;
  };

  // Rapier: ustun-bo'yicha (column-major): ustun = x, qator = z
  const heights = new Float32Array(stride * stride);
  for (let ix = 0; ix < stride; ix++) {
    for (let iz = 0; iz < stride; iz++) heights[ix * stride + iz] = grid[iz * stride + ix]!;
  }
  const { rapier, physics, scene } = world;
  const collider = physics.createCollider(
    rapier.ColliderDesc.heightfield(n, n, heights, { x: size, y: 1, z: size }).setCollisionGroups(WORLD_GROUPS),
  );

  const geo = new THREE.PlaneGeometry(size, size, n, n);
  geo.rotateX(-Math.PI / 2);
  // PlaneGeometry tugunlari tartibi to'r bilan bir xil (i = iz * stride + ix): balandlik to'g'ridan-to'g'ri nusxalanadi
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, grid[i]!);
  geo.computeVertexNormals();
  const mat = makeGroundMaterial(size);
  if (def.tint) mat.color.set(def.tint);
  if (def.tint && def.tintAbsolute) {
    const base = new THREE.Color(renderCfg.ground.base); // tekstura rangi (chiziqli) — bo'lib, aynan tint chiqadi
    mat.color.setRGB(mat.color.r / base.r, mat.color.g / base.g, mat.color.b / base.b);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);

  return {
    heightAt,
    dispose() {
      scene.remove(mesh);
      geo.dispose();
      mat.map?.dispose();
      mat.dispose();
      physics.removeCollider(collider, false);
    },
  };
}
