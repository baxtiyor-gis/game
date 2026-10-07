import * as THREE from 'three';
import type { TrackPath } from '../trackPath';
import { cachedGeo, stdMat } from './common';
import { farm, fc } from './farmKit';

/** Temir yo'l: shag'al to'shama, 2 ta rels, shpallar — hammasi InstancedMesh (segmentlar iz bo'ylab). */
export function buildRails(track: TrackPath): THREE.Group {
  const cfg = farm.rails;
  const segs = Math.ceil(track.length / cfg.segment);
  const sleepers = Math.ceil(track.length / cfg.sleeperSpacing);
  const box = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const ballast = new THREE.InstancedMesh(box, stdMat('farm.ballast', fc.ballast, 1, 0), segs);
  const rail = new THREE.InstancedMesh(box, stdMat('farm.rail', fc.rail, 0.35, 0.8), segs * 2);
  const sleeper = new THREE.InstancedMesh(box, stdMat('farm.sleeper', fc.sleeper, 0.95, 0), sleepers);
  const pos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  const place = (mesh: THREE.InstancedMesh, i: number, s: number, off: number, y: number, sc: [number, number, number]): void => {
    track.at(s, pos, dir);
    side.crossVectors(up, dir).normalize();
    q.setFromRotationMatrix(basis.makeBasis(side, new THREE.Vector3().crossVectors(dir, side), dir));
    pos.addScaledVector(side, off);
    pos.y += y;
    mesh.setMatrixAt(i, m4.compose(pos, q, new THREE.Vector3(...sc)));
  };
  const half = cfg.gauge / 2;
  for (let i = 0; i < segs; i++) {
    const s = (i + 0.5) * cfg.segment;
    // pos y = relsning ustki yuzasi sathidan lift; ballast pastroqda
    place(ballast, i, s, 0, -0.16, [cfg.ballastWidth, cfg.ballastHeight, cfg.segment * 1.02]);
    place(rail, i * 2, s, -half, 0, [0.12, 0.18, cfg.segment * 1.02]);
    place(rail, i * 2 + 1, s, half, 0, [0.12, 0.18, cfg.segment * 1.02]);
  }
  for (let i = 0; i < sleepers; i++) place(sleeper, i, i * cfg.sleeperSpacing, 0, -0.08, [cfg.gauge + 0.9, 0.12, 0.35]);
  const g = new THREE.Group();
  g.name = 'rails';
  for (const m of [ballast, rail, sleeper]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
