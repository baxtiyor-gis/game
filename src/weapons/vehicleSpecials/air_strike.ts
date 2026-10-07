import * as THREE from 'three';
import { flatRing, glowMat, glowMesh } from './fxShapes';
import { groundY, nearestFoe, rnd } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'air_strike';

/** Zarba markazi: oldidagi eng yaqin raqib, bo'lmasa oldinga `blindDistance` m nuqta. */
function center(ctx: SpecialContext): THREE.Vector3 {
  const p = vsp.air_strike;
  const me = ctx.owner.position(new THREE.Vector3());
  const t = nearestFoe(ctx, me, ctx.forward, p.aimRange, p.aimCone);
  const c = t ? t.position(new THREE.Vector3()) : me.clone().addScaledVector(ctx.forward.clone().setY(0).normalize(), p.blindDistance);
  c.y = groundY(ctx, c.x, c.z, c.y, 0);
  return c;
}

/** Air Strike (Loki): nishon atrofiga 2 s dan keyin yuqoridan 5 ta raketa tushadi (yerda qizil belgi). */
export const airStrike: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.air_strike;
    const c = center(ctx);
    const total = p.delay + p.count * p.stagger;
    const ringGeo = flatRing(0.9);
    const big = new THREE.Mesh(ringGeo, glowMat(p.markerColor, p.hdr));
    big.position.copy(c).setY(c.y + 0.15);
    big.scale.setScalar(p.radius);
    ctx.fx.add(big, total, { geos: [ringGeo], update: (_k, _dt, it) => (it.obj.visible = Math.sin(it.age * 10) > -0.3) });
    const shots = Array.from({ length: p.count }, (_, i) => {
      const a = rnd(0, Math.PI * 2);
      const r = i === 0 ? 0 : Math.sqrt(Math.random()) * p.radius;
      const pos = new THREE.Vector3(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r);
      pos.y = groundY(ctx, pos.x, pos.z, c.y + 5, c.y);
      return { pos, at: p.delay + i * p.stagger, falling: false, done: false };
    });
    const markGeo = new THREE.CircleGeometry(0.7, 12).rotateX(-Math.PI / 2);
    for (const s of shots) {
      const m = new THREE.Mesh(markGeo, glowMat(p.markerColor, p.hdr));
      m.position.copy(s.pos).setY(s.pos.y + 0.2);
      ctx.fx.add(m, s.at, { update: (_k, _dt, it) => (it.obj.scale.setScalar(1 + Math.sin(it.age * 14) * 0.25)) });
    }
    const rocketGeo = new THREE.ConeGeometry(0.22, 1.4, 8).rotateX(Math.PI);
    ctx.timers.run(total + 0.05, (_dt, t) => {
      for (const s of shots) {
        if (!s.falling && t >= s.at - p.fallTime) {
          s.falling = true;
          const r = glowMesh(rocketGeo, p.rocketColor, p.rocketHdr);
          const streak = glowMesh(new THREE.CylinderGeometry(0.05, 0.12, 9, 6), p.rocketColor, p.rocketHdr * 0.6, 0.5);
          streak.position.y = 5;
          r.add(streak);
          ctx.fx.add(r, p.fallTime, {
            geos: [streak.geometry],
            update: (k, _d, it) => it.obj.position.set(s.pos.x, s.pos.y + (1 - k) * p.dropHeight, s.pos.z),
          });
        }
        if (!s.done && t >= s.at) {
          s.done = true;
          ctx.world.events.emit('explosion', { pos: s.pos.clone().setY(s.pos.y + 0.4), radius: p.splash, damage: p.damage, sourceId: ctx.owner.id });
        }
      }
    }, () => {
      markGeo.dispose();
      rocketGeo.dispose();
    });
  },
};
