import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameWorld } from '../core/types';
import type { ArenaDef } from './types';

/** Arena qurilishi paytida umumiy holat: kollayderlar va tozalash ro'yxati. */
export class BuildContext {
  readonly root = new THREE.Group();
  readonly colliders: RAPIER.Collider[] = [];
  private readonly disposers: Array<() => void> = [];

  constructor(
    readonly world: GameWorld,
    readonly def: ArenaDef,
    readonly heightAt: (x: number, z: number) => number,
  ) {
    this.root.name = `arena:${def.id}`;
    world.scene.add(this.root);
  }

  addCollider(desc: RAPIER.ColliderDesc): RAPIER.Collider {
    const c = this.world.physics.createCollider(desc);
    this.colliders.push(c);
    return c;
  }

  onDispose(fn: () => void): void {
    this.disposers.push(fn);
  }

  dispose(): void {
    for (const fn of this.disposers) fn();
    const { physics, scene } = this.world;
    // Portlagan destructible kollayderlari allaqachon olib tashlangan bo'lishi mumkin
    for (const c of this.colliders) if (physics.getCollider(c.handle)) physics.removeCollider(c, false);
    scene.remove(this.root);
    this.colliders.length = 0;
    this.disposers.length = 0;
  }
}
