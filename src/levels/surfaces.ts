import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import type { BuildContext } from './context';
import { buildSurfaceMeshes } from './surfaceMesh';
import type { SurfaceDef } from './types';
import { makeZone } from './waterMesh';
import { ski } from './props/skiKit';

const GRIP = ski.grip as Record<SurfaceDef['type'], number>;
const tmp = new THREE.Vector3();

export interface GripZone {
  grip: number;
  contains(x: number, z: number): boolean;
}

/** Zona: doira (`pos`+`radius`) yoki `rect` / `path`+`width` (suv zonalari bilan bir xil geometriya). */
export function makeGripZone(def: SurfaceDef): GripZone {
  const grip = GRIP[def.type];
  if (def.pos && def.radius) {
    const [cx, cz] = def.pos;
    const r = def.radius;
    return { grip, contains: (x, z) => Math.hypot(x - cx, z - cz) <= r };
  }
  const zone = makeZone({ id: def.type, y: 0, rect: def.rect, path: def.path, width: def.width });
  return { grip, contains: (x, z) => zone.contains(x, z) };
}

/**
 * Sirt zonalari: mashina zona ichida bo'lsa `VehicleHandle.surfaceGrip` (g'ildirak ishqalanishi ko'paytirgichi) har tick
 * yoziladi — muz ~0.25, qor ~0.7, qolgan joyda 1. Bir nechta zona qoplasa eng pasti. Botlar ham shu orqali sirpanadi.
 */
export class SurfaceSystem implements System {
  readonly name = 'surfaces';

  constructor(
    private readonly world: GameWorld,
    readonly zones: GripZone[],
    private readonly cleanup: () => void = () => undefined,
  ) {}

  /** (x,z) dagi ishqalanish ko'paytirgichi */
  gripAt(x: number, z: number): number {
    let g = 1;
    for (const zn of this.zones) if (zn.grip < g && zn.contains(x, z)) g = zn.grip;
    return g;
  }

  fixedUpdate(): void {
    for (const v of this.world.vehicles) {
      v.position(tmp);
      v.surfaceGrip = this.gripAt(tmp.x, tmp.z);
    }
  }

  dispose(): void {
    for (const v of this.world.vehicles) v.surfaceGrip = 1;
    this.cleanup();
  }
}

/** Arena qurilishida: def.surfaces -> zonalar + vizual (muz yuzasi, yo'l lentasi). */
export function createSurfaces(ctx: BuildContext): SurfaceSystem | null {
  const defs = ctx.def.surfaces;
  if (!defs || defs.length === 0) return null;
  const meshes = buildSurfaceMeshes(defs, ctx.heightAt);
  ctx.root.add(meshes.group);
  return new SurfaceSystem(ctx.world, defs.map(makeGripZone), meshes.dispose);
}
