import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { handling } from '../core/data';
import type { InputState } from '../core/types';

const q = new THREE.Quaternion();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const fwd = new THREE.Vector3();
const spin = new THREE.Vector3();

export function readQuat(body: RAPIER.RigidBody, out: THREE.Quaternion): THREE.Quaternion {
  const r = body.rotation();
  return out.set(r.x, r.y, r.z, r.w);
}

/** Chassis lokal o'qlarini dunyo koordinatalarida beradi. */
export function bodyAxes(body: RAPIER.RigidBody): { right: THREE.Vector3; up: THREE.Vector3; fwd: THREE.Vector3 } {
  readQuat(body, q);
  right.set(1, 0, 0).applyQuaternion(q);
  up.set(0, 1, 0).applyQuaternion(q);
  fwd.set(0, 0, 1).applyQuaternion(q);
  return { right, up, fwd };
}

/** Havoda: gaz = burun pastga, tormoz = burun yuqoriga, rul = yaw; roll sekin tekislanadi. */
export function applyAirControl(body: RAPIER.RigidBody, input: InputState, dt: number): void {
  const a = handling.air;
  const { right: r, up: u, fwd: f } = bodyAxes(body);
  const av = body.angvel();
  spin.set(av.x, av.y, av.z);
  spin.addScaledVector(r, input.throttle * a.pitchAccel * dt);
  spin.addScaledVector(u, -input.steer * a.yawAccel * dt);
  spin.addScaledVector(f, -r.y * a.levelAccel * dt); // r.y > 0: o'ng tomon yuqori -> teskari aylantir
  body.setAngvel({ x: spin.x, y: spin.y, z: spin.z }, true);
}

/** Ag'darilib qolganda ~time soniyadan keyin yaw saqlangan holda g'ildirakka qo'yadi. */
export class SelfRighter {
  private timer = 0;

  update(body: RAPIER.RigidBody, dt: number): void {
    const s = handling.selfRight;
    const { up: u, fwd: f } = bodyAxes(body);
    const v = body.linvel();
    const slow = Math.hypot(v.x, v.y, v.z) < s.maxSpeed;
    if (u.y >= s.uprightThreshold || !slow) {
      this.timer = 0;
      return;
    }
    this.timer += dt;
    if (this.timer < s.time) return;
    this.timer = 0;
    const yaw = Math.atan2(f.x, f.z);
    const upright = q.setFromAxisAngle(up.set(0, 1, 0), yaw);
    const p = body.translation();
    body.setRotation({ x: upright.x, y: upright.y, z: upright.z, w: upright.w }, true);
    body.setTranslation({ x: p.x, y: p.y + s.lift, z: p.z }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setLinvel({ x: v.x * 0.5, y: 0, z: v.z * 0.5 }, true);
  }
}
