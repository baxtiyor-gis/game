import type * as THREE from 'three';
import type { System } from '../core/types';
import type { BuildContext } from './context';
import type { PropDef, Vec2 } from './types';
import { createChalet } from './props/chalet';
import { createSkiJump } from './props/skiJump';
import { buildPines } from './props/pineTree';
import type { PineItem } from './props/pineTree';
import { buildSnowBanks } from './props/snowBank';
import type { BankItem } from './props/snowBank';
import { WORLD_GROUPS } from './props/common';
import type { Origin, PropBuild } from './props/common';
import { ski } from './props/skiKit';
import { createSurfaces } from './surfaces';
import { createSkiLift } from './skiLift';
import { createSnowfall } from './snowfall';

export const SKI_TYPES = new Set(['pineTree', 'lodge', 'cabin', 'skiJump', 'snowBank']);
type OriginFn = (p: Vec2, yaw: number, w: number, d: number) => Origin;

function single(ctx: BuildContext, def: PropDef, origin: OriginFn): PropBuild {
  const R = ctx.world.rapier;
  const yaw = def.yaw ?? 0;
  switch (def.type) {
    case 'lodge': {
      const [w, , d] = def.size ?? ski.chalet.lodgeSize;
      return createChalet(R, origin(def.pos, yaw, w, d), def, true);
    }
    case 'cabin': {
      const [w, , d] = def.size ?? ski.chalet.cabinSize;
      return createChalet(R, origin(def.pos, yaw, w, d), def, false);
    }
    case 'skiJump': {
      const [w, , l] = def.size ?? ski.ramp.size;
      return createSkiJump(R, origin(def.pos, yaw, w, l), def);
    }
    default:
      throw new Error(`Noma'lum chang'i kurorti propi: ${def.type}`);
  }
}

/** Chang'i kurorti proplari: uylar va tramplin (statik, birlashtiriladi); archalar va qor uyumlari (InstancedMesh). */
export function populateSkiProps(ctx: BuildContext, defs: PropDef[], origin: OriginFn): void {
  const R = ctx.world.rapier;
  const pines: PineItem[] = [];
  const banks: BankItem[] = [];
  for (const def of defs) {
    const [x, z] = def.pos;
    const yaw = def.yaw ?? 0;
    if (def.type === 'pineTree') {
      const s = def.scale ?? 1;
      const y = ctx.heightAt(x, z);
      pines.push({ x, y, z, s, yaw });
      ctx.addCollider(R.ColliderDesc.cylinder(ski.pine.colliderH / 2, ski.pine.colliderR * s).setTranslation(x, y + ski.pine.colliderH / 2, z).setCollisionGroups(WORLD_GROUPS));
    } else if (def.type === 'snowBank') {
      const length = def.length ?? ski.bank.length;
      const height = def.scale ?? ski.bank.height;
      const y = ctx.heightAt(x, z);
      banks.push({ x, y, z, yaw, length, height });
      // Yarim ko'milgan ellipsoid: kuboid kollayder (balandligi ~ uyum balandligi), yaw bilan
      const half = [height * ski.bank.widthFactor * ski.bank.colliderFit, height * ski.bank.colliderH, (length / 2) * ski.bank.colliderFit] as const;
      ctx.addCollider(
        R.ColliderDesc.cuboid(...half).setTranslation(x, y + half[1] - ski.bank.sink, z)
          .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }).setCollisionGroups(WORLD_GROUPS),
      );
    } else {
      const b = single(ctx, def, origin);
      ctx.statics.push(b.object);
      for (const c of b.colliders) ctx.addCollider(c);
    }
  }
  if (pines.length > 0) {
    const g = buildPines(pines);
    ctx.root.add(g);
    ctx.onDispose(() => g.children.forEach((m) => (m as THREE.InstancedMesh).dispose()));
  }
  if (banks.length > 0) {
    const m = buildSnowBanks(banks);
    ctx.root.add(m);
    ctx.onDispose(() => m.dispose());
  }
}

/** Chang'i kurorti tizimlari: sirt zonalari (muz/qor), kanat yo'li, qor yog'ishi. Statik karkaslar merge dan oldin qo'shiladi. */
export function createSkiSystems(ctx: BuildContext): System[] {
  const all: Array<System | null> = [createSurfaces(ctx), createSkiLift(ctx), createSnowfall(ctx)];
  return all.filter((s): s is System => s !== null);
}
