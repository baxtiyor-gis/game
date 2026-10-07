import * as THREE from 'three';
import type { System } from '../core/types';
import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createBarn } from './props/barn';
import { createSilo } from './props/silo';
import { createFarmhouse } from './props/farmhouse';
import { createWaterTower } from './props/waterTower';
import { createWindmill, WindmillSystem } from './props/windmill';
import { createBridge, buildCreek } from './props/bridge';
import { buildTrees } from './props/tree';
import type { TreeItem } from './props/tree';
import { buildFences } from './props/fence';
import { buildCrops } from './props/crops';
import { farm } from './props/farmKit';
import { propCfg, WORLD_GROUPS } from './props/common';
import type { Origin, PropBuild } from './props/common';

export const FARM_TYPES = new Set(['barn', 'silo', 'farmhouse', 'waterTower', 'tree', 'fence', 'crops', 'bridge', 'creek']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

/** Ko'prik ustki yuzasi qirg'oqda turishi uchun balandlik namunalari shu masofagacha cho'ziladi (m) */
const BANK_REACH = 14;

/** Group ichidagi InstancedMesh va o'z geometriyalarini (yamoq, suv) tozalaydi. */
function disposeGroup(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
    else if (o instanceof THREE.Mesh && o.userData.ownGeo) o.geometry.dispose();
  });
}

function single(ctx: BuildContext, def: PropDef, yaw: number, origin: OriginFn): PropBuild | null {
  const R = ctx.world.rapier;
  switch (def.type) {
    case 'barn': return createBarn(R, origin(def.pos, yaw, def.size?.[0] ?? 14, def.size?.[2] ?? 20), def);
    case 'farmhouse': return createFarmhouse(R, origin(def.pos, yaw, def.size?.[0] ?? 9, def.size?.[2] ?? 7.5), def);
    case 'silo': return createSilo(R, origin(def.pos, yaw, 5, 5), def);
    case 'waterTower': return createWaterTower(R, origin(def.pos, yaw, 7, 7));
    case 'bridge': return createBridge(R, origin(def.pos, yaw, (def.width ?? 6), (def.length ?? 18) + BANK_REACH), def);
    default: return null;
  }
}

/** Ferma proplari: yakka binolar (har biri alohida), daraxt/to'siq/ekin (to'plam), ariq suvi. */
export function populateFarmProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  const trees: TreeItem[] = [];
  const fences: PropDef[] = [];
  const R = ctx.world.rapier;
  const add = (o: THREE.Object3D): void => {
    ctx.root.add(o);
    ctx.onDispose(() => disposeGroup(o));
  };
  for (const def of defs) {
    const yaw = def.yaw ?? 0;
    const [x, z] = def.pos;
    if (def.type === 'tree') {
      const s = def.scale ?? 1;
      const y = ctx.heightAt(x, z);
      trees.push({ x, y, z, s, yaw });
      const r = farm.tree.colliderRadius * s;
      ctx.addCollider(R.ColliderDesc.cylinder(2 * s, r).setTranslation(x, y + 2 * s, z).setCollisionGroups(WORLD_GROUPS));
    } else if (def.type === 'fence') fences.push(def);
    else if (def.type === 'crops') add(buildCrops(def, ctx.heightAt));
    else if (def.type === 'creek') add(buildCreek(def.points ?? [], def.width ?? 6, propCfg.farm.creek.level));
    else {
      const b = single(ctx, def, yaw, origin);
      if (!b) throw new Error(`Noma'lum ferma propi: ${def.type}`);
      ctx.statics.push(b.object);
      ctx.onDispose(() => disposeGroup(b.object));
      for (const c of b.colliders) ctx.addCollider(c);
    }
  }
  if (trees.length > 0) add(buildTrees(trees));
  if (fences.length > 0) {
    add(buildFences(fences.map((f) => ({ x: f.pos[0], z: f.pos[1], yaw: f.yaw ?? 0, length: f.length ?? 10 })), ctx.heightAt));
    for (const f of fences) {
      const yaw = f.yaw ?? 0;
      const len = f.length ?? 10;
      const o = origin(f.pos, yaw, farm.fence.colliderThickness, len);
      const half = [farm.fence.colliderThickness / 2, farm.fence.height / 2, len / 2] as const;
      ctx.addCollider(R.ColliderDesc.cuboid(...half).setTranslation(o.x, o.y + half[1], o.z).setRotation(yawQuat(yaw)).setCollisionGroups(WORLD_GROUPS));
    }
  }
}

function yawQuat(yaw: number): { x: number; y: number; z: number; w: number } {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

/** Shamol tegirmonlari (interaktiv): aylanuvchi rotorlar uchun System. */
export function populateWindmills(ctx: BuildContext, origin: OriginFn): System | null {
  const rigs: Array<{ rotor: THREE.Group; speed: number }> = [];
  ctx.def.interactives.forEach((def, i) => {
    if (def.type !== 'windmill') return;
    const rig = createWindmill(ctx.world.rapier, origin(def.pos, def.yaw ?? 0, 3, 3));
    ctx.root.add(rig.build.object);
    ctx.onDispose(() => disposeGroup(rig.build.object));
    for (const c of rig.build.colliders) ctx.addCollider(c);
    rigs.push({ rotor: rig.rotor, speed: (def.speed ?? farm.windmill.speed) * (1 + (i % 3) * 0.12) });
  });
  return rigs.length > 0 ? new WindmillSystem(rigs) : null;
}
