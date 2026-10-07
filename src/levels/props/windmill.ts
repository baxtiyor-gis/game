import * as THREE from 'three';
import type { Rapier, System } from '../../core/types';
import { cachedGeo, placed } from './common';
import type { Origin, PropBuild } from './common';
import { farm, fc, mat, put, unitBox, unitCyl } from './farmKit';

export interface WindmillRig {
  build: PropBuild;
  rotor: THREE.Group;
}

/** Shamol tegirmoni: konus minora, ko'p parrakli g'ildirak (rotor oldinga +z qaragan), dum. */
export function createWindmill(R: Rapier, o: Origin): WindmillRig {
  const { towerHeight: H, blades, wheelRadius: wr, colliderRadius } = farm.windmill;
  const tower = mat('windTower', fc.windTower, 0.6, 0.3);
  const blade = mat('windBlade', fc.windBlade, 0.5, 0.2);
  const g = new THREE.Group();
  put(g, cachedGeo(`windTower:${H}`, () => new THREE.CylinderGeometry(0.55, 1.5, H, 8)), tower, [0, H / 2, 0]);
  put(g, unitBox(), tower, [0, H + 0.4, 0], [1, 0.9, 2.2]);
  put(g, unitBox(), mat('woodDark', fc.woodDark), [0, H + 0.4, -2.6], [0.12, 1.2, 2.6]);
  const rotor = new THREE.Group();
  rotor.position.set(0, H + 0.4, 1.4);
  put(rotor, unitCyl(), tower, [0, 0, 0], [0.3, 0.6, 0.3], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.z = a;
    put(arm, unitBox(), blade, [0, wr * 0.62, 0], [0.95, wr * 0.76, 0.06]);
    rotor.add(arm);
  }
  put(rotor, cachedGeo('windRingIn', () => new THREE.TorusGeometry(wr * 0.5, 0.05, 6, 24)), tower, [0, 0, 0]);
  put(rotor, cachedGeo('windRingOut', () => new THREE.TorusGeometry(wr, 0.06, 6, 28)), tower, [0, 0, 0]);
  g.add(rotor);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const col = placed(R.ColliderDesc.cylinder(H / 2, colliderRadius), o, [0, H / 2, 0]);
  return { build: { object: g, colliders: [col] }, rotor };
}

/** Rotorlarni aylantiradi (faqat vizual). */
export class WindmillSystem implements System {
  readonly name = 'windmills';
  constructor(private readonly rigs: Array<{ rotor: THREE.Group; speed: number }>) {}
  update(dt: number): void {
    for (const r of this.rigs) r.rotor.rotation.z -= r.speed * dt;
  }
}
