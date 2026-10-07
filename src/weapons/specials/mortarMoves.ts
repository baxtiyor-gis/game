import * as THREE from 'three';
import { weaponDef } from '../params';
import { lobVelocity } from '../mortar';
import type { SpawnOpts } from '../projectiles';
import { sp } from './params';
import type { SpecialContext, SpecialMove } from './types';
import { vehiclesNear } from './util';

function lob(ctx: SpecialContext, tag: string, extra: Partial<SpawnOpts>): void {
  ctx.projectiles.spawn({
    weapon: 'mortar', tag, owner: ctx.owner, pos: ctx.muzzle, vel: lobVelocity(ctx.forward), gravity: true, ...extra,
  });
}

/** Turtle Turnover: nishonni ag'daradigan kuchli yuqori impuls va aylantiruvchi moment. */
const turtleTurnover: SpecialMove = {
  id: 'mortar.turtle_turnover',
  fire(ctx) {
    const p = sp.mortar.turtle_turnover;
    const f = new THREE.Vector3();
    lob(ctx, 'mortar.turtle_turnover', {
      scale: { damage: p.damageScale, splash: p.splashScale },
      onExplode(pos) {
        for (const v of vehiclesNear(ctx, pos, p.radius)) {
          const m = v.body.mass();
          v.body.applyImpulse({ x: 0, y: m * p.upSpeed, z: 0 }, true);
          v.forward(f).multiplyScalar(m * p.rollImpulsePerKg);
          v.body.applyTorqueImpulse({ x: f.x, y: f.y, z: f.z }, true);
        }
      },
    });
  },
};

/** Crater Maker: katta radiusli kuchli portlash. */
const craterMaker: SpecialMove = {
  id: 'mortar.crater_maker',
  fire(ctx) {
    const p = sp.mortar.crater_maker;
    lob(ctx, 'mortar.crater_maker', { scale: { damage: p.damageScale, splash: p.splashScale, knockback: p.knockbackScale } });
  },
};

/** Tire Buster: zarba + qisqa vaqt dvigatelni o'chiradi (stalled). */
const tireBuster: SpecialMove = {
  id: 'mortar.tire_buster',
  fire(ctx) {
    const p = sp.mortar.tire_buster;
    const radius = weaponDef('mortar').splashRadius * p.splashScale;
    lob(ctx, 'mortar.tire_buster', {
      scale: { damage: p.damageScale, splash: p.splashScale },
      onExplode(pos) {
        for (const v of vehiclesNear(ctx, pos, radius)) if (v !== ctx.owner) v.stalled = Math.max(v.stalled, p.stallTime);
      },
    });
  },
};

export const mortarMoves: SpecialMove[] = [turtleTurnover, craterMaker, tireBuster];
