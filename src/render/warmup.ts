// Shader "isitish": sahna yuklanish ekrani ortida, kichik o'lchamda, material guruhlari bo'yicha qismlab chiziladi.
// Maqsad: birinchi o'yin kadrida barcha shaderlar/pipeline lar bir vaqtda kompilyatsiya bo'lib, sahifani soniyalab
// qotirmasligi. Yangi dastur paydo bo'lgan har guruhdan keyin GPU fence bloklamasdan kutiladi.
import * as THREE from 'three';
import type { World } from '../core/world';
import { yieldFrame, type Progress } from '../core/perf';
import cfgJson from '../../data/render.json';

const cfg = cfgJson.warmup;

type Drawable = THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;

const isDrawable = (o: THREE.Object3D): o is Drawable =>
  (o as Drawable).material !== undefined && ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite) === true;

/** GPU navbati bo'shaguncha kutadi (WebGL2 fence; bosh oqim bloklanmaydi). */
export async function gpuIdle(renderer: THREE.WebGLRenderer, timeoutMs: number = cfg.fenceTimeoutMs): Promise<void> {
  const gl = renderer.getContext();
  if (!(gl instanceof WebGL2RenderingContext)) return yieldFrame();
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return yieldFrame();
  gl.flush();
  const t0 = performance.now();
  // Qisqa tanaffuslar bilan so'raladi (rAF dan tezroq); har tanaffusda brauzer kadrni chizishi mumkin
  do await new Promise((res) => setTimeout(res, cfg.pollMs));
  while (gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED && performance.now() - t0 < timeoutMs);
  gl.deleteSync(sync);
}

/** Obyekt va barcha ajdodlari ko'rinadimi (instanced bo'lsa, kamida bitta nusxa) */
function shown(o: THREE.Object3D): boolean {
  if ((o as THREE.InstancedMesh).isInstancedMesh && (o as THREE.InstancedMesh).count === 0) return false;
  for (let a: THREE.Object3D | null = o; a; a = a.parent) if (!a.visible) return false;
  return true;
}

/** Sahnadagi ko'rinib turgan chiziladigan obyektlar */
function visibleDrawables(scene: THREE.Object3D): Drawable[] {
  const out: Drawable[] = [];
  scene.traverse((o) => void (isDrawable(o) && shown(o) && out.push(o)));
  return out;
}

/**
 * Ko'rinadigan obyektlar shader dasturlarini oldindan yaratadi (link GPU da fonda, bosh oqim kutmaydi): sahna qurilishi
 * davom etayotganda GPU band bo'ladi. Pipeline sahnani render target ga chizgani uchun kompilyatsiya ham RT bilan
 * (tone mapping / rang fazosi kalitlari mos kelishi uchun). Pipeline o'rnatilgandan keyin chaqiriladi.
 */
export function precompile(world: World): void {
  const r = world.renderer;
  const items = visibleDrawables(world.scene);
  const subset = { traverse: (fn: (o: THREE.Object3D) => void) => items.forEach(fn), traverseVisible: () => undefined };
  const rt = new THREE.WebGLRenderTarget(1, 1);
  const prev = r.getRenderTarget();
  r.setRenderTarget(rt);
  r.compile(subset as unknown as THREE.Object3D, world.camera, world.scene);
  r.setRenderTarget(prev);
  rt.dispose();
  r.getContext().flush();
}

/** Bir xil shader/pipeline holatiga olib keladigan belgilar: material turi + render holati + instancing + soya. */
function groupKey(o: Drawable): string {
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const parts = mats.map((m) => `${m.type}:${m.side}:${m.transparent}:${m.blending}:${m.depthWrite}`);
  return `${parts.join('|')}:${(o as THREE.InstancedMesh).isInstancedMesh === true}:${o.castShadow}`;
}

/**
 * Ko'rinib turgan barcha obyektlar uchun shader dasturlarini va GPU pipeline larini tayyorlaydi: har guruh kichik
 * o'lchamda (kesishsiz) pipeline ning o'zi orqali chiziladi — post-FX ham isiydi. Holat oxirida tiklanadi.
 */
export async function warmUp(world: World, draw: () => void, onProgress?: Progress): Promise<void> {
  const r = world.renderer;
  const snap: Array<[THREE.Object3D, boolean, boolean]> = [];
  world.scene.traverse((o) => void snap.push([o, o.visible, o.frustumCulled]));
  const items = visibleDrawables(world.scene);
  world.scene.updateMatrixWorld(true);
  precompile(world);
  const groups = new Map<string, Drawable[]>();
  for (const o of items) {
    const k = groupKey(o);
    const g = groups.get(k);
    if (g) g.push(o);
    else groups.set(k, [o]);
  }
  await gpuIdle(r);
  const size = r.getSize(new THREE.Vector2());
  const ratio = r.getPixelRatio();
  r.setPixelRatio(1);
  r.setSize(cfg.width, cfg.height, false);
  try {
    for (const o of items) o.frustumCulled = false;
    let done = 0;
    let t0 = performance.now();
    for (const g of groups.values()) {
      for (const o of items) o.visible = false;
      for (const o of g) {
        o.traverseAncestors((a) => (a.visible = true));
        o.visible = true;
      }
      const before = r.info.programs?.length ?? 0;
      draw();
      onProgress?.(++done / groups.size);
      // Yangi dastur paydo bo'lsa yoki kadr byudjeti tugasa: GPU ni bloklamasdan kutamiz
      if ((r.info.programs?.length ?? 0) !== before || performance.now() - t0 > cfg.frameBudgetMs) {
        await gpuIdle(r);
        t0 = performance.now();
      }
    }
    await gpuIdle(r);
  } finally {
    for (const [o, v, f] of snap) (o.visible = v), (o.frustumCulled = f);
    r.setPixelRatio(ratio);
    r.setSize(size.x, size.y, false);
  }
}

/**
 * Hozirgi barcha shader dasturlarini "qadab" qo'yadi: material dispose bo'lsa ham dastur o'chirilmaydi va keyingi
 * match/orqa fonda xuddi shu kalitli material uni qayta ishlatadi (qayta kompilyatsiya yo'q). Soni cheklangan:
 * har xil kalit (material turi x sahna sozlamalari) bo'yicha bittadan.
 */
export function pinPrograms(renderer: THREE.WebGLRenderer): void {
  for (const p of renderer.info.programs ?? []) {
    const prog = p as unknown as { usedTimes: number; pinned?: boolean };
    if (prog.pinned) continue;
    prog.pinned = true;
    prog.usedTimes++;
  }
}
