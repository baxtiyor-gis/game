// Menyu orqasidagi sahna: tanlangan arena atrofida sekin aylanuvchi kamera (mashinasiz).
import * as THREE from 'three';
import type { System } from '../core/types';
import type { World } from '../core/world';
import { installEnvironment } from '../render/environment';
import { loadArena } from '../levels/loader';
import { MENU } from '../ui/menu/config';
import { arenaDef, resolveArenaId } from './arenas';
import { installPipeline } from './pipeline';

const cfg = MENU.backdrop;

export interface Content {
  dispose(): void;
}

class OrbitCamera implements System {
  readonly name = 'orbitCamera';
  private angle = 0;
  private readonly look = new THREE.Vector3();

  constructor(
    private readonly world: World,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly focus: THREE.Object3D,
  ) {
    world.camera.fov = cfg.fov;
    world.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.angle += dt * cfg.speed;
    const x = Math.cos(this.angle) * cfg.radius;
    const z = Math.sin(this.angle) * cfg.radius;
    const cam = this.world.camera;
    cam.position.set(x, this.heightAt(x, z) + cfg.height, z);
    this.look.set(0, this.heightAt(0, 0) + cfg.lookHeight, 0);
    this.focus.position.copy(this.look);
    cam.lookAt(this.look);
  }
}

export async function startBackdrop(world: World, arenaId: string, retro: boolean): Promise<Content> {
  const env = installEnvironment(world);
  const arena = await loadArena(world, arenaDef(resolveArenaId(arenaId)));
  env.applyArenaEnvironment(arena.def.environment);
  const focus = new THREE.Object3D();
  env.follow(focus);
  world.addSystem(new OrbitCamera(world, arena.heightAt, focus));
  const pipe = installPipeline(world, retro);
  return { dispose: () => (pipe.dispose(), world.reset()) };
}
