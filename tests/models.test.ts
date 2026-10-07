import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { vehicles } from '../src/core/data';
import { createVehicleModel, poseWheel } from '../src/vehicles/model';

const TOL = 0.15;
const TRI_MIN = 1500;
const TRI_MIN_UFO = 800; // g'ildiraksiz, oddiy shakl
const TRI_MAX = 4000;

function triangles(o: THREE.Object3D): number {
  let n = 0;
  o.traverse((c) => {
    const g = (c as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g) n += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
  return n;
}

/** Faqat kuzov (g'ildiraklarsiz) o'lchami. */
function bodySize(root: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3();
  for (const c of root.children) if (c instanceof THREE.Mesh) box.expandByObject(c);
  return box.getSize(new THREE.Vector3());
}

describe('mashina modellari', () => {
  for (const def of vehicles) {
    it(`${def.id}: uchburchaklar soni, o'lchami, soyalar`, () => {
      const m = createVehicleModel(def);
      const tris = triangles(m.root);
      expect(tris).toBeGreaterThanOrEqual(def.id === 'ufo' ? TRI_MIN_UFO : TRI_MIN);
      expect(tris).toBeLessThanOrEqual(TRI_MAX);
      const s = bodySize(m.root);
      def.size.forEach((want, i) => {
        const got = [s.x, s.y, s.z][i]!;
        expect(Math.abs(got - want) / want, `${def.id} o'lcham[${i}] ${got.toFixed(2)} vs ${want}`).toBeLessThanOrEqual(TOL);
      });
      m.root.traverse((c) => {
        if (c instanceof THREE.Mesh) expect(c.castShadow).toBe(true);
      });
      expect(m.wheels).toHaveLength(4);
    });
  }

  it('geometriya turi bo\'yicha keshlanadi, materiallar nusxa bo\'yicha alohida', () => {
    const a = createVehicleModel(vehicles[0]!);
    const b = createVehicleModel(vehicles[0]!);
    const ga = a.root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    const gb = b.root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(ga.geometry).toBe(gb.geometry);
    expect(ga.material).not.toBe(gb.material);
  });

  it('g\'ildirak API: rul, aylanish, osma', () => {
    const m = createVehicleModel(vehicles[0]!);
    const w = m.wheels[0]!;
    poseWheel(w, 0.3, 1.2, 0.25);
    expect(w.pivot.rotation.y).toBeCloseTo(0.3);
    expect(w.spin.rotation.x).toBeCloseTo(1.2);
    expect(w.pivot.position.y).toBeCloseTo(w.spec.y - 0.25);
  });

  it('faralar emissive va bloom uchun toneMapped=false', () => {
    const m = createVehicleModel(vehicles[0]!);
    let lamps = 0;
    m.root.traverse((c) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && mat.emissiveIntensity > 1 && !mat.toneMapped) lamps++;
    });
    expect(lamps).toBeGreaterThan(1);
  });
});
