import * as THREE from 'three';
import { castSegment } from '../raycast';
import { glowMesh } from './fxShapes';
import { rnd } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'camper_bombs';
const dir = new THREE.Vector3();
const n = new THREE.Vector3();

function boom(ctx: SpecialContext, pos: THREE.Vector3, radius: number, damage: number): void {
  ctx.world.events.emit('explosion', { pos: pos.clone(), radius, damage, sourceId: ctx.owner.id });
}

/** Camper Bombs (Dave): orqaga sakrovchi 3 ta bomba; har sakrashda va oxirida portlaydi. */
export const camperBombs: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.camper_bombs;
    const back = ctx.forward.clone().setY(0).normalize().negate();
    for (let i = 0; i < p.count; i++) {
      const bomb = { pos: ctx.rear.clone(), vel: new THREE.Vector3(), bounces: 0, done: false };
      const a = p.count === 1 ? 0 : -p.spread + (2 * p.spread * i) / (p.count - 1);
      bomb.vel.copy(back).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).multiplyScalar(p.throwSpeed * rnd(0.8, 1.15));
      bomb.vel.y = p.throwUp;
      const mesh = glowMesh(new THREE.IcosahedronGeometry(p.size, 1), p.color, p.hdr);
      ctx.fx.add(mesh, p.lifetime + 0.5, {
        geos: [mesh.geometry], alive: () => !bomb.done,
        update: (_k, _dt, it) => {
          it.obj.position.copy(bomb.pos);
          it.obj.rotation.x = it.age * p.spinSpeed;
          it.obj.scale.setScalar(1 + 0.15 * Math.sin(it.age * 20));
        },
      });
      ctx.timers.run(p.lifetime, (dt) => {
        if (bomb.done) return;
        bomb.vel.y += ctx.world.physics.gravity.y * dt;
        const speed = bomb.vel.length();
        dir.copy(bomb.vel).divideScalar(speed);
        const hit = castSegment(ctx.world, bomb.pos, dir, speed * dt, ctx.owner.body);
        if (!hit) return void bomb.pos.addScaledVector(dir, speed * dt);
        bomb.pos.addScaledVector(dir, hit.t);
        if (hit.vehicle || bomb.bounces >= p.bounces) {
          bomb.done = true;
          return boom(ctx, bomb.pos, p.radius, p.damage);
        }
        bomb.bounces++;
        n.set(hit.normal.x, hit.normal.y, hit.normal.z);
        bomb.vel.addScaledVector(n, -(1 + p.restitution) * bomb.vel.dot(n));
        bomb.pos.addScaledVector(n, 0.1);
        boom(ctx, bomb.pos, p.bounceRadius, p.bounceDamage);
      }, () => {
        if (!bomb.done) boom(ctx, bomb.pos, p.radius, p.damage);
        bomb.done = true;
      });
    }
  },
};
