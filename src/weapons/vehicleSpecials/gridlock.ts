import * as THREE from 'three';
import { fanGeometry, glowMat, yawOf } from './fxShapes';
import { flatDir, hurt, inCone, foes, stall } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'gridlock';

/** Gridlock (Chassey Blue): oldinga kengayuvchi flare to'ri; tekkan mashinalar dvigateli o'chadi + kichik zarar. */
export const gridlock: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.gridlock;
    const origin = ctx.muzzle.clone();
    origin.y += p.height - 0.35;
    const dir = flatDir(ctx.forward);
    const geo = fanGeometry(p.halfAngle, p.rays, p.arcs, p.rayWidth / p.length, p.markSize / p.length);
    const net = new THREE.Mesh(geo, glowMat(p.color, p.hdr));
    net.position.copy(origin);
    net.rotation.y = yawOf(dir);
    ctx.fx.add(net, p.expandTime + p.fadeTime, {
      geos: [geo],
      fadeStart: p.expandTime / (p.expandTime + p.fadeTime),
      update: (_k, _dt, it) => net.scale.setScalar(Math.max(0.02, Math.min(1, it.age / p.expandTime)) * p.length),
    });
    const hit = new Set<string>();
    const pos = new THREE.Vector3();
    ctx.timers.run(p.expandTime, (_dt, t) => {
      const reach = (Math.min(t, p.expandTime) / p.expandTime) * p.length;
      for (const v of foes(ctx)) {
        if (hit.has(v.id) || !inCone(origin, dir, v.position(pos), reach, p.halfAngle)) continue;
        hit.add(v.id);
        stall(ctx, v, p.stall);
        hurt(ctx, ID, v, p.damage);
        const flare = new THREE.Mesh(new THREE.OctahedronGeometry(p.markSize, 0), glowMat(p.color, p.hdr));
        ctx.fx.add(flare, p.stall, {
          geos: [flare.geometry],
          follow: { v, offset: new THREE.Vector3(0, v.def.size[1] + 0.9, 0) },
          fadeStart: 0.7,
          update: (k, _dt, it) => {
            it.obj.rotation.y = it.age * 5;
            it.obj.scale.setScalar(1.4 + Math.sin(it.age * 14) * 0.4 * (1 - k));
          },
        });
      }
    });
  },
};
