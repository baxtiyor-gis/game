import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createBunker } from './props/bunker';
import { createGuardTower, createLampPost } from './props/guardTower';
import { createMilitaryTruck } from './props/militaryTruck';
import { createUfoWreck } from './props/ufoWreck';
import type { Origin, PropBuild } from './props/common';

export const BASE_TYPES = new Set(['bunker', 'guardTower', 'militaryTruck', 'ufoWreck', 'lampPost']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

function single(ctx: BuildContext, def: PropDef, origin: OriginFn): PropBuild {
  const R = ctx.world.rapier;
  const yaw = def.yaw ?? 0;
  switch (def.type) {
    case 'bunker':
      return createBunker(R, { x: def.pos[0], y: 0, z: def.pos[1], yaw }, ctx.heightAt);
    case 'guardTower':
      return createGuardTower(R, origin(def.pos, yaw, 4, 4));
    case 'lampPost':
      return createLampPost(R, origin(def.pos, yaw, 1, 1));
    case 'militaryTruck':
      return createMilitaryTruck(R, origin(def.pos, yaw, 3, 9), def.variant);
    case 'ufoWreck':
      return createUfoWreck(R, origin(def.pos, yaw, 12, 12));
    default:
      throw new Error(`Noma'lum baza propi: ${def.type}`);
  }
}

/** Maxfiy baza proplari: bunker, qo'riqlash minorasi, chiroq ustuni, harbiy yuk mashinasi, NUJ qoldig'i (hammasi statik, birlashtiriladi). */
export function populateBaseProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  for (const def of defs) {
    const b = single(ctx, def, origin);
    ctx.statics.push(b.object);
    for (const c of b.colliders) ctx.addCollider(c);
  }
}
