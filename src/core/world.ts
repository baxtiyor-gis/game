import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from './events';
import { FixedLoop } from './loop';
import type { GameEvents, GameWorld, System, VehicleHandle } from './types';

export interface WorldOptions {
  canvas: HTMLCanvasElement;
  /** Har fixed tick oxirida (masalan klaviatura edge'larini tozalash) */
  afterFixed?: () => void;
}

/** GameWorld ning yagona implementatsiyasi: render + fizika + tizimlar. */
export class World implements GameWorld {
  readonly rapier = RAPIER;
  readonly physics: RAPIER.World;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1500);
  readonly renderer: THREE.WebGLRenderer;
  readonly events = new EventBus<GameEvents>();
  readonly vehicles: VehicleHandle[] = [];
  time = 0;

  private systems: System[] = [];
  private loop: FixedLoop;
  private last = 0;
  private raf = 0;

  private constructor(private readonly opts: WorldOptions) {
    this.physics = new RAPIER.World({ x: 0, y: -9.81 * 1.6, z: 0 }); // arkada: og'irroq gravitatsiya
    this.physics.timestep = 1 / 60;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: false });
    this.renderer.setPixelRatio(1);
    this.loop = new FixedLoop(
      (dt) => this.fixed(dt),
      (dt, a) => this.frame(dt, a),
    );
    addEventListener('resize', () => this.resize());
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
      this.loop.advance((now - this.last) / 1000);
      this.last = now;
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private fixed(dt: number): void {
    for (const s of this.systems) s.fixedUpdate?.(dt);
    this.physics.step();
    this.time += dt;
    this.opts.afterFixed?.();
  }

  private frame(dt: number, alpha: number): void {
    for (const s of this.systems) s.update?.(dt, alpha);
    this.renderer.render(this.scene, this.camera);
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
