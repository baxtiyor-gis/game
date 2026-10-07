import scoring from '../../data/scoring.json';
import type { GameEvents, GameWorld, System } from '../core/types';

interface Hit {
  t: number;
  weapon: string;
}

const cfg = scoring.whammy;

/**
 * 'damage' eventlarini kuzatadi: bitta source -> target juftligiga oyna ichida >= minWeapons xil quroldan
 * (kombo id lari ham alohida) tegsa 'whammy' emit qiladi. Ochko: kill + whammy bonusi.
 */
export class WhammySystem implements System {
  readonly name = 'whammy';
  private readonly hits = new Map<string, Hit[]>();
  private readonly announced = new Map<string, number>();
  private readonly scores = new Map<string, number>();
  private readonly off: Array<() => void>;

  constructor(private readonly world: GameWorld) {
    this.off = [
      world.events.on('damage', (e) => this.onDamage(e)),
      world.events.on('destroyed', (e) => this.onDestroyed(e)),
    ];
  }

  /** Mashinaning jami ochkosi. */
  score(vehicleId: string): number {
    return this.scores.get(vehicleId) ?? 0;
  }

  dispose(): void {
    for (const off of this.off) off();
    this.off.length = 0;
  }

  private add(id: string, pts: number): void {
    this.scores.set(id, this.score(id) + pts);
  }

  private onDestroyed(e: GameEvents['destroyed']): void {
    if (e.sourceId && e.sourceId !== e.targetId) this.add(e.sourceId, scoring.kill);
  }

  private onDamage(e: GameEvents['damage']): void {
    if (!e.sourceId || e.sourceId === e.targetId || e.amount <= 0 || cfg.ignoreWeapons.includes(e.weapon)) return;
    const key = `${e.sourceId}>${e.targetId}`;
    const now = this.world.time;
    const list = (this.hits.get(key) ?? []).filter((h) => now - h.t <= cfg.windowMs / 1000);
    const distinct = (): number => Math.min(cfg.maxCount, new Set(list.map((h) => h.weapon)).size);
    // oyna siljiganda allaqachon e'lon qilingan sanoq oyna ichidagi xilma-xillikdan oshmasin
    const announced = Math.min(this.announced.get(key) ?? 0, distinct());
    list.push({ t: now, weapon: e.weapon });
    this.hits.set(key, list);
    const count = distinct();
    if (count < cfg.minWeapons || count <= announced) return void this.announced.set(key, announced);
    this.announced.set(key, count);
    this.world.events.emit('whammy', { sourceId: e.sourceId, targetId: e.targetId, count });
    this.add(e.sourceId, count * cfg.bonusPerCount);
  }
}
