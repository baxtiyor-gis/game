import { describe, expect, it } from 'vitest';
import { t, vehicles } from '../src/core/data';
import { MENU, DRIVERS } from '../src/ui/menu/config';
import { MenuNav, accelTime, factionGroups, flatOrder, formatTime, pickRivals, statBars, stepGroup, stepIndex, topSpeedKmh } from '../src/ui/menu/logic';
import { isUnlocked, sanitize } from '../src/ui/menu/store';

describe('stepIndex', () => {
  it('o\'chirilgan qatorlarni o\'tkazadi va aylanadi', () => {
    const en = [true, false, false, true, true];
    expect(stepIndex(0, 1, en)).toBe(3);
    expect(stepIndex(4, 1, en)).toBe(0);
    expect(stepIndex(0, -1, en)).toBe(4);
    expect(stepIndex(3, -1, en)).toBe(0);
  });
  it('hammasi o\'chiq bo\'lsa joyida qoladi', () => {
    expect(stepIndex(2, 1, [false, false, false])).toBe(2);
  });
});

describe('MenuNav', () => {
  it('home -> select -> setup va orqaga', () => {
    const nav = new MenuNav();
    nav.go('select');
    nav.go('setup');
    expect(nav.back()).toBe('select');
    expect(nav.back()).toBe('home');
    expect(nav.back()).toBeNull();
    expect(nav.screen).toBe('home');
  });
  it('har ekran o\'z fokusini eslab qoladi', () => {
    const nav = new MenuNav();
    nav.move(1, [true, true, true]);
    nav.go('settings');
    expect(nav.index()).toBe(0);
    nav.go('home');
    expect(nav.index()).toBe(1);
  });
});

describe('statistika', () => {
  it('4 bar, qiymat 1..5, ulush qiymat/5', () => {
    for (const v of vehicles) {
      const bars = statBars(v);
      expect(bars).toHaveLength(4);
      for (const b of bars) {
        expect(b.value).toBeGreaterThanOrEqual(1);
        expect(b.value).toBeLessThanOrEqual(MENU.statMax);
        expect(b.fraction).toBeCloseTo(b.value / MENU.statMax, 6);
      }
    }
  });
  it('tezlik va 0-100 mantiqiy', () => {
    const rattler = vehicles.find((v) => v.id === 'rattler')!;
    const moth = vehicles.find((v) => v.id === 'moth')!;
    expect(topSpeedKmh(rattler)).toBeGreaterThan(topSpeedKmh(moth));
    const a = accelTime(rattler)!;
    expect(a).toBeGreaterThan(1);
    expect(a).toBeLessThan(15);
    const m = accelTime(moth);
    expect(m === null || m > a).toBe(true);
  });
  it('vaqt formati', () => {
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('ro\'yxat', () => {
  it('13 mashina fraksiya bo\'yicha guruhlangan', () => {
    expect(vehicles).toHaveLength(13);
    const g = factionGroups(vehicles);
    expect(g.map((x) => x.faction)).toEqual(['vigilante', 'coyote', 'secret']);
    expect(g.reduce((n, x) => n + x.items.length, 0)).toBe(13);
    expect(flatOrder(vehicles)).toHaveLength(13);
  });
  it('stepGroup fraksiyalar orasida aylanadi', () => {
    const order = flatOrder(vehicles);
    const down = stepGroup(order, 0, 1);
    expect(order[down]!.faction).toBe('coyote');
    expect(order[stepGroup(order, down, 1)]!.faction).toBe('secret');
    expect(order[stepGroup(order, 0, -1)]!.faction).toBe('secret');
  });
  it('har mashinada biografiya, maxsus qurol va matnlar bor', () => {
    for (const v of vehicles) {
      const d = DRIVERS[v.id]!;
      expect(d).toBeDefined();
      for (const k of [d.bio, d.specialName, d.specialDesc, v.name, v.driver]) expect(t(k)).not.toBe(k);
    }
  });
  it('menyu matnlari strings.json da mavjud', () => {
    const keys = [...MENU.home.map((i) => i.label), ...MENU.arenas.map((a) => a.name), ...MENU.difficulties.map((d) => d.label),
      ...MENU.bars.map((b) => b.label), ...MENU.factions.map((f) => f.label), ...MENU.controlRows.map((r) => r.label)];
    for (const k of keys) expect(t(k), k).not.toBe(k);
  });
});

describe('pickRivals', () => {
  const seq = (...n: number[]) => {
    let i = 0;
    return () => n[i++ % n.length]!;
  };
  it('tanlangan mashinani istisno qiladi va takrorlamaydi', () => {
    for (const v of vehicles) {
      for (let c = 1; c <= 6; c++) {
        const r = pickRivals(vehicles, v.id, c);
        expect(r).toHaveLength(c);
        expect(r).not.toContain(v.id);
        expect(new Set(r).size).toBe(c);
      }
    }
  });
  it('tasodifiy: rng ga bog\'liq', () => {
    const a = pickRivals(vehicles, 'rattler', 3, seq(0.1, 0.5, 0.9, 0.3));
    const b = pickRivals(vehicles, 'rattler', 3, seq(0.9, 0.2, 0.4, 0.8));
    expect(a).not.toEqual(b);
    expect(pickRivals(vehicles, 'rattler', 3, seq(0.1, 0.5, 0.9, 0.3))).toEqual(a);
  });
  it('mavjuddan ko\'p so\'ralsa kesadi', () => {
    expect(pickRivals(vehicles, 'rattler', 99)).toHaveLength(12);
  });
});

describe('sozlamalar', () => {
  it('buzilgan qiymatlar default ga qaytadi', () => {
    const s = sanitize({ volume: 7, rivals: 100, difficulty: 'xyz', vehicle: 'nope', arena: 'canyonlands' }, vehicles);
    expect(s.volume).toBe(1);
    expect(s.rivals).toBe(MENU.rivals.max);
    expect(s.difficulty).toBe(MENU.defaults.difficulty);
    expect(s.vehicle).toBe(MENU.defaults.vehicle);
    expect(s.arena).toBe('oil_fields');
    expect(sanitize(null, vehicles)).toEqual(MENU.defaults);
  });
  it('qulflangan mashina faqat "Hammasini ochish" bilan', () => {
    const bus = vehicles.find((v) => v.id === 'bus')!;
    expect(bus.locked).toBe(true);
    expect(sanitize({ vehicle: 'bus' }, vehicles).vehicle).toBe('rattler');
    expect(sanitize({ vehicle: 'bus', unlockAll: true }, vehicles).vehicle).toBe('bus');
    expect(isUnlocked(bus, { ...MENU.defaults, unlockAll: true })).toBe(true);
    expect(isUnlocked(bus, MENU.defaults)).toBe(false);
  });
});
