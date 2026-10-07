import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo, mesh, placed, propCfg, stdMat } from './common';
import type { Origin, PropBuild } from './common';

const pc = propCfg.pipe;

/** Quvur: z o'qi bo'ylab uzunligi `length`; lift>0 bo'lsa ustunlarda ko'tarilgan (ostidan o'tish mumkin). */
export function createPipe(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const len = def.length ?? 20;
  const lift = def.lift ?? 0;
  const r = pc.radius;
  const pipeMat = stdMat('pipe', propCfg.colors.pipe, 0.55, 0.6);
  const flangeMat = stdMat('pipe.flange', propCfg.colors.pipeFlange, 0.6, 0.6);
  const postMat = stdMat('pipe.post', propCfg.colors.pipePost, 0.8, 0.3);
  const g = new THREE.Group();
  const cy = lift + r;
  const body = mesh(cachedGeo(`pipe.${len}`, () => new THREE.CylinderGeometry(r, r, len, 14).rotateX(Math.PI / 2)), pipeMat, 0, cy, 0);
  g.add(body);
  const flange = cachedGeo('pipe.flange', () => new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.25, 14).rotateX(Math.PI / 2));
  const flanges = Math.max(2, Math.round(len / pc.flangeSpacing) + 1);
  for (let i = 0; i < flanges; i++) g.add(mesh(flange, flangeMat, 0, cy, -len / 2 + (len * i) / (flanges - 1)));

  const colliders = [placed(R.ColliderDesc.cylinder(len / 2, r), o, [0, cy, 0], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))];
  if (lift > 0) {
    const posts = Math.max(2, Math.round(len / pc.postSpacing) + 1);
    const post = cachedGeo('pipe.post', () => new THREE.BoxGeometry(0.4, 1, 0.4));
    for (let i = 0; i < posts; i++) {
      const z = -len / 2 + (len * i) / (posts - 1);
      const p = mesh(post, postMat, 0, lift / 2, z);
      p.scale.y = lift;
      g.add(p);
      colliders.push(box(R, o, [0, lift / 2, z], [0.2, lift / 2, 0.2]));
    }
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
