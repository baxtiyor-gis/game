import * as THREE from 'three';
import type { Rapier, System } from '../core/types';
import type { BuildContext } from './context';
import type { PropDef } from './types';
import { createPumpjack, PumpjackSystem } from './props/pumpjack';
import { createPipe } from './props/pipe';
import { createBuilding } from './props/building';
import { createStation } from './props/station';
import { buildRocks } from './props/rocks';
import type { RockItem } from './props/rocks';
import { BarrelField } from './props/barrels';
import { createTankVisual } from './props/tank';
import type { DestructibleVisual } from './props/tank';
import { propCfg, WORLD_GROUPS } from './props/common';
import type { Origin, PropBuild } from './props/common';
import { FARM_TYPES, populateFarmProps, populateWindmills } from './populateFarm';
import { AIR_TYPES, populateAirProps } from './populateAir';
import { BASE_TYPES, populateBaseProps } from './populateBase';
import { DAM_TYPES, populateDamProps } from './populateDam';
import { SKI_TYPES, populateSkiProps } from './populateSki';
import { createTransformerVisual } from './props/transformer';
import { createFuelTankVisual } from './props/fuelTank';
import { createPropaneVisual } from './props/propaneTank';
import { createLiftPylonVisual } from './props/liftPylon';
import { destructibleTypes } from './destructible';
import type { DestructibleItem } from './destructible';

/** Maydon markazi va burchaklaridan eng baland yer (m): qiya joyda prop havoda emas, ko'milgan bo'ladi. */
function groundY(ctx: BuildContext, x: number, z: number, yaw: number, w: number, d: number): number {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let y = ctx.heightAt(x, z);
  for (const [lx, lz] of [[w, d], [-w, d], [w, -d], [-w, -d]] as const) {
    y = Math.max(y, ctx.heightAt(x + lx * c + lz * s, z - lx * s + lz * c));
  }
  return y;
}

function attach(ctx: BuildContext, b: PropBuild, isStatic = false): void {
  if (isStatic) ctx.statics.push(b.object);
  else ctx.root.add(b.object);
  for (const d of b.colliders) ctx.addCollider(d);
}

function origin(ctx: BuildContext, p: [number, number], yaw: number, w: number, d: number): Origin {
  return { x: p[0], y: groundY(ctx, p[0], p[1], yaw, w / 2, d / 2), z: p[1], yaw };
}

/** Statik proplar: bino, quvur, shoxobcha (har biri alohida), qoyalar (InstancedMesh). */
export function populateProps(ctx: BuildContext): void {
  const R = ctx.world.rapier;
  const rocks: RockItem[] = [];
  const farmDefs = ctx.def.props.filter((d) => FARM_TYPES.has(d.type));
  const airDefs = ctx.def.props.filter((d) => AIR_TYPES.has(d.type));
  const baseDefs = ctx.def.props.filter((d) => BASE_TYPES.has(d.type));
  const damDefs = ctx.def.props.filter((d) => DAM_TYPES.has(d.type));
  const skiDefs = ctx.def.props.filter((d) => SKI_TYPES.has(d.type));
  for (const def of ctx.def.props) {
    if (FARM_TYPES.has(def.type) || AIR_TYPES.has(def.type) || BASE_TYPES.has(def.type) || DAM_TYPES.has(def.type) || SKI_TYPES.has(def.type)) continue;
    const yaw = def.yaw ?? 0;
    const s = def.scale ?? 1;
    if (def.type === 'rock') {
      const y = ctx.heightAt(def.pos[0], def.pos[1]);
      rocks.push({ x: def.pos[0], y, z: def.pos[1], yaw, sx: 1.2 * s, sy: s, sz: s });
      const r = s * propCfg.rock.colliderFactor;
      ctx.addCollider(R.ColliderDesc.ball(r).setTranslation(def.pos[0], y + r * 0.5, def.pos[1]).setCollisionGroups(WORLD_GROUPS));
      continue;
    }
    attach(ctx, buildStatic(R, ctx, def, yaw), true);
  }
  if (rocks.length > 0) {
    const m = buildRocks(rocks);
    ctx.root.add(m);
    ctx.onDispose(() => m.dispose());
  }
  if (farmDefs.length > 0) populateFarmProps(ctx, farmDefs, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
  if (airDefs.length > 0) populateAirProps(ctx, airDefs, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
  if (baseDefs.length > 0) populateBaseProps(ctx, baseDefs, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
  if (damDefs.length > 0) populateDamProps(ctx, damDefs, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
  if (skiDefs.length > 0) populateSkiProps(ctx, skiDefs, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
}

function buildStatic(R: Rapier, ctx: BuildContext, def: PropDef, yaw: number): PropBuild {
  switch (def.type) {
    case 'building': {
      const [w, , d] = def.size ?? [10, 5, 14];
      return createBuilding(R, origin(ctx, def.pos, yaw, w, d), def);
    }
    case 'pipe':
      return createPipe(R, origin(ctx, def.pos, yaw, 1, def.length ?? 20), def);
    case 'station':
      return createStation(R, origin(ctx, def.pos, yaw, 14, 20));
    default:
      throw new Error(`Noma'lum prop turi: ${def.type}`);
  }
}

/** Interaktivlar: animatsiyali nasoslar (System qaytaradi). Shamol tegirmonlari — populateWindmills. */
export function populateInteractives(ctx: BuildContext): System | null {
  const R = ctx.world.rapier;
  const rigs: ConstructorParameters<typeof PumpjackSystem>[0] = [];
  ctx.def.interactives.forEach((def, i) => {
    if (def.type !== 'pumpjack') return;
    const rig = createPumpjack(R, origin(ctx, def.pos, def.yaw ?? 0, 3, 9));
    attach(ctx, rig.build);
    rigs.push({ rig, speed: def.speed ?? propCfg.pumpjack.speed, phase: i * 1.7 });
  });
  return rigs.length > 0 ? new PumpjackSystem(rigs) : null;
}

/** Destructible turi -> vizual yaratuvchi (sferik tank — standart). */
function visualFactory(type: string): typeof createTankVisual {
  if (type === 'fuelTank') return createFuelTankVisual;
  if (type === 'transformer') return createTransformerVisual;
  if (type === 'propaneTank') return createPropaneVisual;
  if (type === 'liftPylon') return createLiftPylonVisual;
  return createTankVisual;
}

/** Destructible obyektlar: kollayder + vizual (tank — alohida, bochka — InstancedMesh). */
export function populateWindmillRigs(ctx: BuildContext): System | null {
  return populateWindmills(ctx, (p, yaw, w, d) => origin(ctx, p, yaw, w, d));
}

export function populateDestructibles(ctx: BuildContext): DestructibleItem[] {
  const R = ctx.world.rapier;
  const specs = ctx.def.destructibles.map((d) => {
    const cfg = destructibleTypes[d.type];
    if (!cfg) throw new Error(`Noma'lum destructible turi: ${d.type}`);
    const [x, z] = d.pos;
    return { d, cfg, x, z, y: groundY(ctx, x, z, 0, cfg.radius, cfg.radius) };
  });
  const barrels = specs.filter((s) => s.d.type === 'barrel').map((s) => ({ x: s.x, y: s.y, z: s.z, yaw: s.d.yaw ?? 0 }));
  const field = new BarrelField(ctx.root, destructibleTypes.barrel!, barrels);
  ctx.onDispose(() => field.dispose(ctx.root));

  const items: DestructibleItem[] = [];
  const counts: Record<string, number> = {};
  for (const { d, cfg, x, z, y } of specs) {
    const n = (counts[d.type] = (counts[d.type] ?? 0) + 1);
    let visual: DestructibleVisual;
    if (d.type === 'barrel') visual = field.visual(n - 1);
    else {
      visual = visualFactory(d.type)(cfg, ctx.root, x, y, z, d.yaw ?? 0);
      ctx.onDispose(() => visual.dispose());
    }
    const desc = R.ColliderDesc.cylinder(cfg.height / 2, cfg.radius).setTranslation(x, y + cfg.height / 2, z).setCollisionGroups(WORLD_GROUPS);
    items.push({ id: `${d.type}-${n}`, type: cfg, pos: new THREE.Vector3(x, y, z), collider: ctx.addCollider(desc), visual, drop: d.drop });
  }
  return items;
}
