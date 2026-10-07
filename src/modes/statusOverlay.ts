// O'yinchi ko'r bo'lganda (Disco Ball) ekranda oq chaqnash: 'status' eventi orqali.
import type { GameWorld, System, VehicleHandle } from '../core/types';
import { vsp } from '../weapons/vehicleSpecials/params';

const cfg = vsp.overlay;

/** Chaqnash shaffofligi 0..1: boshida `holdFrac` ulushi to'liq oq, keyin chiziqli so'nadi. Sof funksiya. */
export function flashOpacity(left: number, total: number): number {
  if (total <= 0 || left <= 0) return 0;
  const elapsed = total - left;
  if (elapsed < total * cfg.holdFrac) return cfg.maxOpacity;
  return cfg.maxOpacity * Math.min(1, left / (total * (1 - cfg.holdFrac)));
}

export class StatusOverlay implements System {
  readonly name = 'status-overlay';
  private readonly el: HTMLElement;
  private readonly off: () => void;
  private left = 0;
  private total = 0;

  constructor(world: GameWorld, root: HTMLElement, getPlayer: () => VehicleHandle | undefined) {
    this.el = document.createElement('div');
    this.el.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;background:${cfg.color};z-index:${cfg.zIndex}`;
    root.appendChild(this.el);
    this.off = world.events.on('status', (e) => {
      if (e.kind !== 'blind' || e.targetId !== getPlayer()?.id) return;
      this.left = this.total = e.duration;
    });
  }

  update(dt: number): void {
    this.left = Math.max(0, this.left - dt);
    this.el.style.opacity = String(flashOpacity(this.left, this.total));
  }

  dispose(): void {
    this.off();
    this.el.remove();
  }
}
