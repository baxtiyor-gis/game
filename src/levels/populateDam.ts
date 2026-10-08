import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createDamWall } from './props/damWall';
import { createPowerHouse } from './props/powerHouse';
import { createPowerPylon } from './props/powerPylon';
import { createIntakeTower } from './props/intakeTower';
import { createCliff } from './props/cliff';
import type { Origin, PropBuild } from './props/common';

export const DAM_TYPES = new Set(['damWall', 'powerHouse', 'powerPylon', 'intakeTower', 'cliff']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

function single(ctx: BuildContext, def: PropDef, origin: OriginFn): PropBuild {
  const R = ctx.world.rapier;
  const yaw = def.yaw ?? 0;
  const size = def.size ?? [0, 0, 0];
  switch (def.type) {
    case 'damWall':
      return createDamWall(R, def, ctx.heightAt, ctx.def.size, ctx.def.terrain.resolution);
    case 'powerHouse':
      return createPowerHouse(R, origin(def.pos, yaw, size[0] || 56, size[2] || 22), def);
    case 'powerPylon':
      return createPowerPylon(R, origin(def.pos, yaw, 5, 5), def, ctx.heightAt);
    case 'intakeTower':
      return createIntakeTower(R, { x: def.pos[0], y: ctx.heightAt(def.pos[0], def.pos[1]), z: def.pos[1], yaw }, def);
    case 'cliff':
      return createCliff(R, { x: def.pos[0], y: ctx.heightAt(def.pos[0], def.pos[1]), z: def.pos[1], yaw }, def);
    default:
      throw new Error(`Noma'lum to'g'on propi: ${def.type}`);
  }
}

/** Hoover Dam proplari: to'g'on devori, elektr stansiyasi, ustunlar (sim bilan), suv olish minorasi, qoyalar (hammasi statik, birlashtiriladi). */
export function populateDamProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  for (const def of defs) {
    const b = single(ctx, def, origin);
    ctx.statics.push(b.object);
    for (const c of b.colliders) ctx.addCollider(c);
  }
}
