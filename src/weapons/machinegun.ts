import * as THREE from 'three';
import { findHitTarget } from '../core/hitTargets';
import { tuning } from './params';
import { castSegment } from './raycast';
import type { Weapon } from './weapon';

const dir = new THREE.Vector3();
const end = new THREE.Vector3();

/** Cheksiz pulemyot: hitscan + tracer. Zarar/cooldown data/weaponTuning.json "mg". */
export const machinegun: Weapon = {
  id: 'mg',
  fire(ctx) {
    const mg = tuning.mg;
    dir.copy(ctx.forward);
    dir.x += (Math.random() - 0.5) * mg.spread;
    dir.y += (Math.random() - 0.5) * mg.spread;
    dir.z += (Math.random() - 0.5) * mg.spread;
    dir.normalize();
    const hit = castSegment(ctx.world, ctx.muzzle, dir, mg.range, ctx.owner.body);
    end.copy(ctx.muzzle).addScaledVector(dir, hit ? hit.t : mg.range);
    ctx.effects.tracer(ctx.muzzle, end);
    if (hit?.vehicle?.alive) {
      ctx.world.events.emit('damage', { targetId: hit.vehicle.id, sourceId: ctx.owner.id, amount: mg.damage, weapon: 'mg' });
    } else if (hit && !hit.vehicle) {
      findHitTarget(ctx.world, hit.collider)?.damage(mg.damage, ctx.owner.id, 'mg');
    }
  },
};
