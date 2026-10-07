import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { GameWorld, PickupKind, System } from '../core/types';
import type { DestructibleType } from './types';
import type { DestructibleVisual } from './props/tank';
import { registerHitTarget, unregisterHitTarget } from '../core/hitTargets';
import cfgJson from '../../data/levels/destructibles.json';

export const destructibleTypes = cfgJson.types as Record<string, DestructibleType>;
export const maxChainPerTick = cfgJson.maxChainPerTick;

export interface DestructibleItem {
  id: string;
  type: DestructibleType;
  /** Yer ustidagi tayanch nuqta (portlash markazi = y + centerHeight) */
  pos: THREE.Vector3;
  collider: RAPIER.Collider;
  visual: DestructibleVisual;
  drop?: PickupKind;
}

interface Entry extends DestructibleItem {
  hp: number;
  dead: boolean;
  /** HP 0 bo'ldi, portlashni kutmoqda */
  queued: boolean;
  /** Portlashgacha qolgan vaqt, s */
  fuse: number;
}

/**
 * HP li statik obyektlar. 'explosion' (masofa bo'yicha) va 'damage' (targetId = id) eventlaridan shikastlanadi.
 * HP 0 -> fitil (fuse) navbatga qo'yiladi; fixedUpdate da fitil tugagach: kollayder olib tashlanadi, vayrona
 * mesh, o'z 'explosion' eventi va ixtiyoriy sandiq (onDrop). Zanjir: har tickda ko'pi bilan maxChainPerTick
 * portlash, har obyekt bir marta o'ladi -> cheksiz rekursiya yo'q.
 */
export class DestructibleSystem implements System {
  readonly name = 'destructibles';
  private readonly entries: Entry[];
  private readonly queue: Entry[] = [];
  private readonly off: Array<() => void>;
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly world: GameWorld,
    items: DestructibleItem[],
    private readonly onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void,
  ) {
    this.entries = items.map((i) => ({ ...i, hp: i.type.hp, dead: false, queued: false, fuse: 0 }));
    for (const e of this.entries) {
      registerHitTarget(world, e.collider.handle, {
        id: e.id,
        damage: (amount, _src, weapon) => this.hit(e, weapon === 'mg' ? amount * e.type.mgScale : amount),
      });
    }
    this.off = [
      world.events.on('explosion', (e) => this.onExplosion(e.pos, e.radius, e.damage)),
      world.events.on('damage', (e) => {
        const t = this.entries.find((x) => x.id === e.targetId);
        if (t) this.hit(t, e.amount);
      }),
    ];
  }

  /** Tirik (yo'q qilinmagan) obyektlar soni */
  get alive(): number {
    return this.entries.filter((e) => !e.dead).length;
  }

  isDestroyed(id: string): boolean {
    return this.entries.find((e) => e.id === id)?.dead ?? false;
  }

  /** Test/skriptlar uchun: obyekt HP si */
  hpOf(id: string): number {
    return this.entries.find((e) => e.id === id)?.hp ?? 0;
  }

  private hit(e: Entry, amount: number): void {
    if (e.dead || e.queued || amount <= 0) return;
    e.hp -= amount;
    if (e.hp <= 0) {
      e.queued = true;
      e.fuse = e.type.fuse;
      this.queue.push(e);
    }
  }

  private onExplosion(pos: THREE.Vector3, radius: number, damage: number): void {
    if (damage <= 0) return;
    for (const e of this.entries) {
      if (e.dead || e.queued) continue;
      this.tmp.copy(e.pos);
      this.tmp.y += e.type.centerHeight;
      // Obyekt sirtigacha bo'lgan masofa
      const d = Math.max(0, this.tmp.distanceTo(pos) - e.type.radius);
      if (d >= radius) continue;
      this.hit(e, damage * (1 - d / radius));
    }
  }

  fixedUpdate(dt: number): void {
    if (this.queue.length === 0) return;
    let budget = maxChainPerTick;
    const pending = this.queue.splice(0, this.queue.length);
    for (const e of pending) {
      e.fuse -= dt;
      if (e.fuse > 0 || budget <= 0) {
        this.queue.push(e);
        continue;
      }
      budget--;
      this.destroy(e);
    }
  }

  private destroy(e: Entry): void {
    e.dead = true;
    unregisterHitTarget(this.world, e.collider.handle);
    this.world.physics.removeCollider(e.collider, true);
    e.visual.setDestroyed();
    const center = e.pos.clone();
    center.y += e.type.centerHeight;
    if (e.drop) this.onDrop?.(center.clone(), e.drop);
    // Handler sinxron: yangi o'lganlar queue ga tushadi, keyingi tickda (fitil bilan) portlaydi
    this.world.events.emit('explosion', { pos: center, radius: e.type.explosion.radius, damage: e.type.explosion.damage, sourceId: e.id });
  }

  dispose(): void {
    for (const o of this.off) o();
    this.queue.length = 0;
  }
}
