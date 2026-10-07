import * as THREE from 'three';
import { castSegment } from '../raycast';
import { glowMesh } from './fxShapes';
import { foes, hurt, rnd } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'bee_swarm';
let beeGeo: THREE.BufferGeometry | undefined; // umumiy, hech qachon dispose qilinmaydi

interface Bee { pos: THREE.Vector3; vel: THREE.Vector3; phase: number; dead: boolean; target: ReturnType<typeof foes>[number] | null }

function nearest(ctx: SpecialContext, from: THREE.Vector3) {
  let best: ReturnType<typeof foes>[number] | null = null;
  let bd = vsp.bee_swarm.range;
  const q = new THREE.Vector3();
  for (const v of foes(ctx)) {
    const d = v.position(q).distanceTo(from);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

/** Bee Swarm (Beezwax): 6 ta kichik homing snaryad - sekin, lekin to'xtovsiz quvadi. */
export const beeSwarm: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.bee_swarm;
    const geo = (beeGeo ??= new THREE.OctahedronGeometry(p.size, 1));
    const bees: Bee[] = Array.from({ length: p.count }, () => {
      const pos = ctx.muzzle.clone().add(new THREE.Vector3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).multiplyScalar(p.spread));
      const vel = ctx.forward.clone().multiplyScalar(p.speed);
      vel.add(new THREE.Vector3(rnd(-1, 1) * p.speed * 0.6, p.launchUp, rnd(-1, 1) * p.speed * 0.6)).setLength(p.speed);
      return { pos, vel, phase: rnd(0, 6.28), dead: false, target: nearest(ctx, pos) };
    });
    for (const b of bees) {
      const m = glowMesh(geo, p.color, p.hdr);
      m.add(glowMesh(geo, '#ffffff', p.hdr * 0.6)).scale.setScalar(0.45);
      ctx.fx.add(m, p.lifetime + 0.2, {
        alive: () => !b.dead,
        update: (_k, _dt, it) => {
          const w = Math.sin(it.age * p.wobbleFreq + b.phase) * p.wobble;
          it.obj.position.set(b.pos.x - b.vel.z * 0.02 * w, b.pos.y + w * 0.4, b.pos.z + b.vel.x * 0.02 * w);
        },
      });
    }
    const want = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const q = new THREE.Vector3();
    ctx.timers.run(p.lifetime, (dt) => {
      for (const b of bees) {
        if (b.dead) continue;
        if (!b.target?.alive) b.target = nearest(ctx, b.pos);
        if (b.target) {
          want.copy(b.target.position(q)).sub(b.pos).normalize();
          dir.copy(b.vel).normalize();
          const ang = Math.min(dir.angleTo(want), p.turnRate * dt);
          axis.crossVectors(dir, want);
          if (axis.lengthSq() > 1e-10) b.vel.applyAxisAngle(axis.normalize(), ang);
        }
        const len = p.speed * dt;
        dir.copy(b.vel).setLength(1);
        const hit = castSegment(ctx.world, b.pos, dir, len + p.hitRadius * 0.5, ctx.owner.body);
        if (!hit) {
          b.pos.addScaledVector(dir, len);
          continue;
        }
        b.pos.addScaledVector(dir, hit.t);
        b.dead = true;
        if (hit.vehicle) hurt(ctx, ID, hit.vehicle, p.damage);
        ctx.world.events.emit('explosion', { pos: b.pos.clone(), radius: p.splashRadius, damage: 0, sourceId: ctx.owner.id });
      }
    }, () => {
      for (const b of bees) b.dead = true;
    });
  },
};
