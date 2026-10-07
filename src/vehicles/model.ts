import * as THREE from 'three';
import type { VehicleDef } from '../core/types';
import { wheelLayout } from './layout';
import type { WheelSpec } from './layout';

export interface WheelVisual {
  spec: WheelSpec;
  pivot: THREE.Group; // rul (Y) va osma holati
  spin: THREE.Group; // aylanish (X)
}

export interface VehicleModel {
  root: THREE.Group;
  wheels: WheelVisual[];
}

const lambert = (color: THREE.ColorRepresentation, emissive?: string): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: emissive ?? '#000000' });

function box(w: number, h: number, l: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
  m.position.set(x, y, z);
  return m;
}

/** Kabinaning tepa qismini toraytirib, "trapetsiya" shakl beradi. */
function taper(mesh: THREE.Mesh, topScaleX: number, topScaleZ: number): void {
  const pos = mesh.geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * topScaleX);
      pos.setZ(i, pos.getZ(i) * topScaleZ);
    }
  }
  mesh.geometry.computeVertexNormals();
}

function buildWheel(spec: WheelSpec, tire: THREE.Material, hub: THREE.Material): WheelVisual {
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  const tireMesh = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius, spec.radius, spec.width, 10), tire);
  tireMesh.rotation.z = Math.PI / 2;
  const side = Math.sign(spec.x);
  const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius * 0.55, spec.radius * 0.55, spec.width * 1.06, 6), hub);
  hubMesh.rotation.z = Math.PI / 2;
  hubMesh.position.x = side * spec.width * 0.02;
  spin.add(tireMesh, hubMesh);
  pivot.add(spin);
  pivot.position.set(spec.x, spec.y - spec.restLength, spec.z);
  return { spec, pivot, spin };
}

/** Procedural low-poly mashina: korpus + kabina + spoyler + chiroqlar + 4 g'ildirak. Lokal +Z = old. */
export function createVehicleModel(def: VehicleDef): VehicleModel {
  const [w, h, l] = def.size;
  const root = new THREE.Group();
  const paint = lambert(def.color);
  const dark = lambert(new THREE.Color(def.color).multiplyScalar(0.55));
  const glass = lambert('#1d2a38');
  const trim = lambert('#1b1b1f');
  const lamp = lambert('#fff2b0', '#ffe27a');
  const tail = lambert('#ff3b30', '#aa1a14');

  root.add(box(w, h * 0.4, l, paint, 0, -h * 0.18, 0)); // pastki korpus
  root.add(box(w * 1.02, h * 0.1, l * 1.02, trim, 0, -h * 0.34, 0)); // bamper chizig'i
  const hood = box(w * 0.94, h * 0.1, l * 0.34, dark, 0, h * 0.06, l * 0.3); // kapot
  root.add(hood);
  const cabin = box(w * 0.86, h * 0.44, l * 0.42, dark, 0, h * 0.26, -l * 0.1);
  taper(cabin, 0.82, 0.7);
  root.add(cabin);
  const win = box(w * 0.9, h * 0.22, l * 0.36, glass, 0, h * 0.27, -l * 0.1);
  taper(win, 0.82, 0.74);
  root.add(win);
  root.add(box(w * 0.96, h * 0.05, l * 0.1, trim, 0, h * 0.24, -l * 0.46)); // spoyler
  for (const sx of [-1, 1]) {
    root.add(box(w * 0.2, h * 0.1, l * 0.02, lamp, sx * w * 0.3, -h * 0.12, l * 0.5));
    root.add(box(w * 0.2, h * 0.1, l * 0.02, tail, sx * w * 0.3, -h * 0.12, -l * 0.5));
  }

  const tire = lambert('#121214');
  const hub = lambert('#9aa0a8');
  const wheels = wheelLayout(def).map((spec) => buildWheel(spec, tire, hub));
  for (const wv of wheels) root.add(wv.pivot);
  return { root, wheels };
}

/** Bitta g'ildirakni joylashtiradi: rul burchagi, aylanish burchagi, osma uzunligi. */
export function poseWheel(wv: WheelVisual, steer: number, rotation: number, suspLength: number): void {
  wv.pivot.rotation.y = steer;
  wv.pivot.position.y = wv.spec.y - suspLength;
  wv.spin.rotation.x = rotation;
}
