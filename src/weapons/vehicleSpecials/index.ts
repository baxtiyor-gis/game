import { abductionBeam } from './abduction_beam';
import { airStrike } from './air_strike';
import { bassQuake } from './bass_quake';
import { batteringRam } from './battering_ram';
import { beeSwarm } from './bee_swarm';
import { burner } from './burner';
import { camperBombs } from './camper_bombs';
import { discoBall } from './disco_ball';
import { gridlock } from './gridlock';
import { nitroFlame } from './nitro_flame';
import { smokeScreen } from './smoke_screen';
import { tantrumGun } from './tantrum_gun';
import type { VehicleSpecial } from './types';
import { whiteLightning } from './white_lightning';

/** vehicles.json `special` id si -> mashinaning o'z maxsus quroli (13 ta). */
export const VEHICLE_SPECIALS: ReadonlyMap<string, VehicleSpecial> = new Map(
  [
    gridlock, bassQuake, whiteLightning, tantrumGun, batteringRam, camperBombs, airStrike,
    nitroFlame, discoBall, beeSwarm, burner, smokeScreen, abductionBeam,
  ].map((s) => [s.id, s]),
);
