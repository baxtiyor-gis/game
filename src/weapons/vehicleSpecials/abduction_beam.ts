import * as THREE from 'three';
import { glowMat, glowMesh } from './fxShapes';
import { hurt, nearestFoe } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'abduction_beam';
const Y = new THREE.Vector3(0, 1, 0);

const find = (ctx: SpecialContext) => {
  const p = vsp.abduction_beam;
  return nearestFoe(ctx, ctx.owner.position(new THREE.Vector3()), ctx.forward, p.range, p.halfAngle);
};

/** Abduction Beam (Y the Alien): nur bilan nishonni havoga ko'taradi, so'ng tashlab yuboradi (tushish zarari). */
export const abductionBeam: VehicleSpecial = {
  id: ID,
  ready: (ctx) => find(ctx) !== null,
  fire(ctx) {
    const p = vsp.abduction_beam;
    const target = find(ctx);
    if (!target) return;
    const beamGeo = new THREE.CylinderGeometry(p.beamRadius, 0.4, 1, 16, 1, true);
    const ringGeo = new THREE.TorusGeometry(1, 0.06, 6, 24).rotateX(Math.PI / 2);
    const group = new THREE.Group();
    const beam = new THREE.Mesh(beamGeo, glowMat(p.color, p.hdr * 0.5, 0.45));
    group.add(beam);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < p.rings; i++) {
      const r = glowMesh(ringGeo, p.color, p.hdr);
      rings.push(r);
      group.add(r);
    }
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    ctx.fx.add(group, p.liftTime + 0.3, {
      geos: [beamGeo, ringGeo], fadeStart: 0.8,
      update: (_k, _dt, it) => {
        a.copy(ctx.owner.object.position).y += ctx.owner.def.size[1];
        b.copy(target.object.position);
        const len = Math.max(0.1, a.distanceTo(b));
        beam.position.copy(a).add(b).multiplyScalar(0.5);
        beam.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize()); // keng uchi (radiusTop) nishonda
        beam.scale.set(1, len, 1);
        rings.forEach((r, i) => {
          const f = (it.age * 1.2 + i / p.rings) % 1;
          r.position.copy(b).lerp(a, f);
          r.scale.setScalar(p.beamRadius * (1 - f * 0.7));
        });
      },
    });
    const baseY = target.position(new THREE.Vector3()).y;
    const lv = new THREE.Vector3();
    ctx.timers.run(p.liftTime, (dt) => {
      if (!target.alive) return;
      const k = Math.exp(-p.holdDamp * dt);
      const v = target.body.linvel();
      lv.set(v.x * k, 0, v.z * k);
      lv.y = target.position(new THREE.Vector3()).y - baseY < p.maxHeight ? p.liftSpeed : 0;
      target.body.setLinvel({ x: lv.x, y: lv.y, z: lv.z }, true);
      target.body.setAngvel({ x: 0, y: p.spin, z: 0 }, true);
    }, () => hurt(ctx, ID, target, p.damage));
  },
};
