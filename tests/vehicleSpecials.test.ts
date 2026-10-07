import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { vehicles, t } from '../src/core/data';
import { specialFits } from '../src/ai/aim';
import { VEHICLE_SPECIALS } from '../src/weapons/vehicleSpecials';
import { specialCfg, vsp } from '../src/weapons/vehicleSpecials/params';
import { flashOpacity } from '../src/modes/statusOverlay';
import drivers from '../data/drivers.json';
import audio from '../data/audio.json';
import { setup } from './specialsHarness';

beforeAll(async () => {
  await RAPIER.init();
});

describe('vehicle specials: registry and data', () => {
  it('every vehicle special has an implementation, config, name/desc strings and AI hint', () => {
    expect(vehicles.length).toBe(13);
    for (const v of vehicles) {
      const sp = VEHICLE_SPECIALS.get(v.special);
      expect(sp, v.special).toBeDefined();
      expect(sp!.id).toBe(v.special);
      expect(specialCfg(v.special)?.cooldown).toBeGreaterThan(0);
      expect(specialCfg(v.special)?.ai.mode).toMatch(/front|around|rear/);
      expect(t(`special.${v.special}.name`)).not.toBe(`special.${v.special}.name`);
      expect(drivers[v.id as keyof typeof drivers].specialName).toBe(`special.${v.special}.name`);
      expect((audio.weapons as Record<string, unknown>)[`special.${v.special}`]).toBeDefined();
    }
  });

  it('specialFits: modes front / around / rear', () => {
    const front = { mode: 'front', min: 5, max: 20, cone: 0.4 } as const;
    expect(specialFits(front, 10, 0.1, false)).toBe(true);
    expect(specialFits(front, 10, 0.9, false)).toBe(false);
    expect(specialFits(front, 30, 0, false)).toBe(false);
    expect(specialFits({ mode: 'around', min: 0, max: 15, cone: 3 }, 10, 2.5, false)).toBe(true);
    expect(specialFits({ mode: 'rear', min: 0, max: 18, cone: 3 }, 100, 0, true)).toBe(true);
    expect(specialFits({ mode: 'rear', min: 0, max: 18, cone: 3 }, 5, 0, false)).toBe(false);
  });

  it('flash overlay: fully white at first, fades to 0', () => {
    expect(flashOpacity(2, 2)).toBeCloseTo(vsp.overlay.maxOpacity);
    expect(flashOpacity(0.2, 2)).toBeLessThan(vsp.overlay.maxOpacity);
    expect(flashOpacity(0, 2)).toBe(0);
  });
});

describe('vehicle specials: ammo, cooldown, events', () => {
  it('spends specialAmmo, honours cooldown, emits fire special.<id>', () => {
    const s = setup('rattler', 2);
    s.foe(12);
    s.world.step(30);
    s.press();
    s.world.step(1);
    expect(s.me.inventory.specialAmmo).toBe(1);
    expect(s.events.fire.some((f) => f.weapon === 'special.gridlock' && f.sourceId === s.me.id)).toBe(true);
    s.press();
    s.world.step(1);
    expect(s.me.inventory.specialAmmo).toBe(1); // cooldown
    s.world.step(Math.ceil(vsp.gridlock.cooldown * 60));
    s.press();
    s.world.step(1);
    expect(s.me.inventory.specialAmmo).toBe(0);
  });

  it('does nothing without ammo', () => {
    const s = setup('rattler', 0);
    s.press();
    s.world.step(5);
    expect(s.events.fire.length).toBe(0);
  });

  it('abduction/lightning do not spend ammo without a target', () => {
    for (const id of ['ufo', 'clydesdale']) {
      const s = setup(id, 1);
      s.press();
      s.world.step(5);
      expect(s.me.inventory.specialAmmo).toBe(1);
    }
  });
});

describe('vehicle specials: behaviours', () => {
  it('gridlock: stalls vehicles in the net cone, not outside', () => {
    const s = setup('rattler');
    const a = s.foe(12);
    const b = s.foe(10, 25);
    s.world.step(30);
    s.press();
    s.world.step(50);
    expect(a.stalled).toBeGreaterThan(0.5);
    expect(s.dmg(a, 'gridlock').length).toBe(1);
    expect(b.stalled).toBe(0);
    expect(s.ws.vehicleSpecials.fx.count).toBeGreaterThan(0);
  });

  it('bass_quake: throws nearby vehicles up, damage falls with distance, owner unaffected', () => {
    const s = setup('jefferson');
    const near = s.foe(6, 0, 'van');
    const far = s.foe(0, 16, 'van');
    s.world.step(30);
    let maxY = 0;
    s.press();
    for (let i = 0; i < 60; i++) { s.world.step(1); maxY = Math.max(maxY, near.body.linvel().y); }
    expect(maxY).toBeGreaterThan(3);
    expect(s.dmg(near, 'bass_quake')[0].amount).toBeGreaterThan(s.dmg(far, 'bass_quake')[0].amount);
    expect(s.dmg(s.me, 'bass_quake').length).toBe(0);
  });

  it('white_lightning: strikes the nearest forward target, stalls and damages', () => {
    const s = setup('clydesdale');
    const a = s.foe(20);
    s.world.step(30);
    s.press();
    s.world.step(2);
    expect(a.stalled).toBeGreaterThan(2);
    expect(s.dmg(a, 'white_lightning')[0].amount).toBe(vsp.white_lightning.damage);
    expect(s.ws.vehicleSpecials.fx.count).toBeGreaterThanOrEqual(3);
  });
});
