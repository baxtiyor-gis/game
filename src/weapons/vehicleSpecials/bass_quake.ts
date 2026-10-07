import * as THREE from 'three';
import { flatRing, glowMat } from './fxShapes';
import { flatDist, foes, groundY, hurt, rnd } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'bass_quake';

/** Bass Quake (John Torque): atrofga zilzila to'lqini; radius ichidagi mashinalar yuqoriga uloqtiriladi + zarar (masofaga qarab). */
export const bassQuake: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.bass_quake;
    const c = ctx.owner.position(new THREE.Vector3());
    const gy = groundY(ctx, c.x, c.z, c.y, c.y - ctx.owner.def.size[1] / 2) + 0.12;
    const group = new THREE.Group();
    group.position.set(c.x, gy, c.z);
    const geo = flatRing(1 - p.ringWidth);
    const discGeo = flatRing(0);
    group.add(new THREE.Mesh(discGeo, glowMat(p.color, p.hdr, p.fill)));
    for (let i = 0; i < p.rings; i++) group.add(new THREE.Mesh(geo, glowMat(p.color, p.hdr)));
    ctx.fx.add(group, p.life, {
      geos: [geo, discGeo],
      fadeStart: 0.55,
      update: (_k, _dt, it) => {
        group.children.forEach((ring, j) => {
          const i = j - 1; // 0-bola: to'ldiruvchi disk (birinchi halqa bilan birga kengayadi)
          const f = Math.max(0, Math.min(1, (it.age - Math.max(0, i) * p.ringGap) / p.expandTime));
          ring.scale.setScalar(Math.max(0.01, f * p.radius));
          ring.visible = f > 0;
        });
      },
    });
    ctx.world.events.emit('shake', { pos: c.clone(), radius: p.shakeRadius });
    const hit = new Set<string>();
    const pos = new THREE.Vector3();
    ctx.timers.run(p.expandTime, (_dt, t) => {
      const front = (Math.min(t, p.expandTime) / p.expandTime) * p.radius;
      for (const v of foes(ctx)) {
        v.position(pos);
        const d = flatDist(pos, c);
        if (hit.has(v.id) || d > front) continue;
        hit.add(v.id);
        const near = 1 - d / p.radius;
        const m = v.body.mass();
        const away = pos.clone().sub(c).setY(0).normalize();
        v.body.applyImpulse({ x: away.x * m * p.push * near, y: m * p.lift * (0.4 + 0.6 * near), z: away.z * m * p.push * near }, true);
        v.body.applyTorqueImpulse({ x: rnd(-1, 1) * m * 0.5 * near, y: rnd(-1, 1) * m * 0.5 * near, z: rnd(-1, 1) * m * 0.5 * near }, true);
        hurt(ctx, ID, v, p.maxDamage * (p.minDamageFrac + (1 - p.minDamageFrac) * near));
      }
    });
  },
};
