import * as THREE from 'three';
import { World } from './core/world';
import { Keyboard } from './input/keyboard';
import { Gamepad } from './input/gamepad';
import { PlayerController } from './input/playerController';
import { ChaseCamera } from './render/chaseCamera';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const keyboard = new Keyboard();
  const world = await World.create({ canvas, afterFixed: () => keyboard.endTick() });
  const player = new PlayerController('p1', keyboard, new Gamepad(0));

  // --- M0 sinov sahnasi (T2.1 da haqiqiy mashina bilan almashtiriladi) ---
  const { scene, physics, rapier } = world;
  scene.background = new THREE.Color('#d9a066');
  scene.fog = new THREE.Fog('#d9a066', 60, 260);
  scene.add(new THREE.HemisphereLight('#fff3d6', '#6b4a2b', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(50, 80, 30);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#b5835a' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  physics.createCollider(rapier.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0));

  const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 4.4), new THREE.MeshLambertMaterial({ color: '#2b6cd6' }));
  scene.add(cube);
  const body = physics.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(0, 1, 0).setLinearDamping(0.5).setAngularDamping(2));
  physics.createCollider(rapier.ColliderDesc.cuboid(1, 0.6, 2.2).setDensity(150), body);

  let rear = false;
  world.addSystem({
    name: 'm0-driver',
    fixedUpdate: (dt) => {
      const inp = player.sample(dt);
      rear = inp.rearView;
      const q = body.rotation();
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
      body.applyImpulse({ x: fwd.x * inp.throttle * 40, y: 0, z: fwd.z * inp.throttle * 40 }, true);
      body.setAngvel({ x: 0, y: -inp.steer * 2.2, z: 0 }, true);
    },
    update: () => {
      const p = body.translation();
      const q = body.rotation();
      cube.position.set(p.x, p.y, p.z);
      cube.quaternion.set(q.x, q.y, q.z, q.w);
    },
  });
  world.addSystem(new ChaseCamera(world.camera, { object: cube, rearView: () => rear }));
  world.start();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${String(e)}</pre>`);
});
