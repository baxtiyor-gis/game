import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import type { Arena, ArenaDef, LoadOptions } from './types';
import { buildTerrain } from './terrain';
import { BuildContext } from './context';
import { buildBoundary } from './boundary';
import { populateDestructibles, populateInteractives, populateProps } from './populate';
import { DestructibleSystem } from './destructible';
import { disposePropCaches } from './props/common';

export type { Arena, ArenaDef, LoadOptions } from './types';
export { DestructibleSystem } from './destructible';

/** Arena JSON dan sahna quradi: terrain, chegara, proplar, destructible/interaktivlar, spawnlar, sandiq joylari. */
export async function loadArena(world: GameWorld, def: ArenaDef, opts: LoadOptions = {}): Promise<Arena> {
  const terrain = buildTerrain(world, def.terrain, def.size);
  const ctx = new BuildContext(world, def, terrain.heightAt);
  buildBoundary(ctx);
  populateProps(ctx);
  const systems: System[] = [];
  const pumps = populateInteractives(ctx);
  if (pumps) systems.push(pumps);
  const destructibles = new DestructibleSystem(world, populateDestructibles(ctx), opts.onDrop);
  systems.push(destructibles);
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
