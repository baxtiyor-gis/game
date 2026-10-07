// Raycast sensorlar: whisker (to'siq) va ko'rinish chizig'i (LOS). Kadrga cheklangan sondagi nur.
import * as THREE from 'three';
import { CG } from '../core/types';
import type { GameWorld, VehicleHandle } from '../core/types';
import { aimCfg, steeringCfg } from './config';
import { avoidSteer, whiskerDir, whiskerLength, type Avoid } from './steering';

const GROUPS = (CG.PROJECTILE << 16) | CG.WORLD | CG.VEHICLE;
const dir = new THREE.Vector3();

export class Sensors {
  readonly dangers: number[] = steeringCfg.whiskerAngles.map(() => 0);
  readonly avoid: Avoid = { steer: 0, front: 0, max: 0 };
  los = true;
  private nextWhisker = 0;
  private nextLos = 0;

  constructor(private readonly world: GameWorld) {}

  /** Whisker nurlari (whiskerInterval da bir marta). Xavf = 1 - masofa/uzunlik. */
  updateWhiskers(me: VehicleHandle, pos: THREE.Vector3, fwd: THREE.Vector3, speed: number): void {
    if (this.world.time < this.nextWhisker) return;
    this.nextWhisker = this.world.time + steeringCfg.whiskerInterval;
    const len = whiskerLength(speed, steeringCfg);
    const angles = steeringCfg.whiskerAngles;
    for (let i = 0; i < angles.length; i++) {
      whiskerDir(fwd, angles[i], dir);
      const hit = this.cast(me, pos.x, pos.y + steeringCfg.whiskerHeight, pos.z, dir, len);
      this.dangers[i] = hit ? 1 - hit.timeOfImpact / len : 0;
    }
    avoidSteer(this.dangers, steeringCfg, this.avoid);
  }

  /** Raqibga ko'rinish chizig'i (losInterval da bir marta). */
  updateLos(me: VehicleHandle, pos: THREE.Vector3, target: VehicleHandle, targetPos: THREE.Vector3): void {
    if (this.world.time < this.nextLos) return;
    this.nextLos = this.world.time + aimCfg.losInterval;
    dir.subVectors(targetPos, pos);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 1e-3) { this.los = true; return; }
    dir.divideScalar(dist);
    const hit = this.cast(me, pos.x, pos.y + aimCfg.losHeight, pos.z, dir, dist);
    this.los = !hit || hit.collider.parent()?.handle === target.body.handle;
  }

  private cast(me: VehicleHandle, x: number, y: number, z: number, d: THREE.Vector3, len: number) {
    const ray = new this.world.rapier.Ray({ x, y, z }, { x: d.x, y: d.y, z: d.z });
    return this.world.physics.castRay(ray, len, true, undefined, GROUPS, undefined, me.body);
  }
}
