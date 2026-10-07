import type { World } from '../core/world';
import { installModern } from '../render/modern';
import { installPS1 } from '../render/ps1';

/** Render pipeline (zamonaviy yoki retro PS1) ni ulaydi; dispose() hamma resurslarni bo'shatadi. */
export function installPipeline(world: World, retro: boolean): { dispose(): void } {
  return retro ? installPS1(world) : installModern(world);
}
