import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { casino, cmat, neon } from './casinoKit';

const S = casino.strip;

/**
 * Yer qoplamalari (kollayderlarsiz, relyefga yotqizilgan yupqa plitalar). variant:
 *  - 'road' (bulvar): asfalt, o'rtada neon chegarali devor-markaz (median), yo'l chiziqlari, ikki chetda chiroq ustunlari;
 *  - 'lot' (avtoturargoh): asfalt va to'xtash chiziqlari; 'plaza' (yaya maydoni): och plitalar va neon chegara.
 * size = [eni(x), -, uzunligi(z)] yo'nalish yaw bilan; o.y — yer sathi.
 */
export function createStrip(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, , d] = def.size ?? [32, 0, 100];
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const flat = (mat: THREE.Material, x: number, z: number, sx: number, sz: number, lift: number, thick = 0.04): void => {
    const m = put(g, unitBox(), mat, [x, lift, z], [sx, thick, sz]);
    m.castShadow = false;
    m.receiveShadow = true;
  };
  if (def.variant === 'road') {
    flat(cmat('asphalt', 0.95, 0.02), 0, 0, w, d, S.lift, 0.06);
    const mh = S.medianHalf;
    flat(cmat('median', 0.9, 0.03), 0, 0, mh * 2, d, S.lift + 0.02, 0.08);
    for (const sx of [-1, 1]) {
      flat(neon(sx > 0 ? 'pinkDim' : 'cyanDim'), sx * (mh + S.neonW / 2), 0, S.neonW, d, S.lineLift, 0.04);
      flat(cmat('lineYellow', 0.7, 0.02), sx * (mh + 1.2), 0, S.lineW, d, S.lineLift, 0.04);
      flat(neon('whiteDim'), sx * (w / 2 - 0.3), 0, 0.2, d, S.lineLift, 0.04);
      for (let z = -d / 2 + S.dashEvery; z < d / 2; z += S.dashEvery) flat(cmat('lineWhite', 0.7, 0.02), sx * S.laneX, z, S.lineW * 1.5, S.dashLen, S.lineLift, 0.04);
      for (let z = -d / 2 + S.lampEvery / 2; z < d / 2; z += S.lampEvery) {
        const x = sx * S.lampX;
        put(g, unitBox(), cmat('lamp', 0.6, 0.4), [x, S.lampH / 2, z], [0.22, S.lampH, 0.22]);
        put(g, unitBox(), cmat('lamp', 0.6, 0.4), [x - sx * 0.7, S.lampH, z], [1.4, 0.14, 0.14]);
        put(g, unitBox(), neon('warm'), [x - sx * 1.35, S.lampH - 0.12, z], [0.7, 0.14, 0.4]);
        colliders.push(box(R, o, [x, S.lampH / 2, z], [0.15, S.lampH / 2, 0.15]));
      }
    }
  } else if (def.variant === 'lot') {
    flat(cmat('asphaltLot', 0.95, 0.02), 0, 0, w, d, S.lift, 0.06);
    for (let x = -w / 2 + S.stall; x < w / 2 - 0.1; x += S.stall) flat(cmat('lineWhite', 0.7, 0.02), x, 0, S.lineW, d - 1, S.lineLift, 0.04);
    flat(neon('amber'), 0, d / 2 - 0.1, w, 0.18, S.lineLift, 0.04);
  } else {
    flat(cmat('plaza', 0.9, 0.03), 0, 0, w, d, S.lift - 0.01, 0.06);
    flat(neon('violet'), 0, d / 2 - 0.2, w, 0.25, S.lineLift, 0.04);
    flat(neon('violet'), 0, -d / 2 + 0.2, w, 0.25, S.lineLift, 0.04);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
