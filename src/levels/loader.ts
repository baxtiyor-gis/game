import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import type { Arena, ArenaDef, LoadOptions } from './types';
import { buildTerrain } from './terrain';
import { BuildContext } from './context';
import { buildBoundary } from './boundary';
import { populateDestructibles, populateInteractives, populateProps, populateWindmillRigs } from './populate';
import { DestructibleSystem } from './destructible';
import { createTrain } from './train';
import { createCranes } from './crane';
import { createPlanes } from './planes';
import { disposePropCaches } from './props/common';
import { mergeStatic } from './mergeStatic';
import { timed, yieldFrame } from '../core/perf';

export type { Arena, ArenaDef, LoadOptions } from './types';
export { DestructibleSystem } from './destructible';

/** Arena JSON dan sahna quradi: terrain, chegara, proplar, destructible/interaktivlar, spawnlar, sandiq joylari. */
export async function loadArena(world: GameWorld, def: ArenaDef, opts: LoadOptions = {}): Promise<Arena> {
  const progress = opts.onProgress ?? (() => undefined);
  const terrain = timed('terrain', () => buildTerrain(world, def.terrain, def.size));
  progress(0.35);
  await yieldFrame();
  const ctx = new BuildContext(world, def, terrain.heightAt);
  timed('boundary', () => buildBoundary(ctx));
  timed('props', () => populateProps(ctx));
  const cranes = timed('cranes', () => createCranes(ctx, opts.onDrop)); // statik karkas merge dan oldin qo'shilishi kerak
  ctx.onDispose(timed('merge', () => mergeStatic(ctx.statics, ctx.root)));
  progress(0.65);
  await yieldFrame();
  const systems: System[] = [];
  const pumps = timed('interactives', () => populateInteractives(ctx));
  if (pumps) systems.push(pumps);
  const windmills = timed('windmills', () => populateWindmillRigs(ctx));
  if (windmills) systems.push(windmills);
  if (def.train) systems.push(timed('train', () => createTrain(ctx, def.train!, opts.onDrop)));
  if (cranes) systems.push(cranes);
  if (def.planes?.length) systems.push(timed('planes', () => createPlanes(ctx, def.planes!)));
  const destructibles = new DestructibleSystem(world, timed('destructibles', () => populateDestructibles(ctx)), opts.onDrop);
  systems.push(destructibles);
  progress(1);
  for (const s of systems) world.addSystem(s);

  const spawns = def.playerSpawns.map((s) => ({
    pos: new THREE.Vector3(s.pos[0], terrain.heightAt(s.pos[0], s.pos[1]) + def.spawnLift, s.pos[1]),
    yaw: s.yaw,
  }));
  const pickupSpawns = def.pickupSpawns.map((p) => ({
    pos: [p.pos[0], terrain.heightAt(p.pos[0], p.pos[2]) + p.pos[1], p.pos[2]] as [number, number, number],
    kind: p.kind,
  }));

  return {
    def,
    spawns,
    pickupSpawns,
    heightAt: terrain.heightAt,
    destructibles,
    dispose() {
      for (const s of systems) world.removeSystem(s);
      ctx.dispose();
      terrain.dispose();
      disposePropCaches();
    },
  };
}
