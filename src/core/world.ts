import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from './events';
import { handling } from './data';
import { FixedLoop } from './loop';
import type { GameEvents, GameWorld, System, VehicleHandle } from './types';

export interface WorldOptions {
  canvas: HTMLCanvasElement;
  /** Har fixed tick oxirida (masalan klaviatura edge'larini tozalash) */
  afterFixed?: () => void;
}

type Disposable = { dispose?: () => void };

/** Obyekt daraxtidagi geometriya, material va teksturalarni bo'shatadi (umumiy keshlar keyin qayta yuklanadi). */
function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    (m.geometry as Disposable | undefined)?.dispose?.();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
    (o as THREE.InstancedMesh).dispose?.();
  });
}

/** GameWorld ning yagona implementatsiyasi: render + fizika + tizimlar. */
export class World implements GameWorld {
  readonly rapier = RAPIER;
  physics: RAPIER.World;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1500);
  readonly renderer: THREE.WebGLRenderer;
  events = new EventBus<GameEvents>();
  readonly vehicles: VehicleHandle[] = [];
  /** Kontakt kuchi eventlari (to'qnashuv shikasti). vehicles/damage.ts shundan o'qiydi. */
  eventQueue = new RAPIER.EventQueue(true);
  time = 0;
  /** true: fizika va tizimlar to'xtaydi, sahna chizilishda davom etadi (pauza). */
  paused = false;
  /** true: hech narsa ishlamaydi va chizilmaydi (menyu to'liq yopib turganda yoki sahna qurilayotganda). */
  suspended = false;
  /** Ixtiyoriy render almashtirgich (PS1 post-FX shu orqali ulanadi) */
  renderHook?: (r: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera) => void;

  private systems: System[] = [];
  private loop: FixedLoop;
  private last = 0;
  private raf = 0;
  private readonly onResize = (): void => this.resize();

  private constructor(private readonly opts: WorldOptions) {
    this.physics = new RAPIER.World({ x: 0, y: -handling.world.gravity, z: 0 });
    this.physics.timestep = 1 / 60;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.loop = new FixedLoop(
      (dt) => this.fixed(dt),
      (dt, a) => this.frame(dt, a),
    );
    addEventListener('resize', this.onResize);
    this.resize();
  }

  static async create(opts: WorldOptions): Promise<World> {
    await RAPIER.init();
    return new World(opts);
  }

  addSystem(sys: System): void {
    this.systems.push(sys);
  }

  removeSystem(sys: System): void {
    this.systems = this.systems.filter((s) => s !== sys);
    sys.dispose?.();
  }

  start(): void {
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = (now - this.last) / 1000;
      this.last = now;
      if (this.suspended) return;
      if (this.paused) return this.draw();
      this.loop.advance(dt);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /**
   * Sahna mazmunini to'liq tozalaydi (tizimlar dispose, sahna geometriya/material/tekstura, fizika, eventlar).
   * Renderer va canvas qayta ishlatiladi. renderHook egasi (pipeline) uni o'zi dispose qiladi.
   */
  reset(): void {
    disposeObject(this.scene); // avval: tizimlar o'z obyektlarini sahnadan olib tashlamasidan oldin
    for (const s of [...this.systems]) this.removeSystem(s);
    this.systems = [];
    this.renderHook = undefined;
    this.scene.clear();
    this.scene.background = null;
    this.scene.fog = null;
    this.scene.environment = null;
    this.vehicles.length = 0;
    this.events.clear();
    this.eventQueue.free();
    this.physics.free();
    this.eventQueue = new RAPIER.EventQueue(true);
    this.physics = new RAPIER.World({ x: 0, y: -handling.world.gravity, z: 0 });
    this.physics.timestep = 1 / 60;
    this.time = 0;
    this.paused = false;
    this.camera.up.set(0, 1, 0);
  }

  /** Butunlay yopish (testlar / sahifadan chiqish). */
  dispose(): void {
    this.stop();
    this.reset();
    removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }

  private fixed(dt: number): void {
    for (const s of this.systems) s.fixedUpdate?.(dt);
    this.physics.step(this.eventQueue);
    this.time += dt;
    this.opts.afterFixed?.();
  }

  private frame(dt: number, alpha: number): void {
    for (const s of this.systems) s.update?.(dt, alpha);
    this.draw();
  }

  private draw(): void {
    if (this.renderHook) this.renderHook(this.renderer, this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const c = this.renderer.domElement;
    const w = c.clientWidth || innerWidth;
    const h = c.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
