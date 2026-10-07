import * as THREE from 'three';
import type { GameWorld, VehicleHandle } from '../core/types';
import { tuning } from './params';

export interface ImpactInfo {
  weapon: string;
  sourceId: string | null;
  pos: THREE.Vector3;
  dir: THREE.Vector3; // uchish yo'nalishi (birlik)
  damage: number;
  splash: number;
  knockback: number;
  hit: VehicleHandle | null; // to'g'ridan-to'g'ri tekkan mashina
}

const tmp = new THREE.Vector3();
const push = new THREE.Vector3();

/** To'g'ri tekkanda: nishonga to'liq 'damage' + qisman sachratma 'explosion'. Aks holda to'liq 'explosion'. */
export function detonate(world: GameWorld, i: ImpactInfo): void {
  if (i.hit?.alive) {
    world.events.emit('damage', { targetId: i.hit.id, sourceId: i.sourceId, amount: i.damage, weapon: i.weapon });
  }
  const dmg = i.hit ? i.damage * tuning.projectiles.splashFactor : i.damage;
  world.events.emit('explosion', { pos: i.pos.clone(), radius: i.splash, damage: dmg, sourceId: i.sourceId });
  if (i.knockback > 0) knockback(world, i);
}

/** Cannon/mortar: to'g'ri tekkan mashinani uchish yo'nalishida, atrofdagilarni radial itaradi. */
function knockback(world: GameWorld, i: ImpactInfo): void {
  for (const v of world.vehicles) {
    if (v.id === i.sourceId && v !== i.hit) continue;
    const d = v.position(tmp).distanceTo(i.pos);
    const direct = v === i.hit;
    if (!direct && d >= i.splash) continue;
    const k = direct ? 1 : 1 - d / i.splash;
    if (direct) push.copy(i.dir);
    else push.copy(tmp).sub(i.pos).normalize();
    push.y += tuning.projectiles.knockbackLift;
    push.normalize().multiplyScalar(i.knockback * k);
    v.body.applyImpulse({ x: push.x, y: push.y, z: push.z }, true);
  }
}
