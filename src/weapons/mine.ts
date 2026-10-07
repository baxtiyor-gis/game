import { tuning } from './params';
import type { Weapon } from './weapon';

/** Roadkill Mines: orqaga tashlanadi (mashina tezligi ustiga), yerga tushgach yaqinlashganda portlaydi (projectiles.ts). */
export const mine: Weapon = {
  id: 'mine',
  fire(ctx) {
    const t = tuning.mine;
    const lv = ctx.owner.body.linvel();
    const vel = ctx.forward.clone().multiplyScalar(-t.throwSpeed);
    vel.x += lv.x;
    vel.y += lv.y + t.throwUp;
    vel.z += lv.z;
    ctx.projectiles.spawn({ weapon: 'mine', owner: ctx.owner, pos: ctx.rear, vel, gravity: true, mine: true });
  },
};
