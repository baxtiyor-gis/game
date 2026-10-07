// O'yin oqimi: menyu <-> match. Sahna (World) ni sinxronlaydi, pauza va natijani boshqaradi.
import type * as THREE from 'three';
import type { World } from '../core/world';
import { vehicles } from '../core/data';
import type { System } from '../core/types';
import type { Keyboard } from '../input/keyboard';
import type { PlayerController } from '../input/playerController';
import { AudioSystem } from '../audio/audioSystem';
import { MenuApp } from '../ui/menu/app';
import { MENU, type ScreenId, type Settings } from '../ui/menu/config';
import { MenuInput, type ActionEvent } from '../ui/menu/input';
import { pickRivals } from '../ui/menu/logic';
import { loadSettings } from '../ui/menu/store';
import { startBackdrop, type Content } from './backdrop';
import { startArcade, type ArcadeConfig, type Match } from './arcade';

export type FlowState = 'boot' | 'menu' | 'loading' | 'playing' | 'paused' | 'result';
type Kind = 'backdrop' | 'match' | null;
const MENU_SCREENS: ScreenId[] = ['home', 'select', 'setup', 'settings', 'controls'];

export interface FlowDeps {
  world: World;
  ui: HTMLElement;
  keyboard: Keyboard;
  player: PlayerController;
}

export class Flow {
  state: FlowState = 'boot';
  match: Match | null = null;
  readonly app: MenuApp;
  private readonly input: MenuInput;
  private readonly world: World;
  private content: Content | null = null;
  private kind: Kind = null;
  private queue: Promise<void> = Promise.resolve();
  private lastCfg: Pick<ArcadeConfig, 'vehicleId' | 'rivalIds' | 'difficulty' | 'arenaId' | 'retro'> | null = null;
  private endAt: number | null = null;
  private dirty = false;
  private listener: { current?: THREE.Object3D } = {};
  private readonly audio: AudioSystem;
  private readonly audioProxy: System;

  constructor(private readonly deps: FlowDeps) {
    this.world = deps.world;
    const settings = loadSettings(vehicles);
    this.app = new MenuApp(deps.ui, settings, {
      onScreen: (id) => this.onScreen(id),
      start: () => this.start(),
      resume: () => this.resume(),
      restart: () => this.restart(),
      onSettings: (prev, cur) => this.onSettings(prev, cur),
    });
    this.input = new MenuInput((e) => this.onAction(e));
    // AudioSystem butun ilova umri davomida bitta (gesture listenerlari bir marta), World.reset uni dispose qilmasin
    this.audio = new AudioSystem(deps.world, () => this.listener.current);
    this.audioProxy = { name: 'audio', update: (dt, a) => this.audio.update(dt, a) };
    document.addEventListener('visibilitychange', () => document.hidden && this.state === 'playing' && this.pause());
  }

  /** Menyuni ochadi (yoki `#play` bo'lsa darhol o'yinni boshlaydi — faqat testlar uchun). */
  init(): void {
    this.world.suspended = true;
    this.world.start();
    let last = performance.now();
    const loop = (now: number): void => {
      requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      this.input.poll(dt);
      this.app.tick(dt);
      this.frame();
    };
    requestAnimationFrame(loop);
    this.state = 'menu';
    if (location.hash.includes(MENU.playHash)) {
      const q = MENU.quickPlay;
      this.lastCfg = { vehicleId: q.vehicle, rivalIds: q.rivals, difficulty: q.difficulty, arenaId: this.app.settings.arena, retro: this.app.settings.retro };
      this.restart();
    } else this.app.show('home');
  }

  // ---- Menyu hooklari ----
  private onScreen(id: ScreenId): void {
    if (!MENU_SCREENS.includes(id)) return;
    this.state = 'menu';
    this.input.capture = true;
    this.sync();
  }

  private onSettings(prev: Settings, cur: Settings): void {
    this.applyVolume();
    if (prev.retro !== cur.retro) this.dirty = true;
  }

  start(): void {
    const s = this.app.settings;
    this.lastCfg = {
      vehicleId: s.vehicle,
      rivalIds: pickRivals(vehicles, s.vehicle, s.rivals),
      difficulty: s.difficulty,
      arenaId: s.arena,
      retro: s.retro,
    };
    this.restart();
  }

  restart(): void {
    const cfg = this.lastCfg;
    if (!cfg || this.state === 'loading') return;
    this.state = 'loading';
    this.enqueue(async () => {
      try {
        await this.build(cfg);
      } catch (err) {
        // Sahna qurilmadi: menyuga qaytamiz (xato enqueue da konsolga yoziladi)
        this.dropContent();
        this.state = 'menu';
        this.app.setLoading(false);
        this.app.show('home');
        throw err;
      }
    });
  }

  private async build(cfg: NonNullable<Flow['lastCfg']>): Promise<void> {
    this.dropContent();
    this.app.setLoading(true);
    this.world.suspended = true;
    const match = await startArcade(this.world, {
      ...cfg,
      retro: this.app.settings.retro,
      player: this.deps.player,
      hudRoot: this.deps.ui,
      extraSystems: [this.audioProxy],
      onPlayer: (p) => (this.listener.current = p.object),
    });
    this.match = match;
    this.content = match;
    this.kind = 'match';
    this.endAt = null;
    (window as unknown as { __game: unknown }).__game = { world: this.world, player: match.player, whammy: match.whammy, arena: match.arena };
    this.deps.keyboard.endTick();
    this.world.paused = false;
    this.world.suspended = false;
    this.app.setLoading(false);
    this.input.capture = false;
    this.state = 'playing';
    this.audio.ctx?.resume().catch(() => undefined);
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.world.paused = true;
    this.input.capture = true;
    this.audio.ctx?.suspend().catch(() => undefined);
    this.app.show('pause');
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.app.show(null);
    this.world.paused = false;
    this.deps.keyboard.endTick();
    this.input.capture = false;
    this.audio.ctx?.resume().catch(() => undefined);
  }

  // ---- Kiritish ----
  private onAction(e: ActionEvent): void {
    switch (this.state) {
      case 'playing':
        if (e.action === 'pause' || (e.action === 'back' && !e.pad)) this.pause();
        break;
      case 'paused':
        if (e.action === 'pause' || e.action === 'back') this.resume();
        else this.app.action(e.action);
        break;
      case 'menu':
      case 'result':
        this.app.action(e.action);
        break;
      default:
    }
  }

  // ---- Har kadr ----
  private frame(): void {
    const m = this.match;
    if (this.state !== 'playing' || !m) return;
    const st = m.state();
    if (st === 'playing') return;
    if (this.endAt === null) {
      this.endAt = this.world.time;
      m.markEnd();
      this.world.events.emit('matchEnd', { winnerId: st === 'won' ? m.player.id : (m.rivals.find((r) => r.alive)?.id ?? null) });
    } else if (this.world.time - this.endAt >= MENU.endDelay) {
      this.state = 'result';
      this.world.paused = true;
      this.input.capture = true;
      this.app.showResult({ won: st === 'won', ...m.stats() });
    }
  }

  private applyVolume(): void {
    this.audio.setVolume(this.app.settings.volume);
  }

  // ---- Sahna sinxroni ----
  private enqueue(job: () => Promise<void>): void {
    this.queue = this.queue.then(job).catch((err) => {
      console.error(err);
      document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55;position:fixed;top:0">${String(err)}</pre>`);
    });
  }

  private wantBackdrop(): boolean {
    const s = this.app.screen;
    return this.state === 'menu' && s !== 'select' && s !== null;
  }

  private dropContent(): void {
    this.content?.dispose();
    this.content = null;
    this.kind = null;
    this.match = null;
  }

  /** Menyu ekraniga mos sahna: tanlash ekranida hech narsa chizilmaydi, qolganlarida Oil Fields orqa fon. */
  private sync(): void {
    this.enqueue(async () => {
      if (this.state !== 'menu') return;
      if (this.dirty && this.app.screen !== 'settings') {
        this.dirty = false;
        if (this.kind === 'backdrop') this.dropContent();
      }
      if (!this.wantBackdrop()) {
        this.world.suspended = true;
        if (this.kind === 'match') this.dropContent();
        return;
      }
      if (this.kind !== 'backdrop') {
        this.dropContent();
        this.world.suspended = true;
        const s = this.app.settings;
        this.content = await startBackdrop(this.world, s.arena, s.retro);
        this.kind = 'backdrop';
      }
      this.world.suspended = !this.wantBackdrop();
    });
  }
}
