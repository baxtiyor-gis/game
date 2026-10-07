import { weaponDef } from './params';
import type { Weapon } from './weapon';

/** Bull's Eye Rockets: to'g'ri, tez. */
export const rocket: Weapon = {
  id: 'rocket',
  fire(ctx) {
    const vel = ctx.forward.clone().multiplyScalar(weaponDef('rocket').speed);
    ctx.projectiles.spawn({ weapon: 'rocket', owner: ctx.owner, pos: ctx.muzzle, vel });
  },
};
