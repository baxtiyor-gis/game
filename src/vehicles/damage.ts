import * as THREE from 'three';
import { handling } from '../core/data';
import type { GameEvents, GameWorld, System, VehicleHandle } from '../core/types';
import { tuningFor } from './tuning';

const tmp = new THREE.Vector3();

/** Shikast bosqichi: 0 toza, 1 oq tutun, 2 qora tutun, 3 olov (GDD chegaralari). */
export function damageStage(hp: number, maxHp: number): number {
  const ratio = hp / maxHp;
  return handling.damage.stages.filter((limit) => ratio < limit).length;
}

/** 'damage' va 'explosion' eventlarini tinglaydi; hp, qoldiq holati va 'destroyed' ni boshqaradi. */
export class DamageSystem implements System {
  readonly name = 'damage';
  private readonly off: Array<() => void>;

  constructor(private readonly world: GameWorld) {
    this.off = [
      world.events.on('damage', (e) => this.onDamage(e)),
      world.events.on('explosion', (e) => this.onExplosion(e)),
    ];
  }

  dispose(): void {
    for (const off of this.off) off();
    this.off.length = 0;
  }

  private find(id: string): VehicleHandle | undefined {
    return this.world.vehicles.find((v) => v.id === id);
  }

  private onDamage(e: GameEvents['damage']): void {
    const v = this.find(e.targetId);
    if (!v || !v.alive || e.amount <= 0) return;
    v.hp = Math.max(0, v.hp - e.amount * tuningFor(v.def).damageFactor);
    v.object.userData.damageStage = damageStage(v.hp, v.maxHp);
    if (v.hp > 0) return;
    v.alive = false;
    this.wreck(v);
    this.world.events.emit('destroyed', { targetId: v.id, sourceId: e.sourceId });
  }

  private onExplosion(e: GameEvents['explosion']): void {
    for (const v of [...this.world.vehicles]) {
      const d = v.position(tmp).distanceTo(e.pos);
      if (d >= e.radius) continue;
      const falloff = 1 - d / e.radius;
      tmp.sub(e.pos);
      tmp.y += Math.max(d, 1e-3) * handling.damage.explosionLift + 1e-3;
      tmp.normalize().multiplyScalar(v.def.mass * handling.damage.explosionImpulse * falloff);
      v.body.applyImpulse({ x: tmp.x, y: tmp.y, z: tmp.z }, true);
      if (v.alive) {
        this.world.events.emit('damage', { targetId: v.id, sourceId: e.sourceId, amount: e.damage * falloff, weapon: 'explosion' });
      }
    }
  }

  /** Mashina qoraygan qoldiqqa aylanadi; dvigatel vehicle.ts da alive=false bo'yicha o'chadi. */
  private wreck(v: VehicleHandle): void {
    v.object.userData.wrecked = true;
    v.object.userData.damageStage = handling.damage.stages.length;
    v.object.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (!mat || !('emissive' in mat)) return;
      mat.color.set(handling.damage.wreckColor);
      mat.emissive.set('#000000');
    });
  }
}
