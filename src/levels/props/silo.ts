import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { cachedGeo, placed } from './common';
import type { Origin, PropBuild } from './common';
import { farm, fc, mat, put, unitBox, unitCyl } from './farmKit';

/** Don silosi: metall tsilindr, halqalar, gumbaz, narvon. scale — o'lchamni ko'paytiradi. */
export function createSilo(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const s = def.scale ?? 1;
  const r = farm.silo.radius * s;
  const h = farm.silo.height * s;
  const body = mat('silo', fc.silo, 0.45, 0.55);
  const dome = mat('siloDome', fc.siloDome, 0.4, 0.6);
  const g = new THREE.Group();
  put(g, unitCyl(), body, [0, h / 2, 0], [r, h, r]);
  for (let y = 2.5 * s; y < h; y += 2.8 * s) put(g, unitCyl(), dome, [0, y, 0], [r * 1.02, 0.18, r * 1.02]);
  const cap = cachedGeo('siloCap', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  put(g, cap, dome, [0, h, 0], [r, r * 0.6, r]);
  put(g, unitCyl(), dome, [0, h + r * 0.62, 0], [0.25, 0.7, 0.25]);
  put(g, unitBox(), mat('woodDark', fc.woodDark), [0, h / 2, r + 0.05], [0.5, h, 0.12]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [placed(R.ColliderDesc.cylinder(h / 2, r), o, [0, h / 2, 0])] };
}
