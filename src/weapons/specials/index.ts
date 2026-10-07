import { cannonMoves } from './cannonMoves';
import { mineMoves } from './mineMoves';
import { missileMoves } from './missileMoves';
import { mortarMoves } from './mortarMoves';
import { rocketMoves } from './rocketMoves';
import type { SpecialMove } from './types';

/** combo id -> maxsus harakat (15 ta). */
export const SPECIALS: ReadonlyMap<string, SpecialMove> = new Map(
  [...missileMoves, ...rocketMoves, ...mortarMoves, ...cannonMoves, ...mineMoves].map((m) => [m.id, m]),
);
