import * as THREE from 'three';
import { FlameStream } from './flame';
import { flatDist, foes, hurt, kick } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'nitro_flame';

/** Nitro Flame (Houston 3): nitro turtki + orqasidan olov izi; iz ichidan o'tganlar yonadi (vaqt bo'yicha zarar). */
export const nitroFlame: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.nitro_flame;
    const v = ctx.owner;
    const mass = v.body.mass();
    kick(v, ctx.forward, p.kick);
    const [, h, l] = v.def.size;
    const f = p.flame;
    const flame = new FlameStream({ ...f, hdr: p.hdr, colors: [p.core, p.color, p.color], dir: -1, additive: true });
    ctx.fx.add(flame.group, p.duration, {
      geos: [flame.geo], follow: { v, offset: new THREE.Vector3(0, -h * 0.1, -l / 2), rotate: true },
      update: (k, _dt, it) => flame.tick(it.age, 1, k > 0.8 ? (1 - k) / 0.2 : 1),
    });
    const patches: Array<{ pos: THREE.Vector3; age: number }> = [];
    const burn = new Map<string, number>();
    const fw = new THREE.Vector3();
    const q = new THREE.Vector3();
    let drop = 0;
    let tick = 0;
    ctx.timers.run(p.duration + p.patchLife, (dt, t) => {
      if (t <= p.duration && v.alive) {
        v.forward(fw).multiplyScalar(mass * p.accel * dt);
        v.body.applyImpulse({ x: fw.x, y: fw.y, z: fw.z }, true);
        drop += dt;
        if (drop >= p.trailInterval) {
          drop = 0;
          const pos = v.position(new THREE.Vector3()).addScaledVector(v.forward(q), -l / 2);
          pos.y -= h / 2;
          patches.push({ pos, age: 0 });
          patchFx(ctx, pos);
        }
      }
      for (let i = patches.length - 1; i >= 0; i--) if ((patches[i].age += dt) >= p.patchLife) patches.splice(i, 1);
      for (const e of foes(ctx)) {
        if (patches.some((pt) => flatDist(pt.pos, e.position(q)) < p.patchRadius && Math.abs(pt.pos.y - q.y) < 3)) {
          burn.set(e.id, (burn.get(e.id) ?? 0) + p.dps * dt);
        }
      }
      tick += dt;
      if (tick < p.tickEvery) return;
      tick = 0;
      for (const [id, amt] of burn) {
        const target = ctx.world.vehicles.find((x) => x.id === id);
        if (target) hurt(ctx, ID, target, amt);
      }
      burn.clear();
    });
  },
};

/** Olov izi bo'lagi: yerdan ko'tarilib so'nuvchi alanga zarralari; oxirida so'nadi. */
function patchFx(ctx: SpecialContext, pos: THREE.Vector3): void {
  const p = vsp.nitro_flame;
  const flame = new FlameStream({
    count: p.patchFlame.count, cycle: p.patchFlame.cycle, length: p.patchHeight, radius: p.patchRadius * 0.6, size: p.patchFlame.size,
    hdr: p.patchHdr, opacity: p.patchOpacity, colors: [p.core, p.color, p.color], dir: 1, additive: false,
  });
  flame.group.position.copy(pos);
  flame.group.rotation.x = -Math.PI / 2; // +Z o'qi yuqoriga
  ctx.fx.add(flame.group, p.patchLife, {
    geos: [flame.geo],
    update: (k, _dt, it) => flame.tick(it.age, 1, k > 0.6 ? (1 - k) / 0.4 : 1),
  });
}
