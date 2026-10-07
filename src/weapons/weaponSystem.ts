import * as THREE from 'three';
import type { GameWorld, System, VehicleHandle, WeaponId } from '../core/types';
import { Effects } from './effects';
import { cannon } from './cannon';
import { machinegun } from './machinegun';
import { mine } from './mine';
import { missile } from './missile';
import { mortar } from './mortar';
import { tuning, weaponDef } from './params';
import { ProjectileSystem } from './projectiles';
import { rocket } from './rocket';
import { Specials } from './specials/specials';
import type { FireContext, Weapon } from './weapon';

const WEAPONS: Record<WeaponId, Weapon> = { missile, rocket, mortar, cannon, mine };

const fwd = new THREE.Vector3();
const org = new THREE.Vector3();

/** Har mashina handle.input ini o'qiydi: pulemyot, tanlangan qurol (ammo/cooldown), almashtirish. */
export class WeaponSystem implements System {
  readonly name = 'weapons';
  readonly projectiles: ProjectileSystem;
  readonly effects: Effects;
  private readonly mgReady = new Map<string, number>();
  private readonly specials = new Specials();
  private readonly weaponReady = new Map<string, number>();

  constructor(private readonly world: GameWorld) {
    this.projectiles = new ProjectileSystem(world);
    this.effects = new Effects(world);
  }

  fixedUpdate(dt: number): void {
    for (const v of [...this.world.vehicles]) if (v.alive) this.tickVehicle(v);
    this.specials.tick(dt);
    this.projectiles.fixedUpdate(dt);
  }

  update(dt: number, alpha: number): void {
    this.projectiles.update(dt, alpha);
    this.effects.update(dt);
  }

  dispose(): void {
    this.specials.timers.clear();
    this.projectiles.dispose();
    this.effects.dispose();
  }

  private tickVehicle(v: VehicleHandle): void {
    const inv = v.inventory;
    const now = this.world.time;
    const { input } = v;
    if (input.cycleWeapon !== 0 && inv.slots.length > 1) {
      const n = inv.slots.length;
      inv.selected = (inv.selected + input.cycleWeapon + n) % n;
    }
    const combo = input.combo ? this.specials.perform(v, input.combo, () => this.context(v)) : null;
    if (combo) this.world.events.emit('fire', { sourceId: v.id, weapon: combo });
    if (!combo && input.fireMG && now >= (this.mgReady.get(v.id) ?? 0)) {
      this.mgReady.set(v.id, now + tuning.mg.cooldown);
      machinegun.fire(this.context(v));
      this.world.events.emit('fire', { sourceId: v.id, weapon: 'mg' });
    }
    if (input.fireWeapon) this.fireSelected(v, now);
  }

  private fireSelected(v: VehicleHandle, now: number): void {
    const inv = v.inventory;
    const slot = inv.slots[inv.selected];
    if (!slot || slot.ammo <= 0 || now < (this.weaponReady.get(v.id) ?? 0)) return;
    this.weaponReady.set(v.id, now + weaponDef(slot.weapon).cooldown);
    WEAPONS[slot.weapon].fire(this.context(v));
    slot.ammo--;
    this.world.events.emit('fire', { sourceId: v.id, weapon: slot.weapon });
    if (slot.ammo > 0) return;
    inv.slots.splice(inv.selected, 1);
    inv.selected = Math.max(0, Math.min(inv.selected, inv.slots.length - 1));
  }

  private context(v: VehicleHandle): FireContext {
    v.forward(fwd);
    v.position(org);
    const half = v.def.size[2] / 2 + tuning.muzzle.gap;
    const up = tuning.muzzle.height;
    return {
      world: this.world, projectiles: this.projectiles, effects: this.effects, owner: v, forward: fwd.clone(),
      muzzle: org.clone().addScaledVector(fwd, half).setY(org.y + up),
      rear: org.clone().addScaledVector(fwd, -half).setY(org.y + up),
    };
  }
}
