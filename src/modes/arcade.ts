// Arcade rejimi: arena + o'yinchi + botlar + tizimlar yig'ilishi (avval main.ts da edi).
import * as THREE from 'three';
import { vehicleDef } from '../core/data';
import type { Controller, System, VehicleHandle } from '../core/types';
import type { World } from '../core/world';
import { BotController } from '../ai/botController';
import type { Difficulty } from '../ai/config';
import { ChaseCamera } from '../render/chaseCamera';
import { installEnvironment } from '../render/environment';
import { ShakeSystem } from '../render/shake';
import { VfxSystem } from '../render/vfx';
import { loadArena } from '../levels/loader';
import type { Arena } from '../levels/types';
import { DamageSystem } from '../vehicles/damage';
import { spawnVehicle } from '../vehicles/vehicle';
import { PickupSystem } from '../weapons/pickups';
import { vsp } from '../weapons/vehicleSpecials/params';
import { WeaponSystem } from '../weapons/weaponSystem';
import { WhammySystem } from '../weapons/whammy';
import { Hud } from '../ui/hud';
import { MENU } from '../ui/menu/config';
import { arenaDef } from './arenas';
import { StatusOverlay } from './statusOverlay';
import { installPipeline } from './pipeline';
import type { Content } from './backdrop';

export interface ArcadeConfig {
  vehicleId: string;
  /** Raqib mashinalari (profil id si ham shu) */
  rivalIds: string[];
  difficulty: Difficulty;
  arenaId: string;
  retro: boolean;
  player: Controller;
  hudRoot: HTMLElement;
  /** Match davomida ishlaydigan qo'shimcha tizimlar (masalan audio) */
  extraSystems?: System[];
  /** Audio tinglovchi uchun o'yinchi obyekti beriladi */
  onPlayer?: (player: VehicleHandle) => void;
}

export interface MatchStats {
  kills: number;
  whammies: number;
  score: number;
  time: number;
}

export type MatchState = 'playing' | 'won' | 'lost';

export interface Match extends Content {
  readonly player: VehicleHandle;
  readonly rivals: VehicleHandle[];
  readonly whammy: WhammySystem;
  readonly arena: Arena;
  state(): MatchState;
  stats(): MatchStats;
  /** Match tugagan vaqtni qotiradi (natija vaqti shu bo'yicha) */
  markEnd(): void;
}

export async function startArcade(world: World, cfg: ArcadeConfig): Promise<Match> {
  const env = installEnvironment(world);
  const arena = await loadArena(world, arenaDef(cfg.arenaId));
  world.addSystem(new DamageSystem(world));
  const s0 = arena.spawns[0]!;
  const player = spawnVehicle(world, vehicleDef(cfg.vehicleId), cfg.player, s0.pos, s0.yaw);
  player.inventory.slots.push(...MENU.loadout.player.map((s) => ({ weapon: s.weapon, ammo: s.ammo })));
  player.inventory.specialAmmo = vsp.startAmmo;
  const spawns = arena.pickupSpawns;
  const pickups = new PickupSystem(world, spawns);
  const pickupView = spawns.map((s) => ({ pos: new THREE.Vector3(...s.pos), kind: s.kind, available: true }));
  const getPickups = () => {
    pickupView.forEach((p, i) => (p.available = pickups.isAvailable(i)));
    return pickupView;
  };
  const rivals: VehicleHandle[] = [];
  for (const [i, id] of cfg.rivalIds.entries()) {
    const sp = arena.spawns[(i + 1) % arena.spawns.length]!;
    let self: VehicleHandle | undefined;
    const bot = new BotController(world, () => self, { profile: id, difficulty: cfg.difficulty, getPickups });
    self = spawnVehicle(world, vehicleDef(id), bot, sp.pos, sp.yaw);
    self.inventory.slots.push(...MENU.loadout.bot.map((s) => ({ weapon: s.weapon, ammo: s.ammo })));
    self.inventory.specialAmmo = vsp.startAmmo;
    rivals.push(self);
  }
  const whammy = new WhammySystem(world);
  world.addSystem(new WeaponSystem(world));
  world.addSystem(pickups);
  world.addSystem(whammy);
  world.addSystem(new ChaseCamera(world.camera, { object: player.object, rearView: () => player.input.rearView }));
  world.addSystem(new VfxSystem(world));
  env.follow(player.object);
  const pipe = installPipeline(world, cfg.retro);
  world.addSystem(new ShakeSystem(world));
  for (const s of cfg.extraSystems ?? []) world.addSystem(s);
  cfg.onPlayer?.(player);
  world.addSystem(new StatusOverlay(world, cfg.hudRoot, () => player));
  world.addSystem(new Hud(world, cfg.hudRoot, () => player, (id) => whammy.score(id)));

  let kills = 0;
  let whammies = 0;
  let endTime: number | null = null;
  world.events.on('destroyed', (e) => {
    if (e.sourceId === player.id && e.targetId !== player.id) kills++;
  });
  world.events.on('whammy', (e) => {
    if (e.sourceId === player.id) whammies++;
  });

  const state = (): MatchState => {
    if (!player.alive) return 'lost';
    return rivals.length > 0 && rivals.every((r) => !r.alive) ? 'won' : 'playing';
  };
  return {
    player, rivals, whammy, arena, state,
    stats: () => ({ kills, whammies, score: whammy.score(player.id), time: endTime ?? world.time }),
    dispose: () => (pipe.dispose(), world.reset()),
    markEnd: () => void (endTime ??= world.time),
  };
}
