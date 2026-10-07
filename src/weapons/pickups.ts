import * as THREE from 'three';
import pickupJson from '../../data/pickups.json';
import type { GameWorld, PickupKind, System, VehicleHandle, WeaponId } from '../core/types';
import { weaponDef } from './params';

export const pickupCfg = pickupJson;

export interface PickupSpawn {
  pos: [number, number, number];
  kind: PickupKind;
}

interface Crate {
  spawn: PickupSpawn;
  group: THREE.Group;
  timer: number; // >0: respawn gacha qolgan vaqt
  phase: number;
}

const tmp = new THREE.Vector3();
const center = new THREE.Vector3();

/** Sandiq tizimi: aylanuvchi low-poly sandiq, yaqinlashganda olinadi, taymer bilan qayta paydo bo'ladi. */
export class PickupSystem implements System {
  readonly name = 'pickups';
  private readonly crates: Crate[];
  private readonly boxGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly iconGeo = new THREE.OctahedronGeometry(0.5, 0);
  private readonly crateMat = new THREE.MeshLambertMaterial({ color: pickupCfg.crateColor, flatShading: true });
  private readonly iconMats = new Map<string, THREE.MeshLambertMaterial>();

  constructor(private readonly world: GameWorld, spawns: PickupSpawn[]) {
    this.crates = spawns.map((s, i) => this.build(s, i));
  }

  private build(spawn: PickupSpawn, i: number): Crate {
    const group = new THREE.Group();
    const size = pickupCfg.crateSize;
    const box = new THREE.Mesh(this.boxGeo, this.crateMat);
    box.scale.setScalar(size);
    const icon = new THREE.Mesh(this.iconGeo, this.iconMat(spawn.kind));
    icon.scale.setScalar(size * 0.9);
    icon.position.y = size * 0.9;
    group.add(box, icon);
    group.position.set(...spawn.pos);
    group.position.y += pickupCfg.hover;
    this.world.scene.add(group);
    return { spawn, group, timer: 0, phase: i * 1.7 };
  }

  private iconMat(kind: PickupKind): THREE.MeshLambertMaterial {
    let m = this.iconMats.get(kind);
    if (!m) {
      const color = pickupCfg.colors[kind];
      m = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35, flatShading: true });
      this.iconMats.set(kind, m);
    }
    return m;
  }

  /** Sinov/UI uchun: holati (true = hozir olinishi mumkin). */
  isAvailable(index: number): boolean {
    return this.crates[index].timer <= 0;
  }

  fixedUpdate(dt: number): void {
    for (const c of this.crates) {
      if (c.timer > 0) {
        c.timer -= dt;
        if (c.timer <= 0) c.group.visible = true;
        continue;
      }
      const [x, y, z] = c.spawn.pos;
      center.set(x, y + pickupCfg.hover, z);
      for (const v of this.world.vehicles) {
        if (!v.alive || v.position(tmp).distanceTo(center) > pickupCfg.pickRadius) continue;
        if (!this.give(v, c.spawn.kind)) continue;
        c.timer = pickupCfg.respawn;
        c.group.visible = false;
        this.world.events.emit('pickup', { vehicleId: v.id, kind: c.spawn.kind });
        break;
      }
    }
  }

  update(dt: number): void {
    for (const c of this.crates) {
      c.phase += dt;
      c.group.rotation.y += pickupCfg.spin * dt;
      c.group.position.y = c.spawn.pos[1] + pickupCfg.hover + Math.sin(c.phase * pickupCfg.bobSpeed) * pickupCfg.bobAmplitude;
    }
  }

  dispose(): void {
    for (const c of this.crates) c.group.removeFromParent();
    this.boxGeo.dispose();
    this.iconGeo.dispose();
    this.crateMat.dispose();
    for (const m of this.iconMats.values()) m.dispose();
  }

  /** true = olindi (sandiq sarflandi). */
  private give(v: VehicleHandle, kind: PickupKind): boolean {
    const inv = v.inventory;
    if (kind === 'health') {
      if (v.hp >= v.maxHp) return false;
      v.hp = Math.min(v.maxHp, v.hp + v.maxHp * pickupCfg.healFraction);
      return true;
    }
    if (kind === 'special') {
      inv.specialAmmo += pickupCfg.specialAmmo;
      return true;
    }
    const w: WeaponId = kind;
    const ammo = weaponDef(w).ammoPerPickup;
    const slot = inv.slots.find((s) => s.weapon === w);
    if (slot) slot.ammo += ammo;
    else if (inv.slots.length < pickupCfg.maxSlots) inv.slots.push({ weapon: w, ammo });
    else return false;
    return true;
  }
}
