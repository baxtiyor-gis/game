import * as THREE from 'three';
import type { System } from '../core/types';
import type { BuildContext } from './context';
import { towerLampHeight } from './props/guardTower';
import { cachedGeo } from './props/common';
import { base } from './props/baseKit';

const S = base.searchlight;

export interface Searchlight {
  lamp: THREE.Vector3;
  phase: number;
  light: THREE.SpotLight | null;
  target: THREE.Object3D;
  beam: THREE.Mesh;
  /** Hozirgi yoritilgan nuqta (dunyo) */
  aim: THREE.Vector3;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const dir = new THREE.Vector3();

/** Qo'riqlash minoralaridagi qidiruv proyektorlari: nur yer bo'ylab aylanma/elliptik supurib yuradi. Haqiqiy SpotLight faqat 'spot' minoralarda (kam — unumdorlik). */
export class SearchlightSystem implements System {
  readonly name = 'searchlights';
  private t = 0;

  constructor(
    readonly rigs: Searchlight[],
    private readonly heightAt: (x: number, z: number) => number,
    private readonly mat: THREE.Material,
  ) {
    this.aimAll(0);
  }

  private aimAll(t: number): void {
    for (const r of this.rigs) {
      const a = r.phase + t * S.speed;
      const k = 0.5 + 0.5 * Math.sin(t * S.radialSpeed + r.phase * 2);
      const rad = S.sweepMin + (S.sweepMax - S.sweepMin) * k;
      const x = r.lamp.x + Math.cos(a) * rad;
      const z = r.lamp.z + Math.sin(a) * rad;
      r.aim.set(x, this.heightAt(x, z), z);
      r.target.position.copy(r.aim);
      r.target.updateMatrixWorld();
      dir.subVectors(r.aim, r.lamp);
      const len = dir.length();
      r.beam.quaternion.setFromUnitVectors(DOWN, dir.multiplyScalar(1 / len));
      r.beam.scale.set(S.beam.radius, len, S.beam.radius);
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.aimAll(this.t);
  }

  dispose(): void {
    this.mat.dispose();
    for (const r of this.rigs) r.light?.dispose();
  }
}

/** Arena qurilishida: `guardTower` proplaridan `light` belgilanganlari uchun proyektor (spot = SpotLight + nur, beam = faqat nur). */
export function createSearchlights(ctx: BuildContext): SearchlightSystem | null {
  const towers = ctx.def.props.filter((p) => p.type === 'guardTower' && p.light);
  if (towers.length === 0) return null;
  const mat = new THREE.MeshBasicMaterial({ color: S.beam.color, transparent: true, opacity: S.beam.opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const geo = cachedGeo('search.beam', () => new THREE.ConeGeometry(1, 1, 18, 1, true).translate(0, -0.5, 0));
  const rigs: Searchlight[] = towers.map((def, i) => {
    const [x, z] = def.pos;
    const lamp = new THREE.Vector3(x, ctx.heightAt(x, z) + towerLampHeight(), z);
    const target = new THREE.Object3D();
    const beam = new THREE.Mesh(geo, mat);
    beam.position.copy(lamp);
    beam.frustumCulled = false;
    ctx.root.add(target, beam);
    let light: THREE.SpotLight | null = null;
    if (def.light === 'spot') {
      light = new THREE.SpotLight(S.color, S.intensity, S.distance, S.angle, S.penumbra, S.decay);
      light.position.copy(lamp);
      light.target = target;
      light.castShadow = false;
      ctx.root.add(light);
    }
    return { lamp, phase: i * 2.1, light, target, beam, aim: new THREE.Vector3() };
  });
  return new SearchlightSystem(rigs, ctx.heightAt, mat);
}
