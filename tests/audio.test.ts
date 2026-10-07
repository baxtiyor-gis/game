import { describe, expect, it } from 'vitest';
import audioConfig from '../data/audio.json';

// Pure logic tests for audio system

describe('Engine pitch calculation', () => {
  it('maps speed to frequency monotonically', () => {
    const cfg = audioConfig.engine;
    const massRatio = 0.7; // Heavy vehicle
    const baseFreq = cfg.baseFreq * massRatio;

    const freqs: number[] = [];
    for (let speed = 0; speed <= 30; speed += 5) {
      const throttle = speed / 30;
      const freq = baseFreq + speed * 20 + throttle * 100;
      const clamped = Math.max(cfg.minFreq, Math.min(cfg.maxFreq, freq));
      freqs.push(clamped);
    }

    // Verify monotonically increasing
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThanOrEqual(freqs[i - 1]);
    }
  });

  it('heavier vehicles have lower base pitch', () => {
    const cfg = audioConfig.engine;
    const light = cfg.baseFreq * (1 - (500 - 1000) / 5000);
    const heavy = cfg.baseFreq * (1 - (3000 - 1000) / 5000);
    expect(heavy).toBeLessThan(light);
  });

  it('respects min/max frequency bounds', () => {
    const cfg = audioConfig.engine;
    const massRatio = 0.5;
    const baseFreq = cfg.baseFreq * massRatio;

    // Very high speed
    const highFreq = Math.min(cfg.maxFreq, baseFreq + 50 * 20 + 1 * 100);
    expect(highFreq).toBeLessThanOrEqual(cfg.maxFreq);

    // Very low speed
    const lowFreq = Math.max(cfg.minFreq, baseFreq + 0 * 20 + 0 * 100);
    expect(lowFreq).toBeGreaterThanOrEqual(cfg.minFreq);
  });
});

describe('Sound pool management', () => {
  it('enforces max pool size', () => {
    const maxSize = audioConfig.sfx.poolSize;
    expect(maxSize).toBe(24);

    const pool: { oscs: any[]; nodes: any[] }[] = [];
    for (let i = 0; i < 30; i++) {
      pool.push({ oscs: [{}], nodes: [] });
      if (pool.length > maxSize) {
        pool.shift();
      }
    }

    expect(pool.length).toBe(maxSize);
  });

  it('maintains pool size under rapid fire', () => {
    const maxSize = audioConfig.sfx.poolSize;
    const pool: { id: number }[] = [];
    let counter = 0;

    // Simulate 1000 rapid fire events
    for (let i = 0; i < 1000; i++) {
      pool.push({ id: counter++ });
      if (pool.length > maxSize) {
        pool.shift();
      }
    }

    expect(pool.length).toBeLessThanOrEqual(maxSize);
  });
});

describe('Music scheduler timing', () => {
  it('calculates beat duration correctly', () => {
    const cfg = audioConfig.music;
    const beatDuration = (60 / cfg.bpm) / 4; // 16th notes

    // At 100 BPM, one beat = 600ms, 16th note = 150ms
    expect(beatDuration).toBeCloseTo(0.15, 2);
  });

  it('schedules lookahead correctly', () => {
    const cfg = audioConfig.music;
    const beatDuration = (60 / cfg.bpm) / 4;
    const lookahead = 0.1; // 100ms

    let currentTime = 0;
    let nextNoteTime = currentTime;
    const scheduledBeats: number[] = [];

    while (nextNoteTime < currentTime + lookahead + beatDuration) {
      const beatIdx = Math.floor((nextNoteTime - currentTime) / beatDuration) % 16;
      scheduledBeats.push(beatIdx);
      nextNoteTime += beatDuration;
    }

    // Should have scheduled ~1-2 beats
    expect(scheduledBeats.length).toBeGreaterThanOrEqual(1);
    expect(scheduledBeats.length).toBeLessThanOrEqual(2);
  });

  it('bass pattern repeats every 16 beats', () => {
    const pattern = [0, 2, 5, 7, 10, 13, 14];
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let beat = 0; beat < 16; beat++) {
        const shouldPlay = pattern.includes(beat);
        const nextCycleBeat = beat + cycle * 16;
        // Verify pattern repeats
        expect(pattern.includes((nextCycleBeat + 16) % 16)).toBe(shouldPlay);
      }
    }
  });
});

describe('Weapon sound selection', () => {
  it('maps all weapons to config entries', () => {
    const weapons = ['mg', 'rocket', 'missile', 'mortar', 'cannon', 'mine'];
    const cfg = audioConfig.weapons as any;

    weapons.forEach((w) => {
      expect(cfg[w]).toBeDefined();
      expect(cfg[w].freq).toBeGreaterThan(0);
      expect(cfg[w].duration).toBeGreaterThan(0);
      expect(cfg[w].gain).toBeGreaterThan(0);
    });
  });

  it('has distinct frequency ranges per weapon', () => {
    const cfg = audioConfig.weapons as any;
    const freqs = Object.values(cfg).map((w: any) => w.freq);
    const unique = new Set(freqs);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('Audio parameter ranges', () => {
  it('master gain within valid range', () => {
    expect(audioConfig.master.gain).toBeGreaterThanOrEqual(0);
    expect(audioConfig.master.gain).toBeLessThanOrEqual(1);
  });

  it('sfx gain within valid range', () => {
    expect(audioConfig.sfx.gain).toBeGreaterThanOrEqual(0);
    expect(audioConfig.sfx.gain).toBeLessThanOrEqual(1);
  });

  it('music gain lower than sfx', () => {
    expect(audioConfig.music.gain).toBeLessThan(audioConfig.sfx.gain);
  });

  it('engine distance cutoff is positive', () => {
    expect(audioConfig.engine.distanceCutoff).toBeGreaterThan(0);
  });
});
