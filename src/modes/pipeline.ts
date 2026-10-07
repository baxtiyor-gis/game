import type { World } from '../core/world';
import type { Progress } from '../core/perf';
import { upgradeMaterials } from '../render/environment';
import { installModern } from '../render/modern';
import { installPS1 } from '../render/ps1';
import { pinPrograms, precompile, warmUp } from '../render/warmup';

export interface Pipeline {
  dispose(): void;
  /** Sahnaga yangi qo'shilgan obyektlarni pipeline ga moslash (masalan PS1 materiallari) */
  prepare?(): void;
}

/** Render pipeline (zamonaviy yoki retro PS1) ni ulaydi; dispose() hamma resurslarni bo'shatadi. */
export function installPipeline(world: World, retro: boolean): Pipeline {
  return retro ? installPS1(world) : installModern(world);
}

/** Ko'rinadigan obyektlar shaderlarini GPU da fonda kompilyatsiya qila boshlaydi (sahna qurilishi davom etadi). */
export function precompileScene(world: World, pipe: Pipeline): void {
  upgradeMaterials(world.scene);
  pipe.prepare?.();
  precompile(world);
}

/**
 * Sahna qurilayotganda canvas yashiriladi: brauzer uni kompozitsiya uchun o'qimaydi, shu sabab GPU ishi (PMREM,
 * shader kompilyatsiyasi) bosh oqimni bloklamasdan fonda bajariladi. Qaytgan funksiya canvasni qayta ko'rsatadi.
 */
export function hideCanvas(world: World): () => void {
  const c = world.renderer.domElement;
  c.style.display = 'none';
  return () => void (c.style.display = '');
}

/**
 * Sahna qurilgandan keyin, o'yin boshlanishidan oldin: materiallar yangilanadi, shaderlar pipeline orqali qismlab
 * isitiladi (birinchi kadr qotmaydi) va dasturlar keyingi sahnalar uchun saqlab qolinadi.
 */
export async function prepareScene(world: World, pipe: Pipeline, onProgress?: Progress): Promise<void> {
  upgradeMaterials(world.scene);
  pipe.prepare?.();
  const r = world.renderer;
  const draw = (): void => (world.renderHook ? world.renderHook(r, world.scene, world.camera) : r.render(world.scene, world.camera));
  const t0 = performance.now();
  await warmUp(world, draw, onProgress);
  performance.measure('load:warmup', { start: t0, end: performance.now() });
  pinPrograms(r);
}
