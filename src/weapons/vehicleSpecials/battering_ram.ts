import * as THREE from 'three';
import { glowMat } from './fxShapes';
import { kick, statusOf } from './util';
import { vsp } from './params';
import type { VehicleSpecial } from './types';

const ID = 'battering_ram';

/** Battering Ram (Convoy): oldinga kuchli turtki; bir necha soniya massa va old zirh ortadi, to'qnashuv zarari 3x. */
export const batteringRam: VehicleSpecial = {
  id: ID,
  fire(ctx) {
    const p = vsp.battering_ram;
    const v = ctx.owner;
    const body = v.body;
    const baseMass = body.mass();
    kick(v, ctx.forward, p.kick);
    body.setAdditionalMass(baseMass * (p.massMul - 1), true);
    statusOf(v).armorMul = p.armorMul;
    // to'qnashuv zarari: fizik 'collision' zarariga (p.collisionMul - 1) ortiqcha qo'shiladi
    const off = ctx.world.events.on('damage', (e) => {
      if (e.sourceId !== v.id || e.weapon !== 'collision' || e.targetId === v.id) return;
      ctx.world.events.emit('damage', { ...e, amount: e.amount * (p.collisionMul - 1), weapon: `special.${ID}` });
    });
    const [w, h, l] = v.def.size;
    const wedgeGeo = new THREE.ConeGeometry(w * 0.55, p.wedge, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4);
    const wedge = new THREE.Mesh(wedgeGeo, glowMat(p.color, p.hdr, 0.8));
    const shieldGeo = new THREE.SphereGeometry(1, 16, 10);
    const shield = new THREE.Mesh(shieldGeo, glowMat(p.color, p.hdr * 0.5, p.shieldOpacity));
    shield.scale.set(w * 0.85, h * 1.1, l * 0.75);
    const group = new THREE.Group();
    wedge.position.set(0, 0, l / 2 + p.wedge * 0.4);
    group.add(wedge, shield);
    ctx.fx.add(group, p.duration, {
      geos: [wedgeGeo, shieldGeo], follow: { v, offset: new THREE.Vector3(0, h * 0.1, 0), rotate: true }, fadeStart: 0.8,
      update: (_k, _dt, it) => it.obj.scale.setScalar(1 + Math.sin(it.age * 12) * 0.03),
    });
    const f = new THREE.Vector3();
    ctx.timers.run(
      p.duration,
      (dt) => {
        if (!v.alive) return;
        v.forward(f).multiplyScalar(baseMass * p.accel * dt);
        body.applyImpulse({ x: f.x, y: f.y, z: f.z }, true);
      },
      () => {
        off();
        body.setAdditionalMass(0, true);
        statusOf(v).armorMul = 1;
      },
    );
  },
};
