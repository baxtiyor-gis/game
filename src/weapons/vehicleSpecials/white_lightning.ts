import * as THREE from 'three';
import { boltPoints, glowMat, glowMesh, tubeGeometry } from './fxShapes';
import { hurt, nearestFoe, roof, rnd, stall } from './util';
import { vsp } from './params';
import type { SpecialContext, VehicleSpecial } from './types';

const ID = 'white_lightning';

const find = (ctx: SpecialContext) => {
  const p = vsp.white_lightning;
  return nearestFoe(ctx, ctx.owner.position(new THREE.Vector3()), ctx.forward, p.range, p.halfAngle);
};

/** Bitta zigzag nur (flicker bilan): geometriya item tugaganda dispose qilinadi. */
function bolt(ctx: SpecialContext, a: THREE.Vector3, b: THREE.Vector3, width: number): void {
  const p = vsp.white_lightning;
  const geo = tubeGeometry(boltPoints(a, b, p.segments, p.jitter), width);
  const m = new THREE.Mesh(geo, glowMat(p.color, p.hdr));
  ctx.fx.add(m, p.life, { geos: [geo], fadeStart: 0.4, update: (_k, _dt, it) => (it.obj.visible = Math.random() > 0.2) });
}

/** White Lightning (Slick Clyde): eng yaqin oldidagi nishonga chaqmoq; dvigatelni o'chiradi + zarar. */
export const whiteLightning: VehicleSpecial = {
  id: ID,
  ready: (ctx) => find(ctx) !== null,
  fire(ctx) {
    const p = vsp.white_lightning;
    const target = find(ctx);
    if (!target) return;
    const top = roof(target);
    bolt(ctx, ctx.muzzle, top, p.width * 0.6);
    bolt(ctx, top.clone().add(new THREE.Vector3(rnd(-3, 3), p.skyHeight, rnd(-3, 3))), top, p.width);
    const flash = glowMesh(new THREE.SphereGeometry(1, 12, 8), '#ffffff', p.hdr);
    flash.position.copy(top);
    ctx.fx.add(flash, p.life, {
      geos: [flash.geometry], fadeStart: 0.2,
      update: (k, _dt, it) => it.obj.scale.setScalar(p.flashRadius * (0.4 + k)),
    });
    stall(ctx, target, p.stall);
    hurt(ctx, ID, target, p.damage);
  },
};
