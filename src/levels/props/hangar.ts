import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { air, amat, archPts } from './airKit';

const H = air.hangar;

/** Kamar kesimli (yarim ellips) qobiq: tashqi yarim o'qlar rx, ry; qalinlik t; z bo'yicha `depth` (markazlashgan). */
function archShell(rx: number, ry: number, t: number, depth: number): THREE.BufferGeometry {
  return cachedGeo(`arch:${rx}:${ry}:${t}:${depth}`, () => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(archPts(rx, ry, t, H.segments)), { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  });
}

/** Devor shakli: to'rtburchak w x wallH ustiga yarim ellips qopqoq; ixtiyoriy eshik teshigi. */
function endWall(w: number, wallH: number, rise: number, hole?: [number, number]): THREE.BufferGeometry {
  return cachedGeo(`endWall:${w}:${wallH}:${rise}:${hole?.join(',') ?? ''}`, () => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0)];
    for (let i = 0; i <= H.segments; i++) {
      const a = (Math.PI * i) / H.segments;
      pts.push(new THREE.Vector2(Math.cos(a) * (w / 2), wallH + Math.sin(a) * rise));
    }
    const shape = new THREE.Shape(pts);
    if (hole) {
      const [ow, oh] = hole;
      shape.holes.push(new THREE.Path([new THREE.Vector2(-ow / 2, 0), new THREE.Vector2(-ow / 2, oh), new THREE.Vector2(ow / 2, oh), new THREE.Vector2(ow / 2, 0)]));
    }
    return new THREE.ExtrudeGeometry(shape, { depth: H.wall, bevelEnabled: false });
  });
}

/**
 * Katta angar: kamar tom, orqa va yon devorlar, old tomon (+z) ochiq (ichiga kirish mumkin). Ichida sandiq uyumlari.
 * def.size = [eni, devor balandligi, chuqurligi]. Kollayderlar: 2 yon, orqa, 2 old ustun, 2 sandiq uyumi.
 */
export function createHangar(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, wallH, d] = def.size ?? [H.width, H.wallHeight, H.depth];
  const rise = (H.rise * w) / H.width;
  const wall = amat('hangar', 0.85, 0.2);
  const roof = amat('hangarRoof', 0.5, 0.55);
  const rib = amat('hangarRib', 0.7, 0.4);
  const concrete = amat('concrete', 0.95, 0.02);
  const crate = amat('crate', 0.9, 0.03);
  const crateDark = amat('crateDark', 0.9, 0.03);
  const g = new THREE.Group();
  const cube = unitBox();

  put(g, archShell(w / 2 + 0.2, rise + 0.2, 0.5, d), roof, [0, wallH, 0]);
  for (let z = -d / 2 + 1; z <= d / 2 - 0.5; z += H.ribSpacing) {
    put(g, archShell(w / 2 + 0.2 + H.ribGrow, rise + 0.2 + H.ribGrow, 0.35, H.ribDepth), rib, [0, wallH, z]);
  }
  for (const s of [1, -1]) {
    put(g, cube, wall, [s * (w / 2 - H.wall / 2), wallH / 2, 0], [H.wall, wallH, d]);
    put(g, cube, rib, [s * (w / 2 + 0.1), 0.4, 0], [0.2, 0.8, d]);
  }
  put(g, endWall(w, wallH, rise), wall, [0, 0, -d / 2]);
  const [ow, oh] = [H.openWidth, H.openHeight];
  put(g, endWall(w, wallH, rise, [ow, oh]), wall, [0, 0, d / 2 - H.wall]);
  const pier = (w - ow) / 2;
  for (const s of [1, -1]) {
    put(g, cube, rib, [s * (ow / 2 + pier / 2), wallH / 2, d / 2 + 0.25], [pier * 0.9, wallH + 1, 0.3]);
    put(g, cube, wall, [s * (ow / 2 - 0.3), oh / 2, d / 2 + 0.2], [0.5, oh, 0.5]);
  }
  put(g, cube, concrete, [0, 0.04, 0], [w - 1, 0.08, d - 0.5]);
  const stacks: Array<[number, number, number]> = [[-w / 2 + 3, -d / 2 + 3.2, 2.4], [w / 2 - 3.5, -d / 2 + 4, 2.8]];
  for (const [x, z, s] of stacks) {
    put(g, cube, crate, [x, s / 2, z], [s, s, s]);
    put(g, cube, crateDark, [x + 0.3, s * 1.5, z - 0.2], [s * 0.8, s, s * 0.8], [0, 0.4, 0]);
  }

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const colliders = [
    box(R, o, [-(w / 2 - H.wall / 2), wallH / 2, 0], [H.wall / 2, wallH / 2, d / 2]),
    box(R, o, [w / 2 - H.wall / 2, wallH / 2, 0], [H.wall / 2, wallH / 2, d / 2]),
    box(R, o, [0, wallH / 2, -d / 2 + H.wall / 2], [w / 2, wallH / 2, H.wall / 2]),
    box(R, o, [-(ow / 2 + pier / 2), wallH / 2, d / 2 - H.wall / 2], [pier / 2, wallH / 2, H.wall / 2]),
    box(R, o, [ow / 2 + pier / 2, wallH / 2, d / 2 - H.wall / 2], [pier / 2, wallH / 2, H.wall / 2]),
    ...stacks.map(([x, z, s]) => box(R, o, [x, s, z], [s / 2, s, s / 2])),
  ];
  return { object: g, colliders };
}
