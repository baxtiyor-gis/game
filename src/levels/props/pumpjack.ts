import * as THREE from 'three';
import type { Rapier, System } from '../../core/types';
import { box, cachedGeo, mesh, propCfg, stdMat } from './common';
import type { Origin, PropBuild } from './common';

const pc = propCfg.pumpjack;
const col = propCfg.colors;

export interface PumpjackRig {
  build: PropBuild;
  /** t = faza (rad) */
  animate(t: number): void;
}

/** Neft nasosi (pumpjack): baza, A-ustun, tebranuvchi to'sin, krank, shatun, silliq shtok. +z — ot boshi tomoni. */
export function createPumpjack(R: Rapier, o: Origin): PumpjackRig {
  const body = stdMat('pj.body', col.pumpBody, 0.55, 0.35);
  const beamMat = stdMat('pj.beam', col.pumpBeam, 0.5, 0.4);
  const baseMat = stdMat('pj.base', col.pumpBase, 0.8, 0.2);
  const cube = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const cyl = cachedGeo('unitCyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], s: [number, number, number], rx = 0): THREE.Mesh => {
    const m = mesh(geo, mat, ...p);
    m.scale.set(...s);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };

  add(cube, baseMat, [0, 0.25, 0], [2.2, 0.5, 8]);
  // A-ustun: har tomonda ikki qiya oyoq
  for (const sx of [-0.9, 0.9]) {
    add(cube, body, [sx, 2.8, 0.9], [0.28, 5.4, 0.28], 0.18);
    add(cube, body, [sx, 2.8, -0.9], [0.28, 5.4, 0.28], -0.18);
  }
  add(cube, baseMat, [0, pc.pivotHeight, 0], [2.2, 0.3, 0.5]);

  // To'sin (pivotda aylanadi)
  const pivot = new THREE.Group();
  pivot.position.set(0, pc.pivotHeight + 0.4, 0);
  g.add(pivot);
  const beam = mesh(cube, beamMat);
  beam.scale.set(0.6, 0.7, pc.beamLength);
  pivot.add(beam);
  const head = mesh(cachedGeo('pj.head', () => new THREE.CylinderGeometry(1.5, 1.5, 0.6, 12, 1, false, 0, Math.PI / 2).rotateZ(Math.PI / 2)), beamMat, 0, -0.2, pc.beamLength / 2 - 1.2);
  pivot.add(head);

  // Krank + qarshi og'irlik
  const crank = new THREE.Group();
  const crankPos = new THREE.Vector3(0, 1.8, -2.6);
  crank.position.copy(crankPos);
  g.add(crank);
  for (const sx of [-0.8, 0.8]) {
    const disc = mesh(cyl, body, sx, 0, 0);
    disc.scale.set(1.25, 0.3, 1.25);
    disc.rotation.z = Math.PI / 2;
    const weight = mesh(cube, baseMat, sx, 0.9, 0);
    weight.scale.set(0.35, 0.9, 1.1);
    crank.add(disc, weight);
  }
  add(cube, baseMat, [0, 0.9, -2.6], [1.2, 1.8, 0.8]);

  // Shatun (pitman) va shtok
  const pitman = mesh(cube, baseMat);
  pitman.scale.set(0.16, 1, 0.16);
  g.add(pitman);
  add(cyl, baseMat, [0, 0.9, 4.0], [0.35, 1.8, 0.35]);
  const rod = add(cyl, beamMat, [0, 2.2, 4.0], [0.12, 2.4, 0.12]);
  add(cube, baseMat, [0, 0.3, 4.0], [1.4, 0.6, 1.4]);

  const pin = new THREE.Vector3();
  const rear = new THREE.Vector3();
  const half = pc.beamLength / 2;
  const animate = (t: number): void => {
    const a = Math.sin(t) * pc.beamAmplitude;
    pivot.rotation.x = a;
    crank.rotation.x = t;
    pin.set(0, crankPos.y + Math.cos(t) * pc.crankRadius, crankPos.z + Math.sin(t) * pc.crankRadius);
    rear.set(0, pivot.position.y + Math.sin(a) * half, -Math.cos(a) * half);
    const dy = rear.y - pin.y;
    const dz = rear.z - pin.z;
    pitman.position.set(0, (rear.y + pin.y) / 2, (rear.z + pin.z) / 2);
    pitman.scale.y = Math.hypot(dy, dz);
    pitman.rotation.x = Math.atan2(dz, dy);
    rod.position.y = 2.2 - Math.sin(a) * half * 0.5;
  };
  animate(0);

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const colliders = [box(R, o, [0, 0.4, 0], [1.1, 0.4, 4]), box(R, o, [0, 2.2, 0], [1.1, 2.2, 1.4]), box(R, o, [0, 0.9, -2.6], [0.8, 0.9, 0.8])];
  return { build: { object: g, colliders }, animate };
}

/** Barcha nasoslarni bitta System bilan yuritadi (har kadr, render). */
export class PumpjackSystem implements System {
  readonly name = 'pumpjacks';
  private t = 0;
  constructor(private readonly rigs: Array<{ rig: PumpjackRig; speed: number; phase: number }>) {}

  update(dt: number): void {
    this.t += dt;
    for (const r of this.rigs) r.rig.animate(this.t * r.speed + r.phase);
  }
}
