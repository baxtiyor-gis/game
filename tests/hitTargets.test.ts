import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../src/core/events';
import type { GameEvents, GameWorld, VehicleHandle } from '../src/core/types';
import { findHitTarget } from '../src/core/hitTargets';
import { DestructibleSystem, destructibleTypes } from '../src/levels/destructible';
import { TrainSystem } from '../src/levels/train';
import { TrackPath } from '../src/levels/trackPath';
import type { TrainDef } from '../src/levels/types';
import { machinegun } from '../src/weapons/machinegun';
import { tuning } from '../src/weapons/params';
import { WORLD_GROUPS } from '../src/levels/props/common';
import valleyFarms from '../data/levels/valley_farms.json';

const DT = 1 / 60;

function makeWorld() {
  const world = {
    rapier: RAPIER,
    physics: new RAPIER.World({ x: 0, y: -9.81, z: 0 }),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    events: new EventBus<GameEvents>(),
    vehicles: [] as VehicleHandle[],
    time: 0,
    addSystem() {},
    removeSystem() {},
  };
  world.physics.timestep = DT;
  return world as unknown as GameWorld;
}

/** Pulemyotni `from` dan +x yo'nalishida `shots` marta otadi (spread 0). */
function shoot(world: GameWorld, shots: number, from = new THREE.Vector3(0, 1, 0)): void {
  world.physics.step();
  const owner = { id: 'p1', body: world.physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 100, 0)) };
  const ctx = {
    world, owner, forward: new THREE.Vector3(1, 0, 0), muzzle: from,
    effects: { tracer() {} },
  };
  const spread = tuning.mg.spread;
  (tuning.mg as { spread: number }).spread = 0;
  for (let i = 0; i < shots; i++) machinegun.fire(ctx as never);
  (tuning.mg as { spread: number }).spread = spread;
}

beforeAll(async () => {
  await RAPIER.init();
});

describe('pulemyot -> mashinadan boshqa nishonlar', () => {
  const buildDestructible = (world: GameWorld, type: string) => {
    const t = destructibleTypes[type]!;
    const collider = world.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5).setTranslation(10, 1, 0).setCollisionGroups(WORLD_GROUPS));
    const visual = { setDestroyed() {} };
    const sys = new DestructibleSystem(world, [{ id: `${type}-1`, type: t, pos: new THREE.Vector3(10, 0, 0), collider, visual: visual as never }]);
    return { sys, id: `${type}-1`, t };
  };

  it('bochka ~2 s, rezervuar ~6 s dan keyin buziladi (60 Hz o\'q ritmi bo\'yicha)', () => {
    for (const [type, seconds] of [['barrel', 2], ['tank', 6]] as const) {
      const world = makeWorld();
      const { sys, id } = buildDestructible(world, type);
      const perSecond = 1 / tuning.mg.cooldown;
      shoot(world, Math.floor(perSecond * seconds * 0.8));
      expect(sys.hpOf(id)).toBeGreaterThan(0);
      expect(sys.hpOf(id)).toBeLessThan(destructibleTypes[type]!.hp);
      shoot(world, Math.ceil(perSecond * seconds * 0.4));
      expect(sys.hpOf(id)).toBeLessThanOrEqual(0);
    }
  });

  it('registr world.physics ga bog\'liq: yangi physics da bo\'sh', () => {
    const world = makeWorld();
    const { sys } = buildDestructible(world, 'barrel');
    const handle = world.physics.getCollider(0)?.handle ?? -1;
    expect(sys.alive).toBe(1);
    expect(findHitTarget(world, handle)).not.toBeNull();
    (world as { physics: RAPIER.World }).physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    expect(findHitTarget(world, handle)).toBeNull();
  });

  it('poyezd vagoni ~4 s da buziladi, lokomotiv yo\'q', () => {
    const world = makeWorld();
    const vf = valleyFarms.train as unknown as TrainDef;
    const track = new TrackPath(vf.path, () => 0, 0.18);
    const train = new TrainSystem(world, { ...vf, startProgress: 0.5 }, track, () => 0, new THREE.Object3D());
    // Vagon markazining 10 m yonidan otamiz (vagon korpusi bo'ylab/ko'ndalang — baribir tegadi)
    const from = train.carPos('wagon-1').add(new THREE.Vector3(-10, 2, 0));
    const perSecond = 1 / tuning.mg.cooldown;
    shoot(world, Math.floor(perSecond * 4 * 0.8), from);
    expect(train.isDestroyed('wagon-1')).toBe(false);
    expect(train.hpOf('wagon-1')).toBeLessThan(vf.wagonHp);
    shoot(world, Math.ceil(perSecond * 4 * 0.4), from);
    expect(train.isDestroyed('wagon-1')).toBe(true);
  });
});
