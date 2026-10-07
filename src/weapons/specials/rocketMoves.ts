import * as THREE from 'three';
import { sp } from './params';
import type { SpecialMove } from './types';
import { fanAngles, launch, yawed } from './util';

const TAU = Math.PI * 2;

/** Road Runner: yer bo'ylab ilon izi bo'ylab uchuvchi kuchli raketa. */
const roadRunner: SpecialMove = {
  id: 'rocket.road_runner',
  fire(ctx) {
    const p = sp.rocket.road_runner;
    const flat = ctx.forward.clone().setY(0).normalize();
    launch(ctx, 'rocket', 'rocket.road_runner', flat, {
      scale: { damage: p.damageScale, splash: p.splashScale },
      onStep(proj, dt) {
        proj.vel.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.cos(proj.age * p.weaveFreq) * p.weaveRate * dt);
      },
    }, p.speedScale);
  },
};

/** Stampede: keng yelpig'ichli rocket salvosi. */
const stampede: SpecialMove = {
  id: 'rocket.stampede',
  fire(ctx) {
    const p = sp.rocket.stampede;
    for (const a of fanAngles(p.count, p.halfAngle)) {
      launch(ctx, 'rocket', 'rocket.stampede', yawed(ctx.forward, a), { scale: { damage: p.damageScale } });
    }
  },
};

/** Bastion: mashina ustidagi qisqa vaqtli, 360 daraja aylanib otuvchi turret. */
const bastion: SpecialMove = {
  id: 'rocket.bastion',
  fire(ctx) {
    const p = sp.rocket.bastion;
    const centre = new THREE.Vector3();
    let next = 0;
    ctx.timers.run(p.duration, (_dt, t) => {
      if (!ctx.owner.alive) return;
      while (t >= next) {
        next += p.interval;
        const a = (next * p.spinSpeed) % TAU;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        ctx.owner.position(centre);
        const pos = centre.clone().addScaledVector(dir, p.muzzleRadius).setY(centre.y + p.height);
        launch(ctx, 'rocket', 'rocket.bastion', dir, { pos, scale: { damage: p.damageScale } });
      }
    });
  },
};

export const rocketMoves: SpecialMove[] = [roadRunner, stampede, bastion];
