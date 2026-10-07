import * as THREE from 'three';
import { tuning, weaponDef } from './params';
import type { Weapon } from './weapon';

const flat = new THREE.Vector3();

/** Sky Hammer Mortar: ballistik yoy (forward ning gorizontal qismi + elevation), gravitatsiya ta'sirida. */
export const mortar: Weapon = {
  id: 'mortar',
  fire(ctx) {
    flat.copy(ctx.forward);
    flat.y = 0;
    if (flat.lengthSq() < 1e-6) flat.set(0, 0, 1);
    flat.normalize();
    const el = tuning.mortar.elevation;
    const speed = weaponDef('mortar').speed;
    const vel = flat.clone().multiplyScalar(Math.cos(el) * speed);
    vel.y = Math.sin(el) * speed;
    ctx.projectiles.spawn({ weapon: 'mortar', owner: ctx.owner, pos: ctx.muzzle, vel, gravity: true });
  },
};
