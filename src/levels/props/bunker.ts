import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box } from './common';
import type { Origin, PropBuild, Vec3 } from './common';
import { put, unitBox } from './farmKit';
import { base, bmat, glow } from './baseKit';

const B = base.bunker;

/** Pandus qiyaligi (rad) va chuqurlik: pandus yuqori chekkasi (rampEnd) dan chuqurcha poligacha (pitFront). */
export function rampSlope(heightAt: (x: number, z: number) => number, o: Origin): number {
  const pt = (lx: number): number => heightAt(o.x + lx * Math.cos(o.yaw), o.z - lx * Math.sin(o.yaw));
  return Math.atan2(pt(B.rampEnd) - pt(B.pitFront), B.rampEnd - B.pitFront);
}

/**
 * Yer osti bunkeri kirishi. Lokal +x — pandus yuqoriga (tashqariga), -x — chuqurcha ichi. Relyef `flats` orqali oldindan
 * o'yilgan (chuqurcha poli va pandus); bu prop betonli tutib turuvchi devorlar, kirish portali, orqa germetik eshik va sandiqlarni qo'shadi.
 * o.y e'tiborga olinmaydi: balandliklar relyefdan olinadi.
 */
export function createBunker(R: Rapier, o: Origin, heightAt: (x: number, z: number) => number): PropBuild {
  const at = (lx: number): number => heightAt(o.x + lx * Math.cos(o.yaw), o.z - lx * Math.sin(o.yaw));
  const floorY = at(0);
  const groundY = at(B.rampEnd + 5);
  const top = groundY + B.lip;
  const flat: Origin = { x: o.x, y: 0, z: o.z, yaw: o.yaw };
  const wall = bmat('concrete', 0.92, 0.04);
  const dark = bmat('concreteDark', 0.92, 0.04);
  const metal = bmat('metalDark', 0.55, 0.6);
  const hazard = bmat('hazard', 0.7, 0.1);
  const cube = unitBox();
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const solid = (cx: number, cz: number, sx: number, sz: number, y0: number, y1: number, mat = wall): void => {
    put(g, cube, mat, [cx, (y0 + y1) / 2, cz], [sx, y1 - y0, sz]);
    colliders.push(box(R, flat, [cx, (y0 + y1) / 2, cz], [sx / 2, (y1 - y0) / 2, sz / 2] as Vec3));
  };
  const bottom = floorY - 1;
  const pitLen = B.pitFront - B.pitBack + B.wall;
  const pitMid = (B.pitFront + B.pitBack) / 2;
  const rampLen = B.rampEnd - B.pitFront - B.wall;

  for (const s of [1, -1]) {
    solid(pitMid, s * (B.pitHalfW + B.wall / 2), pitLen, B.wall, bottom, top);
    put(g, cube, dark, [pitMid, top + 0.12, s * (B.pitHalfW + B.wall / 2)], [pitLen, 0.25, B.wall + 0.4]);
    put(g, cube, hazard, [pitMid, top - 0.8, s * (B.pitHalfW - 0.02)], [pitLen - 1, 0.3, 0.06]);
    const stepW = B.pitHalfW + B.wall - B.rampHalfW;
    solid(B.pitFront + B.wall / 2, s * (B.rampHalfW + stepW / 2), B.wall, stepW, bottom, top);
    solid(B.pitFront + B.wall + rampLen / 2, s * (B.rampHalfW + B.wall / 2), rampLen, B.wall, bottom, top);
    put(g, cube, dark, [B.pitFront + B.wall + rampLen / 2, top + 0.12, s * (B.rampHalfW + B.wall / 2)], [rampLen, 0.25, B.wall + 0.4]);
    for (let x = B.pitBack + 3; x < B.pitFront; x += B.lampEvery) {
      put(g, cube, glow('cyan'), [x, floorY + 3.4, s * (B.pitHalfW - 0.08)], [2.4, 0.2, 0.12]);
    }
    for (let x = B.pitFront + 4; x < B.portalX - 2; x += B.lampEvery) {
      put(g, cube, glow('amber'), [x, at(x) + 2.2, s * (B.rampHalfW - 0.08)], [1.2, 0.18, 0.12]);
    }
  }
  solid(B.pitBack - B.wall / 2, 0, B.wall, (B.pitHalfW + B.wall) * 2, bottom, top);
  put(g, cube, dark, [B.pitBack - B.wall / 2, top + 0.12, 0], [B.wall + 0.4, 0.25, (B.pitHalfW + B.wall) * 2]);

  // Orqa germetik eshik: ikki qanot, hazard ramka, qizil signal chiroqlari
  const doorX = B.pitBack + 0.2;
  put(g, cube, dark, [doorX - 0.1, floorY + 3.3, 0], [0.4, 6.6, 10]);
  for (const s of [1, -1]) {
    put(g, cube, metal, [doorX + 0.1, floorY + 2.9, s * 2.3], [0.3, 5.8, 4.4]);
    put(g, cube, hazard, [doorX + 0.28, floorY + 0.5, s * 2.3], [0.06, 0.7, 4.0]);
  }
  put(g, cube, glow('red'), [doorX + 0.25, floorY + 6.1, 0], [0.12, 0.35, 5]);

  // Kirish portali (pandus tepasida): ikki ustun, to'sin, ostida sariq chiroq
  const gate = top + B.portalH - B.lip;
  for (const s of [1, -1]) solid(B.portalX, s * (B.rampHalfW + B.wall / 2), B.pillar, B.pillar, groundY - 0.5, gate, dark);
  put(g, cube, dark, [B.portalX, gate + 0.6, 0], [B.pillar * 1.2, 1.2, (B.rampHalfW + B.wall) * 2 + B.pillar]);
  put(g, cube, hazard, [B.portalX, gate + 1.25, 0], [B.pillar * 1.25, 0.3, (B.rampHalfW + B.wall) * 2 + B.pillar]);
  put(g, cube, glow('amber'), [B.portalX, gate - 0.1, 0], [0.4, 0.2, B.rampHalfW * 2 - 1]);

  put(g, cube, bmat('concreteDark', 0.95, 0.02), [pitMid, floorY + 0.04, 0], [pitLen - B.wall, 0.08, B.pitHalfW * 2]);
  for (const [cx, cz, s] of B.crates) {
    put(g, cube, bmat('crate', 0.9, 0.03), [cx, floorY + s / 2, cz], [s, s, s]);
    put(g, cube, bmat('oliveDark', 0.85, 0.1), [cx, floorY + s + s * 0.2, cz], [s * 0.75, s * 0.4, s * 0.75]);
    colliders.push(box(R, flat, [cx, floorY + s / 2, cz], [s / 2, s / 2, s / 2]));
  }
  g.position.set(o.x, 0, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
