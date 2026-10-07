import * as THREE from 'three';
import { tuning } from '../params';
import { sp } from './params';
import type { SpecialMove } from './types';
import { fanAngles, launch, vehiclesNear, yawed } from './util';

const TAU = Math.PI * 2;

/** Bear Hug: portlaganda nishonni yerga bosib, qisqa vaqt sekinlashtiradigan mina. */
const bearHug: SpecialMove = {
  id: 'mine.bear_hug',
  fire(ctx) {
    const p = sp.mine.bear_hug;
    const t = tuning.mine;
    const vel = ctx.forward.clone().multiplyScalar(-t.throwSpeed);
    vel.y += t.throwUp;
    ctx.projectiles.spawn({
      weapon: 'mine', tag: 'mine.bear_hug', owner: ctx.owner, pos: ctx.rear, vel, gravity: true, mine: true,
      scale: { damage: p.damageScale },
      onExplode(pos) {
        for (const v of vehiclesNear(ctx, pos, p.radius)) {
          ctx.timers.run(p.duration, (dt) => {
            if (!v.alive) return;
            const k = Math.exp(-p.damping * dt);
            const lv = v.body.linvel();
            v.body.setLinvel({ x: lv.x * k, y: lv.y - p.pressDown * dt, z: lv.z * k }, true);
            const av = v.body.angvel();
            v.body.setAngvel({ x: av.x * k, y: av.y * k, z: av.z * k }, true);
          });
        }
      },
    });
  },
};

/** Cactus Patch: atrofga bir nechta mina sochadi. */
const cactusPatch: SpecialMove = {
  id: 'mine.cactus_patch',
  fire(ctx) {
    const p = sp.mine.cactus_patch;
    for (let i = 0; i < p.count; i++) {
      const dir = yawed(ctx.forward, (TAU * i) / p.count);
      const vel = dir.multiplyScalar(p.throwSpeed);
      vel.y += p.throwUp;
      const pos = ctx.owner.position(new THREE.Vector3()).setY(ctx.rear.y);
      ctx.projectiles.spawn({ weapon: 'mine', tag: 'mine.cactus_patch', owner: ctx.owner, pos, vel, gravity: true, mine: true });
    }
  },
};

/** Hovering Mines: oldinga uchib, birozdan keyin havoda to'xtab nishonni kutadi. */
const hoveringMines: SpecialMove = {
  id: 'mine.hovering_mines',
  fire(ctx) {
    const p = sp.mine.hovering_mines;
    for (const k of fanAngles(p.count, p.lateral)) {
      const dir = yawed(ctx.forward, k);
      launch(ctx, 'mine', 'mine.hovering_mines', dir, {
        mine: true,
        vel: dir.clone().multiplyScalar(p.speed),
        onStep(proj) {
          if (proj.age < p.hoverAfter) return;
          proj.vel.set(0, 0, 0);
          proj.landed = true;
        },
      });
    }
  },
};

export const mineMoves: SpecialMove[] = [bearHug, cactusPatch, hoveringMines];
