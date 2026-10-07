import { describe, expect, it } from 'vitest';
import {
  aheadDistance,
  fillTemplate,
  formatScore,
  isCritical,
  litSegments,
  ndcToPixel,
  stageColor,
  stageOf,
  worldToRadar,
  type RadarPoint,
} from '../src/ui/format';
import { HUD } from '../src/ui/hudConfig';
import { t } from '../src/core/data';

const pt = (): RadarPoint => ({ x: 0, y: 0, clamped: false });

describe('hp formatlash', () => {
  it('segmentlar soni', () => {
    expect(litSegments(100, 100, 12)).toBe(12);
    expect(litSegments(50, 100, 12)).toBe(6);
    expect(litSegments(1, 100, 12)).toBe(1); // tirik bo'lsa kamida 1
    expect(litSegments(0, 100, 12)).toBe(0);
    expect(litSegments(150, 100, 12)).toBe(12);
  });
  it('bosqich va rang', () => {
    const limits = [0.6, 0.3, 0.1];
    expect(stageOf(100, 100, limits)).toBe(0);
    expect(stageOf(50, 100, limits)).toBe(1);
    expect(stageOf(5, 100, limits)).toBe(3);
    expect(stageColor(0, HUD.hpPalette)).toBe(HUD.hpPalette[0]);
    expect(stageColor(99, HUD.hpPalette)).toBe(HUD.hpPalette[HUD.hpPalette.length - 1]);
  });
  it('kritik holat', () => {
    expect(isCritical(5, 100, 0.1)).toBe(true);
    expect(isCritical(50, 100, 0.1)).toBe(false);
    expect(isCritical(0, 100, 0.1)).toBe(false);
  });
});

describe('radar koordinata', () => {
  it('oldidagi raqib yuqorida', () => {
    const p = worldToRadar(0, 60, 0, 1, 120, pt());
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-0.5);
    expect(p.clamped).toBe(false);
  });
  it('orqadagi raqib pastda', () => {
    expect(worldToRadar(0, -60, 0, 1, 120, pt()).y).toBeCloseTo(0.5);
  });
  it("o'ng tomon musbat x (Three.js: +z ga qaraganda o'ng = -x)", () => {
    expect(worldToRadar(-60, 0, 0, 1, 120, pt()).x).toBeCloseTo(0.5);
    expect(worldToRadar(60, 0, 1, 0, 120, pt()).y).toBeCloseTo(-0.5);
    expect(worldToRadar(0, 60, 1, 0, 120, pt()).x).toBeCloseTo(0.5);
  });
  it('uzoq raqib chetga qisiladi', () => {
    const p = worldToRadar(0, 600, 0, 1, 120, pt());
    expect(p.clamped).toBe(true);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(1);
  });
});

describe('nishon va yordamchilar', () => {
  it('konus va masofa', () => {
    expect(aheadDistance(0, 50, 0, 1, 150, 0.8)).toBeCloseTo(50);
    expect(aheadDistance(0, -50, 0, 1, 150, 0.8)).toBe(Infinity);
    expect(aheadDistance(50, 5, 0, 1, 150, 0.8)).toBe(Infinity);
    expect(aheadDistance(0, 200, 0, 1, 150, 0.8)).toBe(Infinity);
  });
  it('ndc -> piksel', () => {
    expect(ndcToPixel(0, 0, 400, 200)).toEqual({ x: 200, y: 100 });
    expect(ndcToPixel(-1, 1, 400, 200)).toEqual({ x: 0, y: 0 });
  });
  it('shablon va ochko', () => {
    expect(fillTemplate('WHAMMY x{n}!', { n: 3 })).toBe('WHAMMY x3!');
    expect(fillTemplate('{x}', {})).toBe('{x}');
    expect(formatScore(42.9, 6)).toBe('000042');
    expect(formatScore(-5, 3)).toBe('000');
  });
  it('HUD matnlari strings.json da', () => {
    for (const k of ['hud.whammy', 'hud.destroyed', 'hud.win', 'hud.lose', 'hud.enemies', 'hud.score', 'hud.pickup', 'hud.empty', 'hud.special', 'hud.infinite', 'hud.pickup.health', 'hud.pickup.special', 'weapon.mg']) {
      expect(t(k)).not.toBe(k);
    }
  });
});
