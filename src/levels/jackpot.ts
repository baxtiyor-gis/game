import * as THREE from 'three';
import type { GameWorld, PickupKind, System } from '../core/types';
import { registerHitTarget, unregisterHitTarget } from '../core/hitTargets';
import type { BuildContext } from './context';
import { WORLD_GROUPS } from './props/common';
import { casino } from './props/casinoKit';
import { buildJackpotMachine } from './props/jackpotMachine';
import type { JackpotModel } from './props/jackpotMachine';

const J = casino.jackpot;
const SLOT = (Math.PI * 2) / J.symbols;

export type JackpotPhase = 'idle' | 'spin' | 'cooldown';
export type JackpotResult = 'crates' | 'blast';

/**
 * "Jackpot": bulvar o'rtasidagi ulkan o'yin avtomati viveskasi. Otilsa (hitTarget / 'damage' targetId='jackpot' / yaqin portlash)
 * reellar `spin` soniya aylanadi, so'ng tasodifiy natija: `winChance` ehtimol bilan atrofga 3-4 qurol sandig'i sochiladi
 * (onDrop), aks holda kichik portlash ('explosion', sourceId 'jackpot'). So'ng `cooldown` soniya hech narsa bo'lmaydi.
 * Natija spin boshida tanlanadi (reellar shunga mos to'xtaydi).
 */
export class JackpotSystem implements System {
  readonly name = 'jackpot';
  phase: JackpotPhase = 'idle';
  /** Joriy fazada o'tgan vaqt, s */
  t = 0;
  result: JackpotResult | null = null;
  /** Test uchun almashtiriladi (0..1) */
  rng: () => number = Math.random;
  spins = 0;
  private crates = 0;
  private clock = 0;
  private readonly angles = [0.5 * SLOT, 0.5 * SLOT, 0.5 * SLOT];
  private targets = [0.5 * SLOT, 0.5 * SLOT, 0.5 * SLOT];
  private readonly off: Array<() => void>;

  constructor(
    private readonly world: GameWorld,
    private readonly model: JackpotModel,
    private readonly pos: THREE.Vector3,
    private readonly handle: number,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void,
  ) {
    registerHitTarget(world, handle, { id: 'jackpot', damage: () => this.trigger() });
    const center = new THREE.Vector3();
    this.off = [
      world.events.on('damage', (e) => e.targetId === 'jackpot' && this.trigger()),
      world.events.on('explosion', (e) => {
        if (this.phase !== 'idle') return;
        center.copy(this.pos).setY(this.pos.y + J.size[1] / 2);
        if (center.distanceTo(e.pos) - J.triggerRadius < e.radius * 0.5) this.trigger();
      }),
    ];
    this.update(0);
  }

  /** Sandiqlar soni (so'nggi o'yindan) */
  get dropped(): number {
    return this.crates;
  }

  /** Aylanishni boshlaydi (faqat `idle` da). Qaytadi: boshlandimi. */
  trigger(): boolean {
    if (this.phase !== 'idle') return false;
    this.phase = 'spin';
    this.t = 0;
    this.spins++;
    this.result = this.rng() < J.winChance ? 'crates' : 'blast';
    const sym = this.result === 'crates' ? [J.win, J.win, J.win] : [J.bomb, J.bomb, J.bomb];
    this.targets = sym.map((k) => (k + 0.5) * SLOT);
    return true;
  }

  fixedUpdate(dt: number): void {
    if (this.phase === 'idle') return;
    this.t += dt;
    if (this.phase === 'spin' && this.t >= J.spin) this.resolve();
    else if (this.phase === 'cooldown' && this.t >= J.cooldown) {
      this.phase = 'idle';
      this.t = 0;
      this.result = null;
    }
  }

  private resolve(): void {
    this.phase = 'cooldown';
    this.t = 0;
    const c = this.pos;
    if (this.result === 'crates') {
      const n = J.crates[0]! + Math.floor(this.rng() * (J.crates[1]! - J.crates[0]! + 1));
      const a0 = this.rng() * Math.PI * 2;
      this.crates = n;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = c.x + Math.cos(a) * J.dropRadius;
        const z = c.z + Math.sin(a) * J.dropRadius;
        const kind = J.kinds[Math.floor(this.rng() * J.kinds.length)] as PickupKind;
        this.onDrop?.(new THREE.Vector3(x, this.heightAt(x, z) + J.dropLift, z), kind);
      }
    } else {
      this.crates = 0;
      const p = new THREE.Vector3(c.x, c.y + J.blast.height, c.z);
      this.world.events.emit('explosion', { pos: p, radius: J.blast.radius, damage: J.blast.damage, sourceId: 'jackpot' });
      this.world.events.emit('shake', { pos: p, radius: J.blast.radius * 3 });
    }
  }

  /** Reellar, richag va lampochkalar (vizual). */
  update(dt: number): void {
    this.clock += dt;
    const spinning = this.phase === 'spin';
    this.model.reels.forEach((r, i) => {
      if (spinning && this.t < J.spin * J.stopAt[i]!) this.angles[i] = (this.angles[i]! + J.reelSpeed * dt) % (Math.PI * 2);
      else if (this.phase !== 'idle') this.angles[i] = this.targets[i]!;
      r.rotation.x = this.angles[i]!;
    });
    this.model.lever.rotation.x = spinning ? J.lever * Math.min(1, this.t * 4) : this.model.lever.rotation.x * Math.max(0, 1 - dt * 3);
    const [a, b] = this.model.bulbs;
    const lit = this.phase === 'cooldown' ? J.dim : 1;
    const rate = spinning ? J.bulbSpeed[1]! : J.bulbSpeed[0]!;
    const k = Math.sin(this.clock * rate) > 0 ? 1 : 0.35;
    const base = (a.userData.base ??= a.emissiveIntensity) as number;
    a.emissiveIntensity = base * lit * k;
    b.emissiveIntensity = base * lit * (1.35 - k);
  }

  dispose(): void {
    for (const o of this.off) o();
    unregisterHitTarget(this.world, this.handle);
    this.model.dispose();
  }
}

/** Arena qurilishida: interactives dagi 'jackpot' lar (bittasi) -> korpus (kollayder hitTarget) + JackpotSystem. */
export function createJackpot(ctx: BuildContext, onDrop?: (pos: THREE.Vector3, kind: PickupKind) => void): JackpotSystem | null {
  const def = ctx.def.interactives.find((d) => d.type === 'jackpot');
  if (!def) return null;
  const [x, z] = def.pos;
  const y = ctx.heightAt(x, z);
  const [W, H, D] = J.size;
  const model = buildJackpotMachine();
  model.body.position.set(x, y, z);
  model.body.rotation.y = def.yaw ?? 0;
  ctx.root.add(model.body);
  const R = ctx.world.rapier;
  const collider = ctx.addCollider(
    R.ColliderDesc.cuboid(W / 2, H / 2, D / 2).setTranslation(x, y + H / 2, z)
      .setRotation({ x: 0, y: Math.sin((def.yaw ?? 0) / 2), z: 0, w: Math.cos((def.yaw ?? 0) / 2) }).setCollisionGroups(WORLD_GROUPS),
  );
  ctx.onDispose(() => model.body.removeFromParent());
  return new JackpotSystem(ctx.world, model, new THREE.Vector3(x, y, z), collider.handle, ctx.heightAt, onDrop);
}
