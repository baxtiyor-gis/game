import type { Faction } from '../core/types';

/** HUD sozlamalari (vizual/UX konstantalar). */
export const HUD = {
  segments: 12,
  critical: 0.1, // hp ulushi: shundan past bo'lsa miltillaydi
  radarRange: 120, // m
  radarPx: 128, // canvas ichki o'lchami (CSS da kattalashtiriladi)
  radarBlip: 4,
  targetRange: 150, // m
  targetMinCos: 0.8, // oldi konusi (cos)
  forwardEps: 1e-4,
  scorePad: 6,
  msgSeconds: 1.4,
  msgQueueMax: 4,
  hpPalette: ['#ffd23f', '#ffb02e', '#ff8a1f', '#e5252a'],
  factionColors: { vigilante: '#4fc3ff', coyote: '#ff3b2f', secret: '#c77dff' } as Record<Faction, string>,
  radarBg: '#120600',
  radarLine: '#ff8a1f',
  radarSelf: '#ffd23f',
} as const;
