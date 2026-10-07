import * as THREE from 'three';
import type { VehicleDef } from '../core/types';
import { wheelLayout } from './layout';
import type { WheelSpec } from './layout';
import { Kit } from './models/kit';
import type { Part } from './models/kit';
import { MODELS } from './models/registry';
import { wheelParts } from './models/wheels';
import { paint } from './models/palette';
import { roundBox } from './models/shapes';

export interface WheelVisual {
  spec: WheelSpec;
  pivot: THREE.Group; // rul (Y) va osma holati
  spin: THREE.Group; // aylanish (X)
}

export interface VehicleModel {
  root: THREE.Group;
  wheels: WheelVisual[];
}

interface Template {
  body: Part[];
  wheel: Part[];
}

const templates = new Map<string, Template>();

/** Mashina turi bo'yicha geometriya va shablon materiallarni bir marta quradi (keshlanadi). */
function template(def: VehicleDef): Template {
  const hit = templates.get(def.id);
  if (hit) return hit;
  const k = new Kit(def);
  const builder = MODELS[def.id];
  if (builder) builder.build(k);
  else k.add(roundBox(k.w, k.h * 0.8, k.l, 0.1), paint(def.color));
  const s = k.wheels[0]!;
  const t: Template = { body: k.parts(), wheel: wheelParts(s.radius, s.width, builder?.wheel ?? 'street') };
  templates.set(def.id, t);
  return t;
}

/** Shablon geometriyasi umumiy, materiallar har nusxada clone (shikast/qoldiq rangi uchun). */
function instantiate(parts: Part[], into: THREE.Object3D, mats: Map<THREE.Material, THREE.Material>): void {
  for (const p of parts) {
    let m = mats.get(p.mat);
    if (!m) {
      m = p.mat.clone();
      mats.set(p.mat, m);
    }
    const mesh = new THREE.Mesh(p.geo, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    into.add(mesh);
  }
}

function buildWheel(spec: WheelSpec, t: Template, mats: Map<THREE.Material, THREE.Material>): WheelVisual {
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const flip = new THREE.Group();
  if (spec.x < 0) flip.rotation.y = Math.PI; // disk doim tashqariga qaraydi
  instantiate(t.wheel, flip, mats);
  spin.add(flip);
  pivot.add(spin);
  pivot.position.set(spec.x, spec.y - spec.restLength, spec.z);
  return { spec, pivot, spin };
}

/** Mid-poly procedural mashina (kuzov + g'ildiraklar). Lokal +Z = old. */
export function createVehicleModel(def: VehicleDef): VehicleModel {
  const t = template(def);
  const root = new THREE.Group();
  const mats = new Map<THREE.Material, THREE.Material>();
  instantiate(t.body, root, mats);
  const wheels = wheelLayout(def).map((spec) => buildWheel(spec, t, mats));
  for (const wv of wheels) root.add(wv.pivot);
  return { root, wheels };
}

/** Bitta g'ildirakni joylashtiradi: rul burchagi, aylanish burchagi, osma uzunligi. */
export function poseWheel(wv: WheelVisual, steer: number, rotation: number, suspLength: number): void {
  wv.pivot.rotation.y = steer;
  wv.pivot.position.y = wv.spec.y - suspLength;
  wv.spin.rotation.x = rotation;
}
