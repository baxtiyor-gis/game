import * as THREE from 'three';
import { weaponDef } from '../params';
import { acquireTarget, homingFor } from '../missile';
import type { HomingTarget } from '../projectiles';
import { sp } from './params';
import type { SpecialMove } from './types';
import { fanAngles, launch, yawed } from './util';

/** Halo Decoy: mashina atrofida aylanuvchi decoy unga qaratilgan homing raketalarni o'ziga tortadi va yutadi. */
const haloDecoy: SpecialMove = {
  id: 'missile.halo_decoy',
  fire(ctx) {
    const p = sp.missile.halo_decoy;
    const centre = new THREE.Vector3();
    const at = new THREE.Vector3();
    const decoy: HomingTarget = {
      alive: true,
      position: (out) => out.copy(at),
    };
    ctx.timers.run(
      p.duration,
      (_dt, t) => {
        if (!ctx.owner.alive) return void (decoy.alive = false);
        ctx.owner.position(centre);
        const a = t * p.orbitSpeed;
        at.set(centre.x + Math.cos(a) * p.orbitRadius, centre.y + p.height, centre.z + Math.sin(a) * p.orbitRadius);
        ctx.projectiles.divert(ctx.owner, decoy, p.absorbRadius);
      },
      () => (decoy.alive = false),
    );
  },
};

/** Afterburner: oldinga kuchli turtki + qisqa vaqt qo'shimcha tezlanish. */
const afterburner: SpecialMove = {
  id: 'missile.afterburner',
  fire(ctx) {
    const p = sp.missile.afterburner;
    const body = ctx.owner.body;
    const f = new THREE.Vector3();
    const kick = body.mass() * p.impulseSpeed;
    body.applyImpulse({ x: ctx.forward.x * kick, y: ctx.forward.y * kick, z: ctx.forward.z * kick }, true);
    ctx.timers.run(p.duration, (dt) => {
      if (!ctx.owner.alive) return;
      ctx.owner.forward(f).multiplyScalar(body.mass() * p.boostAccel * dt);
      body.applyImpulse({ x: f.x, y: f.y, z: f.z }, true);
    });
  },
};

/** Missile Swarm: bir vaqtda bir nechta homing raketa (yelpig'ich). */
const missileSwarm: SpecialMove = {
  id: 'missile.missile_swarm',
  fire(ctx) {
    const p = sp.missile.missile_swarm;
    const target = acquireTarget(ctx);
    for (const a of fanAngles(p.count, p.spread)) {
      const homing = homingFor(target, weaponDef('missile').homingTurnRate ?? 0);
      launch(ctx, 'missile', 'missile.missile_swarm', yawed(ctx.forward, a), { homing });
    }
  },
};

export const missileMoves: SpecialMove[] = [haloDecoy, afterburner, missileSwarm];
