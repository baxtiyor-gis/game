import { weaponDef } from './params';
import type { Weapon } from './weapon';

/** Bruiser Cannon: og'ir to'g'ri o'q; tekkanda knockback (impact.ts, weapons.json `knockback`). */
export const cannon: Weapon = {
  id: 'cannon',
  fire(ctx) {
    const vel = ctx.forward.clone().multiplyScalar(weaponDef('cannon').speed);
    ctx.projectiles.spawn({ weapon: 'cannon', owner: ctx.owner, pos: ctx.muzzle, vel });
  },
};
