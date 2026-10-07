import type { ModelBuilder } from './types';
import { rattler } from './rattler';
import { jefferson } from './jefferson';
import { clydesdale } from './clydesdale';
import { strider } from './strider';
import { moth } from './moth';
import { stag } from './stag';
import { glenn } from './glenn';
import { palamino } from './palamino';
import { leprechaun } from './leprechaun';
import { van } from './van';
import { sidburn } from './sidburn';
import { bus } from './bus';
import { ufo } from './ufo';

/** id -> procedural builder (data/vehicles.json dagi id lar). */
export const MODELS: Record<string, ModelBuilder | undefined> = {
  rattler,
  jefferson,
  clydesdale,
  strider,
  moth,
  stag,
  glenn,
  palamino,
  leprechaun,
  van,
  sidburn,
  bus,
  ufo,
};
