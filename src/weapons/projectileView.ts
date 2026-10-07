import * as THREE from 'three';
import type { WeaponId } from '../core/types';
import { tuning } from './params';

const Z = new THREE.Vector3(0, 0, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const col = new THREE.Color();

/** Snaryadlar uchun bitta InstancedMesh (low-poly box). */
export class ProjectileView {
  private readonly mesh: THREE.InstancedMesh;
  private n = 0;

  constructor(scene: THREE.Scene, private readonly max: number) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ flatShading: true, emissive: '#553311' }),
      max,
    );
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, col.set('#ffffff'));
    scene.add(this.mesh);
  }

  begin(): void {
    this.n = 0;
  }

  /** dir = null bo'lsa burilmaydi (yerdagi mina). */
  add(weapon: WeaponId, pos: THREE.Vector3, dir: THREE.Vector3 | null): void {
    if (this.n >= this.max) return;
    const v = tuning.visual[weapon];
    if (dir) q.setFromUnitVectors(Z, dir);
    else q.identity();
    m.compose(pos, q, s.set(v.size[0], v.size[1], v.size[2]));
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, col.set(v.color));
    this.n++;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
