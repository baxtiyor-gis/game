import * as THREE from 'three';
import { glowMat } from './fxShapes';

export interface FlameCfg {
  count: number;
  /** bitta zarra nozzledan oxirigacha uchish vaqti, s */
  cycle: number;
  length: number;
  /** oxirgi kengayish radiusi */
  radius: number;
  size: number;
  hdr: number;
  opacity: number;
  /** issiq (nozzle) -> o'rta -> sovuq (uch) ranglar */
  colors: [string, string, string];
  /** +1 oldinga (+Z), -1 orqaga */
  dir: 1 | -1;
  additive: boolean;
}

const hot = new THREE.Color();
const mid = new THREE.Color();
const cool = new THREE.Color();
const c = new THREE.Color();

/** Olov oqimi: nozzledan uchib, kengayib va sovib so'nuvchi zarralar (mesh guruhi, +Z o'qi bo'ylab). */
export class FlameStream {
  readonly group = new THREE.Group();
  readonly geo = new THREE.IcosahedronGeometry(1, 1);

  constructor(private readonly cfg: FlameCfg) {
    for (let i = 0; i < cfg.count; i++) this.group.add(new THREE.Mesh(this.geo, glowMat('#ffffff', 1, 1, cfg.additive)));
    hot.set(cfg.colors[0]);
    mid.set(cfg.colors[1]);
    cool.set(cfg.colors[2]);
  }

  /** age: yosh (s), grow: 0..1 uzunlik ulushi, fade: 0..1 umumiy shaffoflik. */
  tick(age: number, grow: number, fade: number): void {
    const f0 = this.cfg;
    this.group.children.forEach((m, i) => {
      const f = (age / f0.cycle + i / f0.count) % 1;
      const a = i * 2.399; // oltin burchak: tekis taqsimot
      const spread = f * f0.radius;
      m.position.set(Math.cos(a) * spread, Math.sin(a) * spread * 0.6, f0.dir * f * f0.length * grow);
      m.scale.setScalar(f0.size * (0.2 + f * 1.1));
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
      c.copy(f < 0.35 ? hot.clone().lerp(mid, f / 0.35) : mid.clone().lerp(cool, (f - 0.35) / 0.65));
      mat.color.copy(c).multiplyScalar(f0.hdr);
      mat.opacity = (1 - f * f) * f0.opacity * fade;
    });
  }
}
