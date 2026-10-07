import type { BuildContext } from './context';
import { WORLD_GROUPS } from './props/common';
import { buildRocks } from './props/rocks';
import type { RockItem } from './props/rocks';

/** Mulberry32: deterministik tasodif (seed bo'yicha) */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Maydon atrofida 4 ta ko'rinmas devor (kollayder) va ularning oldida qoya halqasi (ko'rinish, InstancedMesh). */
export function buildBoundary(ctx: BuildContext): void {
  const { def, world, heightAt } = ctx;
  const b = def.boundary;
  const half = def.size / 2;
  const R = world.rapier;
  const hh = b.wallHeight / 2;
  const ht = b.wallThickness / 2;
  const walls: Array<[number, number, number, number]> = [
    [half + ht, 0, ht, half + ht], [-half - ht, 0, ht, half + ht], [0, half + ht, half + ht, ht], [0, -half - ht, half + ht, ht],
  ];
  for (const [x, z, hx, hz] of walls) {
    ctx.addCollider(R.ColliderDesc.cuboid(hx, hh + 20, hz).setTranslation(x, hh, z).setCollisionGroups(WORLD_GROUPS));
  }

  const rand = rng(def.terrain.seed ^ 0x9e3779b9);
  const rocks: RockItem[] = [];
  const per = Math.ceil(b.rockCount / 4);
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < per; i++) {
      const t = ((i + rand() * 0.8) / per) * def.size - half;
      const inset = rand() * 3;
      const e = half - inset;
      const [x, z] = side === 0 ? [t, e] : side === 1 ? [t, -e] : side === 2 ? [e, t] : [-e, t];
      const s = b.rockScale[0] + rand() * (b.rockScale[1] - b.rockScale[0]);
      rocks.push({ x, y: heightAt(x, z) - s * 0.2, z, yaw: rand() * Math.PI * 2, sx: s * (0.9 + rand() * 0.6), sy: s * (0.7 + rand() * 0.6), sz: s });
    }
  }
  const mesh = buildRocks(rocks);
  mesh.name = 'boundary-rocks';
  ctx.root.add(mesh);
  ctx.onDispose(() => mesh.dispose());
}
