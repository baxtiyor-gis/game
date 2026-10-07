import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S = new THREE.Vector3(1, 1, 1);
const P = new THREE.Vector3();

/** Qismlarni bitta vertex-rangli geometriyaga yig'adi (HDR: rang > 1 bo'lishi mumkin). */
export class GeoBuilder {
  private readonly parts: THREE.BufferGeometry[] = [];

  /** geo ni pos/rot (radian, XYZ) bilan joylab, rangga bo'yab qo'shadi. */
  add(geo: THREE.BufferGeometry, color: string, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0], intensity = 1): this {
    Q.setFromEuler(E.set(rot[0], rot[1], rot[2]));
    geo.applyMatrix4(M.compose(P.set(pos[0], pos[1], pos[2]), Q, S));
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    const c = new THREE.Color(color).multiplyScalar(intensity);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
    return this;
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  build(): THREE.BufferGeometry {
    const out = mergeGeometries(this.parts);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    if (!out) throw new Error('GeoBuilder: geometriyalar mos emas');
    return out;
  }
}

/** Z o'qi bo'ylab (+Z = tepa) silindr. */
export const cylZ = (rTop: number, rBot: number, len: number, seg = 14): THREE.CylinderGeometry =>
  new THREE.CylinderGeometry(rTop, rBot, len, seg).rotateX(Math.PI / 2);

/** Z o'qi bo'ylab konus (uchi +Z da). */
export const coneZ = (r: number, len: number, seg = 14): THREE.ConeGeometry => new THREE.ConeGeometry(r, len, seg).rotateX(Math.PI / 2);

/** Uchi -Z ga qaragan konus (alanga). */
export const coneBackZ = (r: number, len: number, seg = 12): THREE.ConeGeometry => new THREE.ConeGeometry(r, len, seg).rotateX(-Math.PI / 2);
