import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { vehicleDef } from '../src/core/data';
import { spawnVehicle } from '../src/vehicles/vehicle';
import { BotController } from '../src/ai/botController';
import { WeaponSystem } from '../src/weapons/weaponSystem';
import { vsp } from '../src/weapons/vehicleSpecials/params';
import type { GameWorld, VehicleHandle } from '../src/core/types';
import { FakeWorld, idle, pos, setup } from './specialsHarness';

beforeAll(async () => {
  await RAPIER.init();
});

describe('vehicle specials: behaviours (2)', () => {
  it('tantrum_gun: turret shoots a foe behind the car (360 degrees) for its duration', () => {
    const s = setup('strider');
    const a = s.foe(-14);
    s.world.step(30);
    s.press();
    s.world.step(120);
    const n = s.dmg(a, 'tantrum_gun').length;
    expect(n).toBeGreaterThan(5);
    s.world.step(Math.ceil((vsp.tantrum_gun.duration + 1) * 60));
    const after = s.dmg(a, 'tantrum_gun').length;
    s.world.step(60);
    expect(s.dmg(a, 'tantrum_gun').length).toBe(after); // turret gone
  });

  it('battering_ram: mass and armor rise, collision damage x3, then restored', () => {
    const s = setup('moth');
    const a = s.foe(8);
    s.world.step(30);
    const base = s.me.body.mass();
    s.press();
    s.world.step(10);
    expect(s.me.body.mass()).toBeGreaterThan(base * (vsp.battering_ram.massMul - 0.5));
    expect(s.me.status!.armorMul).toBe(vsp.battering_ram.armorMul);
    s.world.events.emit('damage', { targetId: a.id, sourceId: s.me.id, amount: 4, weapon: 'collision' });
    const extra = s.dmg(a, 'battering_ram');
    expect(extra[0].amount).toBeCloseTo(4 * (vsp.battering_ram.collisionMul - 1));
    s.world.step(Math.ceil(vsp.battering_ram.duration * 60) + 5);
    expect(s.me.body.mass()).toBeCloseTo(base, 0);
    expect(s.me.status!.armorMul).toBe(1);
  });

  it('camper_bombs: 3 bombs bounce and explode repeatedly behind the car', () => {
    const s = setup('stag');
    s.world.step(30);
    s.press();
    s.world.step(240);
    expect(s.events.explosion.length).toBeGreaterThanOrEqual(vsp.camper_bombs.count * 2);
    const behind = s.events.explosion.filter((e) => e.pos.dot(s.fwd) < -1).length;
    expect(behind).toBeGreaterThanOrEqual(vsp.camper_bombs.count);
    expect(s.events.explosion.some((e) => e.radius === vsp.camper_bombs.radius)).toBe(true);
  });

  it('air_strike: 5 rockets land only after the delay, around the target', () => {
    const s = setup('glenn');
    const a = s.foe(25);
    s.world.step(30);
    s.press();
    s.world.step(Math.floor((vsp.air_strike.delay - 0.3) * 60));
    expect(s.events.explosion.length).toBe(0);
    s.world.step(120);
    const hits = s.events.explosion.filter((e) => e.radius === vsp.air_strike.splash);
    expect(hits.length).toBe(vsp.air_strike.count);
    for (const h of hits) expect(Math.hypot(h.pos.x - pos(a).x, h.pos.z - pos(a).z)).toBeLessThan(vsp.air_strike.radius + 6);
  });

  it('nitro_flame: boosts speed and burns vehicles standing in the trail', () => {
    const s = setup('palamino');
    const a = s.foe(-3.5);
    s.world.step(30);
    s.press();
    s.world.step(40);
    expect(s.me.speed()).toBeGreaterThan(8);
    s.world.step(60);
    expect(s.dmg(a, 'nitro_flame').length).toBeGreaterThan(0);
    expect(s.dmg(s.me, 'nitro_flame').length).toBe(0);
  });

  it('disco_ball: blinds foes in radius (status + event), small damage, far foe untouched', () => {
    const s = setup('leprechaun');
    const near = s.foe(10);
    const far = s.foe(60);
    s.world.step(30);
    s.press();
    s.world.step(2);
    expect(near.status!.blind).toBeGreaterThan(1);
    expect(s.events.status.some((e) => e.kind === 'blind' && e.targetId === near.id)).toBe(true);
    expect(s.dmg(near, 'disco_ball').length).toBe(1);
    expect(far.status!.blind).toBe(0);
    s.world.step(Math.ceil((vsp.disco_ball.blind + 0.5) * 60));
    expect(near.status!.blind).toBe(0);
  });

  it('bee_swarm: slow homing bees keep chasing and sting the target', () => {
    const s = setup('van');
    const a = s.foe(25, 10, 'rattler');
    s.world.step(30);
    s.press();
    s.world.step(300);
    expect(s.dmg(a, 'bee_swarm').length).toBeGreaterThanOrEqual(2);
  });

  it('burner: strong DPS in a short forward cone only', () => {
    const s = setup('sidburn');
    const a = s.foe(6);
    const b = s.foe(6, 8);
    s.world.step(30);
    s.press();
    s.world.step(90);
    const total = s.dmg(a, 'burner').reduce((x, d) => x + d.amount, 0);
    expect(total).toBeGreaterThan(vsp.burner.dps * 0.8);
    expect(s.dmg(b, 'burner').length).toBe(0);
  });

  it('smoke_screen: vehicles inside get smoke status (radar/AI hidden) and mines are scattered', () => {
    const s = setup('bus');
    const a = s.foe(-8);
    s.world.step(30);
    s.press();
    s.world.step(10);
    expect(a.status!.smoke).toBeGreaterThan(0);
    expect(s.ws.projectiles.activeCount).toBeGreaterThanOrEqual(vsp.smoke_screen.mines);
    s.world.step(Math.ceil(vsp.smoke_screen.duration * 60) + 60);
    expect(a.status!.smoke).toBe(0);
  });

  it('abduction_beam: lifts the target into the air, then drops it with damage', () => {
    const s = setup('ufo');
    const a = s.foe(15);
    s.world.step(30);
    const y0 = pos(a).y;
    s.press();
    s.world.step(60);
    expect(pos(a).y).toBeGreaterThan(y0 + 2);
    expect(s.dmg(a, 'abduction_beam').length).toBe(0);
    s.world.step(60);
    expect(s.dmg(a, 'abduction_beam').length).toBe(1);
  });
});

describe('vehicle specials: bots', () => {
  it('a bot fires its special at a nearby enemy (around mode) and AI loses targets inside smoke', () => {
    const world = new FakeWorld();
    const gw = world as unknown as GameWorld;
    let me: VehicleHandle | undefined;
    const bot = new BotController(gw, () => me, { profile: 'jefferson', difficulty: 'hard' });
    me = spawnVehicle(gw, vehicleDef('jefferson'), bot, { x: 0, y: 1, z: 0 }, 0);
    me.inventory.specialAmmo = 1;
    me.inventory.slots.push({ weapon: 'rocket', ammo: 12 });
    const ws = new WeaponSystem(gw);
    world.addSystem(ws);
    spawnVehicle(gw, vehicleDef('van'), idle, { x: 0, y: 1, z: 10 }, Math.PI);
    const fired: string[] = [];
    world.events.on('fire', (e) => fired.push(e.weapon));
    for (let i = 0; i < 600; i++) world.step(1);
    expect(fired).toContain('special.bass_quake');
    expect(me.inventory.specialAmmo).toBe(0);
  });

  it('blind bots get a larger aim error; smoke hides the enemy beyond see-range', () => {
    expect(vsp.status.blindAimMul).toBeGreaterThan(1);
    const world = new FakeWorld();
    const gw = world as unknown as GameWorld;
    let me: VehicleHandle | undefined;
    const bot = new BotController(gw, () => me, { profile: 'rattler', difficulty: 'hard' });
    me = spawnVehicle(gw, vehicleDef('rattler'), bot, { x: 0, y: 1, z: 0 }, 0);
    const enemy = spawnVehicle(gw, vehicleDef('van'), idle, { x: 0, y: 1, z: 40 }, Math.PI);
    for (let i = 0; i < 60; i++) world.step(1);
    expect(bot.debugInfo()).toContain(`tgt=${enemy.id}`);
    enemy.status!.smoke = 5;
    for (let i = 0; i < 60; i++) { enemy.status!.smoke = 5; world.step(1); }
    expect(bot.debugInfo()).toContain('tgt=-');
  });
});
