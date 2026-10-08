import * as THREE from 'three';
import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createAirplane, planeSpecs } from './props/airplane';
import { createHangar } from './props/hangar';
import { createControlTower } from './props/controlTower';
import { createRunway } from './props/runway';
import { buildBarbedFences } from './props/barbedFence';
import { air } from './props/airKit';
import { WORLD_GROUPS } from './props/common';
import type { Origin, PropBuild } from './props/common';

export const AIR_TYPES = new Set(['airplane', 'hangar', 'controlTower', 'runway', 'barbedFence']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

function single(ctx: BuildContext, def: PropDef, origin: OriginFn): PropBuild | null {
  const R = ctx.world.rapier;
  const yaw = def.yaw ?? 0;
  switch (def.type) {
    case 'airplane': {
      const sp = planeSpecs[def.variant ?? 'bomber'];
      return createAirplane(R, origin(def.pos, yaw, sp ? sp.wing.span : 20, sp ? sp.length : 20), def);
    }
    case 'hangar': {
      const [w, , d] = def.size ?? [air.hangar.width, 0, air.hangar.depth];
      return createHangar(R, origin(def.pos, yaw, w, d), def);
    }
    case 'controlTower':
      return createControlTower(R, origin(def.pos, yaw, air.tower.baseW, air.tower.baseW));
    case 'runway':
      return createRunway(def, ctx.heightAt);
    default:
      return null;
  }
}

/** Aviatsiya proplari: samolyot, angar, minora, yo'lak (statik, birlashtiriladi); tikanli sim to'siq (InstancedMesh + kollayder). */
export function populateAirProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  const R = ctx.world.rapier;
  const fences: PropDef[] = [];
  for (const def of defs) {
    if (def.type === 'barbedFence') {
      fences.push(def);
      continue;
    }
    const b = single(ctx, def, origin);
    if (!b) throw new Error(`Noma'lum aviatsiya propi: ${def.type}`);
    ctx.statics.push(b.object);
    for (const c of b.colliders) ctx.addCollider(c);
  }
  if (fences.length === 0) return;
  const g = buildBarbedFences(fences.map((f) => ({ x: f.pos[0], z: f.pos[1], yaw: f.yaw ?? 0, length: f.length ?? 10 })), ctx.heightAt);
  ctx.root.add(g);
  ctx.onDispose(() => g.children.forEach((m) => (m as THREE.InstancedMesh).dispose()));
  const t = air.barbed.colliderThickness;
  for (const f of fences) {
    const yaw = f.yaw ?? 0;
    const len = f.length ?? 10;
    const o = origin(f.pos, yaw, t, len);
    const half = [t / 2, air.barbed.height / 2 + 0.3, len / 2] as const;
    ctx.addCollider(R.ColliderDesc.cuboid(...half).setTranslation(o.x, o.y + half[1] - 0.3, o.z).setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }).setCollisionGroups(WORLD_GROUPS));
  }
}
