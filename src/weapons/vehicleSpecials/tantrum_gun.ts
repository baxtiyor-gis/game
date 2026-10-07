import * as THREE from 'three';
import { castSegment } from '../raycast';
import { glowMat } from './fxShapes';
import { foes, hurt, rnd, roof } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'tantrum_gun';

/** Tom ustidagi turret modeli: tayanch + bosh (yaw) + stvol + yorqin uchi. head.rotation.y = nishon yaw i. */
function turretModel(): { group: THREE.Group; head: THREE.Group; flash: THREE.Mesh } {
  const p = vsp.tantrum_gun;
  const metal = new THREE.MeshStandardMaterial({ color: p.turretColor, metalness: 0.7, roughness: 0.4 });
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(p.turretSize * 0.5, p.turretSize * 0.6, 0.25, 12), metal);
  const head = new THREE.Group();
  head.position.y = 0.25;
  head.add(new THREE.Mesh(new THREE.BoxGeometry(p.turretSize * 0.7, p.turretSize * 0.45, p.turretSize * 0.8), metal));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, p.barrel, 8).rotateX(Math.PI / 2), metal);
  barrel.position.z = p.barrel * 0.7;
  head.add(barrel);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), glowMat(p.color, 5));
  flash.position.z = p.barrel * 1.25;
  flash.visible = false;
  head.add(flash);
  group.add(base, head);
  return { group, head, flash };
}

/** Tantrum Gun (Sheila): tom ustida 4-5 s avtomatik turret, 360 daraja eng yaqin raqibga tez o'q uzadi. */
export const tantrumGun: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.tantrum_gun;
    const { group, head, flash } = turretModel();
    const state = { yaw: Math.atan2(ctx.forward.x, ctx.forward.z), want: 0, shot: 0 };
    state.want = state.yaw;
    const geos: THREE.BufferGeometry[] = [];
    group.traverse((o) => void ((o as THREE.Mesh).geometry && geos.push((o as THREE.Mesh).geometry)));
    ctx.fx.add(group, p.duration, {
      geos, follow: { v: ctx.owner, offset: new THREE.Vector3(0, ctx.owner.def.size[1] / 2 + 0.05, 0) },
      update: (_k, dt) => {
        let d = state.want - state.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        state.yaw += Math.max(-p.turnRate * dt, Math.min(p.turnRate * dt, d));
        head.rotation.y = state.yaw;
        flash.visible = state.shot > 0;
        state.shot = Math.max(0, state.shot - dt);
      },
    });
    const from = new THREE.Vector3();
    const aim = new THREE.Vector3();
    const pos = new THREE.Vector3();
    let acc = 0;
    ctx.timers.run(p.duration, (dt) => {
      if (!ctx.owner.alive) return;
      acc += dt;
      if (acc < p.interval) return;
      acc -= p.interval;
      roof(ctx.owner, from, p.height - ctx.owner.def.size[1] / 2);
      let best: ReturnType<typeof foes>[number] | null = null;
      let bd = p.range;
      for (const v of foes(ctx)) {
        const d = v.position(pos).distanceTo(from);
        if (d < bd) { bd = d; best = v; }
      }
      if (!best) return;
      best.position(aim).y += best.def.size[1] / 2;
      aim.sub(from).normalize();
      state.want = Math.atan2(aim.x, aim.z);
      aim.x += rnd(-p.spread, p.spread);
      aim.y += rnd(-p.spread, p.spread);
      aim.z += rnd(-p.spread, p.spread);
      aim.normalize();
      const hit = castSegment(ctx.world, from, aim, p.range, ctx.owner.body);
      ctx.effects.tracer(from, pos.copy(from).addScaledVector(aim, hit ? hit.t : p.range));
      state.shot = 0.05;
      if (hit?.vehicle?.alive) hurt(ctx, ID, hit.vehicle, p.damage);
    });
  },
};
