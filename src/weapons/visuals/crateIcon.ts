// Sandiq yon tomonidagi ikonka teksturalari. Lazy: birinchi so'ralganda yaratiladi (Node da DOM yo'q -> DataTexture).
import * as THREE from 'three';
import type { PickupKind } from '../../core/types';
import { vis } from './config';

const cache = new Map<PickupKind, THREE.Texture>();

/** kind uchun ikonka teksturasi (keshlangan). tint = ikonka rangi (#rrggbb). */
export function iconTexture(kind: PickupKind, tint: string): THREE.Texture {
  let t = cache.get(kind);
  if (!t) {
    t = typeof document !== 'undefined' && typeof Path2D !== 'undefined' ? canvasTexture(kind, tint) : fallbackTexture(tint);
    t.colorSpace = THREE.SRGBColorSpace;
    cache.set(kind, t);
  }
  return t;
}

export function iconTextureCount(): number {
  return cache.size;
}

export function disposeIconTextures(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

function canvasTexture(kind: PickupKind, tint: string): THREE.Texture {
  const c = vis.crate;
  const S = c.iconTexture;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = c.plateBg;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = tint;
  ctx.lineWidth = S * 0.05;
  ctx.strokeRect(S * 0.04, S * 0.04, S * 0.92, S * 0.92);
  const k = (S * c.iconScale) / vis.icons.viewBox;
  ctx.translate((S * (1 - c.iconScale)) / 2, (S * (1 - c.iconScale)) / 2);
  ctx.scale(k, k);
  ctx.fillStyle = tint;
  ctx.fill(new Path2D(vis.icons[kind]), 'evenodd');
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

/** DOM yo'q muhit: plita foni + markazda tur rangi kvadrati. */
function fallbackTexture(tint: string): THREE.Texture {
  const n = 8;
  const bg = new THREE.Color(vis.crate.plateBg);
  const fg = new THREE.Color(tint);
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = x >= 2 && x < 6 && y >= 2 && y < 6 ? fg : bg;
      data.set([c.r * 255, c.g * 255, c.b * 255, 255], (y * n + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
