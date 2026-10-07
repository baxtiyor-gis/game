import type { GameWorld, VehicleHandle } from '../../core/types';
import { Timers } from '../specials/timers';
import type { FireContext } from '../weapon';
import { SpecialFx } from './fx';
import { VEHICLE_SPECIALS } from './index';
import { specialCfg } from './params';
import { statusOf } from './util';

/** Mashina maxsus quroli: ammo (inventory.specialAmmo), cooldown, registry bo'yicha otish, holat taymerlari. */
export class VehicleSpecials {
  readonly timers = new Timers();
  readonly fx: SpecialFx;
  private readonly readyAt = new Map<string, number>();

  constructor(private readonly world: GameWorld) {
    this.fx = new SpecialFx(world.scene);
  }

  /** Otilgan fire-event nomi (`special.<id>`), aks holda null (ammo yo'q / cooldown / shart bajarilmadi). */
  fire(v: VehicleHandle, makeContext: () => FireContext): string | null {
    const move = VEHICLE_SPECIALS.get(v.def.special);
    const cfg = specialCfg(v.def.special);
    const inv = v.inventory;
    if (!move || !cfg || !v.alive || inv.specialAmmo <= 0 || this.world.time < (this.readyAt.get(v.id) ?? 0)) return null;
    const ctx = { ...makeContext(), timers: this.timers, fx: this.fx };
    if (move.ready && !move.ready(ctx)) return null;
    inv.specialAmmo--;
    this.readyAt.set(v.id, this.world.time + cfg.cooldown);
    move.fire(ctx);
    return `special.${move.id}`;
  }

  /** 60 Hz: davomli effektlar va holatlar (ko'rlik/tutun) kamayishi. */
  tick(dt: number): void {
    this.timers.tick(dt);
    for (const v of this.world.vehicles) {
      const s = statusOf(v);
      s.blind = Math.max(0, s.blind - dt);
      s.smoke = Math.max(0, s.smoke - dt);
    }
  }

  update(dt: number): void {
    this.fx.update(dt);
  }

  dispose(): void {
    this.timers.clear();
    this.fx.dispose();
  }
}
