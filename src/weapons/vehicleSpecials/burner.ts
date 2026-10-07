import * as THREE from 'three';
import { FlameStream } from './flame';
import { foes, hurt, inCone, roof } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'burner';
/** Burner (Sid Burn): oldinga olov purkagich - konus, qisqa masofa, kuchli DPS. */
export const burner: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.burner;
    const v = ctx.owner;
    const flame = new FlameStream({
      count: p.particles, cycle: p.cycle, length: p.length, radius: p.radius, size: p.size, hdr: p.hdr, opacity: p.opacity,
      colors: [p.core, p.mid, p.color], dir: 1, additive: false,
    });
    const nozzle = v.def.size[2] / 2 + 0.3;
    ctx.fx.add(flame.group, p.duration, {
      geos: [flame.geo], follow: { v, offset: new THREE.Vector3(0, p.height - v.def.size[1] / 2, nozzle), rotate: true },
      update: (k, _dt, it) => flame.tick(it.age, Math.min(1, k * 10), k > 0.88 ? (1 - k) / 0.12 : 1),
    });
    const from = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    let acc = 0;
    ctx.timers.run(p.duration, (dt) => {
      if (!v.alive) return;
      acc += dt;
      if (acc < p.tickEvery) return;
      acc -= p.tickEvery;
      roof(v, from, 0);
      v.forward(dir);
      for (const e of foes(ctx)) {
        if (!inCone(from, dir, e.position(pos), p.range, p.halfAngle) || Math.abs(pos.y - from.y) > 3) continue;
        hurt(ctx, ID, e, p.dps * p.tickEvery);
      }
    });
  },
};
