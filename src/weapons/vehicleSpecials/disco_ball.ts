import * as THREE from 'three';
import { glowMesh } from './fxShapes';
import { flatDist, foes, hurt, statusOf } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'disco_ball';

/** Ko'p rangli yuzali (vertex-rang) disko shar + aylanuvchi nurlar. */
function ballModel(): { group: THREE.Group; geos: THREE.BufferGeometry[] } {
  const p = vsp.disco_ball;
  const geo = new THREE.IcosahedronGeometry(p.ballRadius, 1).toNonIndexed();
  const colors = new Float32Array(geo.getAttribute('position').count * 3);
  const c = new THREE.Color();
  for (let f = 0; f < colors.length / 9; f++) {
    c.set(p.colors[f % p.colors.length]).multiplyScalar(p.hdr);
    for (let k = 0; k < 3; k++) c.toArray(colors, f * 9 + k * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ball = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true }));
  const group = new THREE.Group();
  group.add(ball);
  const rayGeo = new THREE.CylinderGeometry(0.05, 0.2, p.rayLength, 6, 1, true).translate(0, p.rayLength / 2, 0);
  for (let i = 0; i < p.rays; i++) {
    const ray = glowMesh(rayGeo, p.colors[i % p.colors.length], p.rayHdr, p.rayOpacity);
    ray.rotation.set(0, (i / p.rays) * Math.PI * 2, 1.0 + (i % 2) * 0.5);
    group.add(ray);
  }
  return { group, geos: [geo, rayGeo] };
}

/** Disco Ball (Boogie): mashina ustida aylanuvchi shar; atrofdagi raqiblar 2 s ko'r bo'ladi + kichik zarar. */
export const discoBall: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.disco_ball;
    const { group, geos } = ballModel();
    ctx.fx.add(group, p.duration, {
      geos, fadeStart: 0.75, follow: { v: ctx.owner, offset: new THREE.Vector3(0, p.height, 0) },
      update: (_k, _dt, it) => {
        it.obj.rotation.y = it.age * p.spin;
        it.obj.scale.setScalar(1 + 0.08 * Math.sin(it.age * 18));
      },
    });
    const c = ctx.owner.position(new THREE.Vector3());
    const pos = new THREE.Vector3();
    for (const v of foes(ctx)) {
      if (flatDist(v.position(pos), c) > p.radius) continue;
      statusOf(v).blind = Math.max(statusOf(v).blind, p.blind);
      ctx.world.events.emit('status', { targetId: v.id, kind: 'blind', duration: p.blind });
      hurt(ctx, ID, v, p.damage);
    }
  },
};
