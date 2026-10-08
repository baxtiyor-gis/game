import * as THREE from 'three';
import type { System } from '../core/types';
import type { BuildContext } from './context';
import { createRadar } from './props/radarDish';

export interface RadarRig {
  x: number;
  z: number;
  rotor: THREE.Group;
  speed: number;
  angle: number;
  prev: number;
}

/** Aylanuvchi radar antennalari: burchak 60 Hz qadamda, render interpolatsiya bilan. */
export class RadarSystem implements System {
  readonly name = 'radars';

  constructor(readonly rigs: RadarRig[]) {}

  fixedUpdate(dt: number): void {
    for (const r of this.rigs) {
      r.prev = r.angle;
      r.angle += r.speed * dt;
    }
  }

  update(_dt: number, alpha: number): void {
    for (const r of this.rigs) r.rotor.rotation.y = r.prev + (r.angle - r.prev) * alpha;
  }
}

/** Arena qurilishida: interactives dagi 'radar' lar (statik bino + aylanuvchi antenna). Antenna dinamik — birlashtirilmaydi. */
export function createRadars(ctx: BuildContext): RadarSystem | null {
  const rigs: RadarRig[] = [];
  for (const def of ctx.def.interactives) {
    if (def.type !== 'radar') continue;
    const [x, z] = def.pos;
    const yaw = def.yaw ?? 0;
    const y = ctx.heightAt(x, z);
    const radar = createRadar(ctx.world.rapier, { x, y, z, yaw }, def.variant);
    ctx.statics.push(radar.build.object);
    for (const c of radar.build.colliders) ctx.addCollider(c);
    ctx.root.add(radar.rotor);
    rigs.push({ x, z, rotor: radar.rotor, speed: def.speed ?? radar.speed, angle: x * 0.01, prev: x * 0.01 });
  }
  return rigs.length > 0 ? new RadarSystem(rigs) : null;
}
