// Maxsus qurol vizuallari uchun geometriya/material yordamchilari (emissive, bloom ushlaydi).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const Y = new THREE.Vector3(0, 1, 0);
const mat4 = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const mid = new THREE.Vector3();
const dir = new THREE.Vector3();

/** Yorqin (HDR, toneMapped=false) material: additive yoki oddiy aralashuv. */
export function glowMat(color: string, hdr: number, opacity = 1, additive = true): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(hdr), transparent: true, opacity, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: !additive,
  });
}

export const glowMesh = (geo: THREE.BufferGeometry, color: string, hdr: number, opacity = 1): THREE.Mesh =>
  new THREE.Mesh(geo, glowMat(color, hdr, opacity));

/** Nuqtalar bo'ylab ingichka naycha (zigzag nur, to'r chiziqlari): bitta birlashgan geometriya. */
export function tubeGeometry(points: THREE.Vector3[], radius: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    if (len < 1e-4) continue;
    const g = new THREE.CylinderGeometry(radius, radius, len, 5, 1, true);
    mid.copy(a).add(b).multiplyScalar(0.5);
    quat.setFromUnitVectors(Y, dir.copy(b).sub(a).normalize());
    g.applyMatrix4(mat4.compose(mid, quat, one));
    parts.push(g);
  }
  const out = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return out ?? new THREE.BufferGeometry();
}

/** a -> b chaqmoq zigzagi: o'rtada eng katta chetlanish. */
export function boltPoints(a: THREE.Vector3, b: THREE.Vector3, segments: number, jitter: number): THREE.Vector3[] {
  const d = b.clone().sub(a);
  const side = new THREE.Vector3().crossVectors(d, Y);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const up = new THREE.Vector3().crossVectors(side, d).normalize();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const env = Math.sin(Math.PI * t) * jitter;
    const p = a.clone().lerp(b, t);
    if (i > 0 && i < segments) p.addScaledVector(side, (Math.random() - 0.5) * 2 * env).addScaledVector(up, (Math.random() - 0.5) * 2 * env);
    pts.push(p);
  }
  return pts;
}

/** Birlik uzunlikdagi yelpig'ich to'r: +Z bo'ylab; nurlar + yoy chiziqlar + tugun chaqnashlari (XZ tekisligida). */
export function fanGeometry(halfAngle: number, rays: number, arcs: number, line: number, node: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const at = (r: number, a: number) => new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
  const angle = (i: number) => (rays === 1 ? 0 : -halfAngle + (2 * halfAngle * i) / (rays - 1));
  for (let i = 0; i < rays; i++) parts.push(tubeGeometry([at(0, 0), at(1, angle(i))], line));
  for (let j = 1; j <= arcs; j++) {
    const r = j / arcs;
    const pts = Array.from({ length: 13 }, (_, s) => at(r, -halfAngle + (2 * halfAngle * s) / 12));
    parts.push(tubeGeometry(pts, line));
    for (let i = 0; i < rays; i++) parts.push(new THREE.OctahedronGeometry(node, 0).translate(...at(r, angle(i)).toArray()));
  }
  const out = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  for (const p of parts) p.dispose();
  return out ?? new THREE.BufferGeometry();
}

/** Yerga yotqizilgan halqa (zilzila to'lqini, belgi): tashqi radius = 1. */
export const flatRing = (inner: number): THREE.BufferGeometry => new THREE.RingGeometry(inner, 1, 64).rotateX(-Math.PI / 2);

/** XZ tekisligidagi yo'nalishning Y o'qi atrofidagi burchagi (+Z = 0). */
export const yawOf = (d: THREE.Vector3): number => Math.atan2(d.x, d.z);
