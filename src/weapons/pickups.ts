import * as THREE from 'three';
import pickupJson from '../../data/pickups.json';
import type { GameWorld, PickupKind, System, VehicleHandle, WeaponId } from '../core/types';
import { weaponDef } from './params';
import { CrateKit, type CrateView } from './visuals/crate';
import { PickupFlash } from './visuals/pickupFlash';
import { vis } from './visuals/config';

export const pickupCfg = pickupJson;

export interface PickupSpawn {
  pos: [number, number, number];
  kind: PickupKind;
}

/** Tashqi (bot/radar) ko'rinish: oldindan ajratilgan, sandiq bilan birga yashaydi */
export interface PickupInfo {
  pos: THREE.Vector3;
  kind: PickupKind;
  available: boolean;
}

interface Crate {
  info?: PickupInfo;
  spawn: PickupSpawn;
  group: THREE.Group;
  view: CrateView;
  timer: number; // >0: respawn gacha qolgan vaqt
  phase: number;
}

const tmp = new THREE.Vector3();
const center = new THREE.Vector3();

/** Sandiq tizimi: zamonaviy aylanuvchi sandiq, yaqinlashganda olinadi, taymer bilan qayta paydo bo'ladi. */
export class PickupSystem implements System {
  readonly name = 'pickups';
  private readonly kit = new CrateKit(pickupCfg.crateSize, pickupCfg.crateColor, pickupCfg.colors);
  private readonly flash: PickupFlash;
  private readonly crates: Crate[];
  /** Dinamik (drop) sandiqlar: bir martalik, respawn yo'q; eng eskisi chiqib ketadi */
  private readonly dropped: Crate[] = [];
  /** `dropped` bilan sinxron ro'yxat (drop/olinishda yangilanadi, so'rovda allocation yo'q) */
  private readonly droppedInfo: PickupInfo[] = [];

  constructor(private readonly world: GameWorld, spawns: PickupSpawn[]) {
    this.flash = new PickupFlash(world.scene);
    this.crates = spawns.map((s, i) => this.build(s, i));
  }

  private build(spawn: PickupSpawn, i: number): Crate {
    const view = this.kit.build(spawn.kind);
    const group = view.group;
    group.position.set(...spawn.pos);
    group.position.y += pickupCfg.hover;
    this.world.scene.add(group);
    return { spawn, group, view, timer: 0, phase: i * 1.7 };
  }

  /** Sinov/UI uchun: holati (true = hozir olinishi mumkin). */
  isAvailable(index: number): boolean {
    return this.crates[index].timer <= 0;
  }

  /** Bir martalik sandiq qo'yadi (vagon/destructible vayron bo'lganda). Olinmaguncha qoladi; maxDropped dan oshsa eng eskisi yo'qoladi. */
  drop(pos: THREE.Vector3, kind: PickupKind): void {
    while (this.dropped.length >= pickupCfg.maxDropped) this.discard(this.dropped.shift()!);
    const c = this.build({ pos: [pos.x, pos.y, pos.z], kind }, this.dropped.length + this.crates.length);
    c.info = { pos: new THREE.Vector3(pos.x, pos.y, pos.z), kind, available: true };
    this.dropped.push(c);
    this.droppedInfo.push(c.info);
  }

  /** Faol drop sandiqlar (bot/radar uchun). Qaytgan massiv tizimniki: o'zgartirmang, nusxa olmang. */
  listDropped(): readonly PickupInfo[] {
    return this.droppedInfo;
  }

  /** Hozir sahnada turgan dinamik sandiqlar soni (test/UI uchun) */
  get droppedCount(): number {
    return this.dropped.length;
  }

  private discard(c: Crate): void {
    c.group.removeFromParent();
    const k = this.droppedInfo.indexOf(c.info!);
    if (k >= 0) this.droppedInfo.splice(k, 1);
  }

  /** Mashina yetib borsa sandiqni beradi; true = olindi. */
  private tryTake(c: Crate): boolean {
    const [x, y, z] = c.spawn.pos;
    center.set(x, y + pickupCfg.hover, z);
    for (const v of this.world.vehicles) {
      if (!v.alive || v.position(tmp).distanceTo(center) > pickupCfg.pickRadius) continue;
      if (!this.give(v, c.spawn.kind)) continue;
      this.flash.burst(center, this.flashColor(c.spawn.kind));
      this.world.events.emit('pickup', { vehicleId: v.id, kind: c.spawn.kind });
      return true;
    }
    return false;
  }

  fixedUpdate(dt: number): void {
    for (const c of this.crates) {
      if (c.timer > 0) {
        c.timer -= dt;
        if (c.timer <= 0) c.group.visible = true;
        continue;
      }
      if (!this.tryTake(c)) continue;
      c.timer = pickupCfg.respawn;
      c.group.visible = false;
    }
    for (let i = this.dropped.length - 1; i >= 0; i--) {
      if (!this.tryTake(this.dropped[i]!)) continue;
      this.discard(this.dropped[i]!);
      this.dropped.splice(i, 1);
    }
  }

  update(dt: number): void {
    this.flash.update(dt);
    for (const c of [...this.crates, ...this.dropped]) {
      c.phase += dt;
      if (!c.group.visible) continue;
      c.group.rotation.y += pickupCfg.spin * dt;
      const lift = pickupCfg.hover + Math.sin(c.phase * pickupCfg.bobSpeed) * pickupCfg.bobAmplitude;
      c.group.position.y = c.spawn.pos[1] + lift;
      this.kit.animate(c.view, c.phase, lift);
    }
  }

  /** Olinish chaqnashi rangi: tur halqasi rangi (qurol / health / special). */
  private flashColor(kind: PickupKind): string {
    const rc = vis.crate.ringColors;
    return kind === 'health' ? rc.health : kind === 'special' ? rc.special : rc.weapon;
  }

  dispose(): void {
    for (const c of [...this.crates, ...this.dropped]) c.group.removeFromParent();
    this.dropped.length = 0;
    this.droppedInfo.length = 0;
    this.flash.dispose();
    this.kit.dispose();
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
