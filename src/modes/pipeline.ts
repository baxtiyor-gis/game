import type { World } from '../core/world';
import { installModern } from '../render/modern';
import { installPS1 } from '../render/ps1';

/**
 * Render pipeline (zamonaviy yoki retro PS1) ni ulaydi; dispose() hamma resurslarni bo'shatadi.
 * EffectComposer.dispose() pass larni bo'shatmaydi (bloom render targetlari oqib ketadi) — shuning uchun alohida.
 */
export function installPipeline(world: World, retro: boolean): { dispose(): void } {
  if (retro) return installPS1(world);
  const pipe = installModern(world);
  return {
    dispose: () => {
      pipe.dispose();
      for (const pass of pipe.composer.passes) pass.dispose?.();
    },
  };
}
