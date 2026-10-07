import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { fc, gable, mat, put, unitBox } from './farmKit';

/** Qizil ombor: devor, gable tom, oq ramka va X-taxtali katta eshik, somonxona derazasi. size = [eni, balandligi, uzunligi]. */
export function createBarn(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [14, 6, 20];
  const cube = unitBox();
  const wall = mat('barn', fc.barn, 0.85, 0.05);
  const trim = mat('barnTrim', fc.barnTrim, 0.8, 0.05);
  const roof = mat('barnRoof', fc.barnRoof, 0.55, 0.4);
  const dark = mat('woodDark', fc.woodDark, 0.9, 0.05);
  const g = new THREE.Group();
  const rh = w * 0.36;
  put(g, cube, wall, [0, h / 2, 0], [w, h, d]);
  put(g, gable(w, rh, d), wall, [0, h, 0]);
  put(g, gable(w + 1.6, rh + 0.5, d + 1.4), roof, [0, h - 0.1, 0]);
  const dw = w * 0.42;
  const dh = h * 0.78;
  const z = d / 2 + 0.06;
  put(g, cube, dark, [0, dh / 2, z], [dw, dh, 0.1]);
  for (const sx of [-1, 1]) put(g, cube, trim, [sx * (dw / 2 + 0.12), dh / 2, z + 0.03], [0.25, dh + 0.25, 0.14]);
  put(g, cube, trim, [0, dh + 0.12, z + 0.03], [dw + 0.5, 0.25, 0.14]);
  const diag = Math.hypot(dw, dh);
  const ang = Math.atan2(dh, dw);
  for (const s of [-1, 1]) put(g, cube, trim, [0, dh / 2, z + 0.05], [diag, 0.2, 0.1], [0, 0, s * ang]);
  put(g, cube, dark, [0, h + rh * 0.4, z], [1.6, 1.6, 0.1]);
  put(g, cube, trim, [0, h + rh * 0.4, z + 0.04], [2, 0.2, 0.12]);
  for (const sx of [-1, 1]) put(g, cube, trim, [sx * (w / 2 + 0.04), 0.4, 0], [0.1, 0.8, d]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, h / 2, 0], [w / 2, h / 2, d / 2])] };
}
