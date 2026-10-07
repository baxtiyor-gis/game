import * as THREE from 'three';
import { flatDist, foes, rnd, statusOf } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'smoke_screen';

/** Smoke Screen (Molo): orqadan katta tutun pardasi (ichida radar/AI nishon yo'qoladi) + mina sochadi. */
export const smokeScreen: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.smoke_screen;
    const back = ctx.forward.clone().setY(0).normalize().negate();
    const c = ctx.owner.position(new THREE.Vector3()).addScaledVector(back, p.offset);
    const geo = new THREE.SphereGeometry(1, 12, 8);
    for (let i = 0; i < p.puffs; i++) {
      const a = rnd(0, Math.PI * 2);
      const r = Math.sqrt(Math.random()) * p.radius * 0.8;
      const size = p.puffSize * rnd(0.7, 1.3);
      const mat = new THREE.MeshLambertMaterial({ color: p.color, transparent: true, opacity: p.opacity, depthWrite: false });
      const puff = new THREE.Mesh(geo, mat);
      puff.position.set(c.x + Math.cos(a) * r, c.y + size * 0.3 + rnd(0, 1.5), c.z + Math.sin(a) * r);
      const drift = new THREE.Vector3(rnd(-1, 1), 0.2, rnd(-1, 1)).multiplyScalar(0.3);
      ctx.fx.add(puff, p.duration, {
        fadeStart: 0.8,
        update: (_k, dt, it) => {
          it.obj.scale.setScalar(size * Math.min(1, it.age / p.growTime));
          it.obj.position.addScaledVector(drift, dt);
        },
      });
    }
    for (let i = 0; i < p.mines; i++) {
      const vel = back.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rnd(-0.6, 0.6)).multiplyScalar(p.mineThrow);
      vel.y += p.mineUp;
      ctx.projectiles.spawn({
        weapon: 'mine', tag: `special.${ID}`, owner: ctx.owner, pos: ctx.rear.clone(), vel, gravity: true, mine: true,
      });
    }
    const inside = new Set<string>();
    const pos = new THREE.Vector3();
    ctx.timers.run(p.duration, () => {
      for (const v of [ctx.owner, ...foes(ctx)]) {
        if (!v.alive || flatDist(v.position(pos), c) > p.radius) continue;
        const st = statusOf(v);
        if (!inside.has(v.id)) {
          inside.add(v.id);
          ctx.world.events.emit('status', { targetId: v.id, kind: 'smoke', duration: p.refresh });
        }
        st.smoke = Math.max(st.smoke, p.refresh);
      }
    }, () => geo.dispose());
  },
};
