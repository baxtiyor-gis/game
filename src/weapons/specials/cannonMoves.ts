import { sp } from './params';
import type { SpecialMove } from './types';
import { fanAngles, launch, yawed } from './util';

/** Cow Puncher: juda kuchli knockback. */
const cowPuncher: SpecialMove = {
  id: 'cannon.cow_puncher',
  fire(ctx) {
    const p = sp.cannon.cow_puncher;
    launch(ctx, 'cannon', 'cannon.cow_puncher', ctx.forward, {
      scale: { damage: p.damageScale, splash: p.splashScale, knockback: p.knockbackScale },
    });
  },
};

/** Buckshot: shotgun sochmasi (kichik zararli ko'p snaryad). */
const buckshot: SpecialMove = {
  id: 'cannon.buckshot',
  fire(ctx) {
    const p = sp.cannon.buckshot;
    const rows = fanAngles(p.rows, p.spread);
    fanAngles(p.pellets, p.spread).forEach((yaw, i) => {
      const dir = yawed(ctx.forward, yaw);
      dir.y += rows[i % p.rows];
      launch(ctx, 'cannon', 'cannon.buckshot', dir, {
        scale: { damage: p.damageScale, splash: p.splashScale, knockback: p.knockbackScale },
      }, p.speedScale);
    });
  },
};

/** Ricochet: devorlardan sakrab qaytuvchi snaryad (projectiles.ts `bounces`). */
const ricochet: SpecialMove = {
  id: 'cannon.ricochet',
  fire(ctx) {
    const p = sp.cannon.ricochet;
    launch(ctx, 'cannon', 'cannon.ricochet', ctx.forward, { bounces: p.bounces, scale: { damage: p.damageScale } });
  },
};

export const cannonMoves: SpecialMove[] = [cowPuncher, buckshot, ricochet];
