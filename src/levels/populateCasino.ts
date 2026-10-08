import type * as THREE from 'three';
import type { PickupKind, System } from '../core/types';
import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createCasinoTower } from './props/casinoTower';
import { createParkingGarage } from './props/parkingGarage';
import { createParkedCar } from './props/parkedCar';
import { createMotel } from './props/motel';
import { createWeddingChapel } from './props/weddingChapel';
import { createFountain } from './props/fountain';
import { createStrip } from './props/strip';
import { buildPalms } from './props/palmTree';
import type { PalmItem } from './props/palmTree';
import { casino } from './props/casinoKit';
import { WORLD_GROUPS } from './props/common';
import type { Origin, PropBuild } from './props/common';
import { createRouletteSigns } from './rouletteSign';
import { createJackpot } from './jackpot';

export const CASINO_TYPES = new Set(['casinoTower', 'garage', 'parkedCar', 'palmTree', 'motel', 'chapel', 'fountain', 'rouletteSign', 'strip']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

function single(ctx: BuildContext, def: PropDef, origin: OriginFn): PropBuild {
  const R = ctx.world.rapier;
  const yaw = def.yaw ?? 0;
  switch (def.type) {
    case 'casinoTower': {
      const [w, , d] = def.size ?? [34, 44, 30];
      return createCasinoTower(R, origin(def.pos, yaw, w, d), def);
    }
    case 'garage': {
      const [w, , d] = def.size ?? casino.garage.size;
      return createParkingGarage(R, origin(def.pos, yaw, w, d), def);
    }
    case 'parkedCar':
      return createParkedCar(R, origin(def.pos, yaw, casino.car.size[0], casino.car.size[2]), def);
    case 'motel':
      return createMotel(R, origin(def.pos, yaw, 40, 14), def);
    case 'chapel': {
      const [w, , d] = def.size ?? casino.chapel.size;
      return createWeddingChapel(R, origin(def.pos, yaw, w, d), def);
    }
    case 'fountain':
      return createFountain(R, { x: def.pos[0], y: ctx.heightAt(def.pos[0], def.pos[1]), z: def.pos[1], yaw });
    case 'strip': {
      const [w, , d] = def.size ?? [10, 0, 10];
      return createStrip(R, origin(def.pos, yaw, w, d), def);
    }
    default:
      throw new Error(`Noma'lum Casino City propi: ${def.type}`);
  }
}

/** Casino City proplari: binolar, garaj, mashinalar, motel, kapella, favvora, yo'l (statik, birlashtiriladi); palmalar (InstancedMesh). */
export function populateCasinoProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  const R = ctx.world.rapier;
  const palms: PalmItem[] = [];
  for (const def of defs) {
    if (def.type === 'rouletteSign') continue; // createCasinoSystems
    const [x, z] = def.pos;
    if (def.type === 'palmTree') {
      const s = def.scale ?? 1;
      const y = ctx.heightAt(x, z);
      palms.push({ x, y, z, s, yaw: def.yaw ?? 0 });
      const P = casino.palm;
      ctx.addCollider(R.ColliderDesc.cylinder(P.trunkH / 2, P.colliderR * s).setTranslation(x, y + P.trunkH / 2, z).setCollisionGroups(WORLD_GROUPS));
      continue;
    }
    const b = single(ctx, def, origin);
    ctx.statics.push(b.object);
    for (const c of b.colliders) ctx.addCollider(c);
  }
  if (palms.length > 0) {
    const g = buildPalms(palms);
    ctx.root.add(g);
    ctx.onDispose(() => g.children.forEach((m) => (m as THREE.InstancedMesh).dispose()));
  }
}

/** Casino City tizimlari: aylanuvchi ruletka/zar + neon pulsatsiya, Jackpot avtomati. Statik karkaslar merge dan oldin qo'shiladi. */
export function createCasinoSystems(ctx: BuildContext, origin: OriginFn, onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void): System[] {
  const all: Array<System | null> = [createRouletteSigns(ctx, origin), createJackpot(ctx, onDrop)];
  return all.filter((s): s is System => s !== null);
}
