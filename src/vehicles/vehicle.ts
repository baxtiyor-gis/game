import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { handling } from '../core/data';
import { CG } from '../core/types';
import type { Controller, GameWorld, InputState, Inventory, System, VehicleDef, VehicleHandle } from '../core/types';
import { createVehicleModel, poseWheel } from './model';
import type { VehicleModel } from './model';
import { applyAirControl, bodyAxes, limitYawRate, SelfRighter } from './motion';
import { tuningFor } from './tuning';
import type { Tuning } from './tuning';

const WHEELS = 4;
const ALL_GROUPS = 0xffff;
const NEUTRAL: InputState = {
  throttle: 0, steer: 0, handbrake: false, fireMG: false, fireWeapon: false, fireSpecial: false,
  cycleWeapon: 0, rearView: false, combo: null,
};

let nextId = 0;

class Vehicle implements VehicleHandle, System {
  readonly name: string;
  readonly id: string;
  readonly maxHp: number;
  hp: number;
  alive = true;
  input: InputState = NEUTRAL;
  inventory: Inventory = { slots: [], selected: 0, specialAmmo: 0 };
  stalled = 0;

  private readonly tuning: Tuning;
  private readonly model: VehicleModel;
  private readonly rc: RAPIER.DynamicRayCastVehicleController;
  private readonly righter = new SelfRighter();
  private readonly prevPos = new THREE.Vector3();
  private readonly prevQuat = new THREE.Quaternion();
  private readonly curPos = new THREE.Vector3();
  private readonly curQuat = new THREE.Quaternion();
  private steer = 0;
  private readonly wheelbase: number;
  private grounded = 0;

  constructor(
    private readonly world: GameWorld,
    readonly def: VehicleDef,
    public controller: Controller,
    readonly body: RAPIER.RigidBody,
    private readonly collider: RAPIER.Collider,
  ) {
    this.id = `${def.id}#${nextId++}`;
    this.name = `vehicle:${this.id}`;
    this.tuning = tuningFor(def);
    this.maxHp = this.hp = this.tuning.maxHp;
    this.model = createVehicleModel(def);
    this.model.root.userData.damageStage = 0;
    this.rc = world.physics.createVehicleController(body);
    this.rc.indexUpAxis = 1;
    this.rc.setIndexForwardAxis = 2;
    this.wheelbase = 2 * Math.abs(this.model.wheels[0].spec.z);
    this.setupWheels();
    this.sync(this.prevPos, this.prevQuat);
  }

  get object(): THREE.Object3D {
    return this.model.root;
  }

  speed(): number {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.y, v.z);
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(bodyAxes(this.body).fwd);
  }

  position(out: THREE.Vector3): THREE.Vector3 {
    const p = this.body.translation();
    return out.set(p.x, p.y, p.z);
  }

  private setupWheels(): void {
    const w = handling.wheels;
    const maxForce = this.def.mass * w.maxForcePerKg;
    for (const s of this.model.wheels.map((m) => m.spec)) {
      this.rc.addWheel({ x: s.x, y: s.y, z: s.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, s.restLength, s.radius);
    }
    for (let i = 0; i < WHEELS; i++) {
      this.rc.setWheelMaxSuspensionTravel(i, this.model.wheels[i].spec.maxTravel);
      this.rc.setWheelSuspensionStiffness(i, w.stiffness);
      this.rc.setWheelSuspensionCompression(i, w.compression);
      this.rc.setWheelSuspensionRelaxation(i, w.relaxation);
      this.rc.setWheelMaxSuspensionForce(i, maxForce);
      this.rc.setWheelFrictionSlip(i, w.frictionSlip);
      this.rc.setWheelSideFrictionStiffness(i, w.sideFriction);
    }
  }

  private sync(pos: THREE.Vector3, quat: THREE.Quaternion): void {
    const p = this.body.translation();
    const r = this.body.rotation();
    pos.set(p.x, p.y, p.z);
    quat.set(r.x, r.y, r.z, r.w);
  }

  fixedUpdate(dt: number): void {
    this.sync(this.prevPos, this.prevQuat);
    const sampled = this.controller.sample(dt);
    this.input = this.alive ? sampled : NEUTRAL;
    if (this.stalled > 0) this.stalled = Math.max(0, this.stalled - dt);
    const driving = this.alive && this.stalled <= 0;
    const fv = this.forwardSpeed();
    this.drive(driving ? this.input : NEUTRAL, fv, dt);
    this.rc.updateVehicle(dt, undefined, (CG.VEHICLE << 16) | CG.WORLD, (c) => c.handle !== this.collider.handle);
    this.grounded = 0;
    for (let i = 0; i < WHEELS; i++) if (this.rc.wheelIsInContact(i)) this.grounded++;
    if (this.alive) this.assist(dt, fv);
    else this.body.setLinearDamping(handling.damage.wreckLinearDamping);
  }

  private forwardSpeed(): number {
    const v = this.body.linvel();
    return bodyAxes(this.body).fwd.dot(new THREE.Vector3(v.x, v.y, v.z));
  }

  private drive(inp: InputState, fv: number, dt: number): void {
    const d = handling.drive;
    const t = this.tuning;
    const perWheel = this.def.mass / WHEELS;
    let engine = 0;
    let brake = d.idleBrake;
    if (inp.throttle > 0) {
      if (fv < -d.reverseThreshold) brake = inp.throttle * d.brakeAccel;
      else (engine = inp.throttle * t.engineAccel * this.taper(fv / t.maxSpeed)), (brake = 0);
    } else if (inp.throttle < 0) {
      if (fv > d.reverseThreshold) brake = -inp.throttle * d.brakeAccel;
      else (engine = inp.throttle * t.engineAccel * this.taper(-fv / (t.maxSpeed * d.reverseSpeedFactor))), (brake = 0);
    }
    const drift = inp.handbrake;
    // Rul burchagi yon tezlanish chegarasi (a = v^2 * tan(d) / baza) bilan cheklanadi: tezlikda kamayadi.
    const limit = (this.wheelbase * handling.steer.lateralAccel) / Math.max(1, fv * fv);
    const angle = Math.min(t.steerMax, Math.max(t.steerMax * handling.steer.minFactor, limit));
    const target = -inp.steer * angle * (drift ? handling.steer.handbrakeBoost : 1);
    const maxStep = t.steerRate * dt;
    this.steer += Math.max(-maxStep, Math.min(maxStep, target - this.steer));
    const w = handling.wheels;
    for (let i = 0; i < WHEELS; i++) {
      const front = this.model.wheels[i].spec.front;
      const rearDrift = drift && !front;
      this.rc.setWheelSteering(i, front ? this.steer : 0);
      this.rc.setWheelEngineForce(i, rearDrift ? 0 : engine * perWheel * (WHEELS / (drift ? 2 : WHEELS)));
      this.rc.setWheelBrake(i, (rearDrift ? handling.drift.handbrakeBrakeAccel : brake) * perWheel);
      this.rc.setWheelFrictionSlip(i, w.frictionSlip * (rearDrift ? handling.drift.rearFrictionFactor : 1));
      this.rc.setWheelSideFrictionStiffness(i, w.sideFriction * (rearDrift ? handling.drift.rearSideFactor : 1));
    }
  }

  /** Maks. tezlikka yaqinlashganda dvigatel kuchi silliq nolga tushadi. */
  private taper(ratio: number): number {
    return Math.max(0, 1 - Math.pow(Math.max(0, ratio), handling.drive.falloffPower));
  }

  private assist(dt: number, fv: number): void {
    const c = handling.chassis;
    if (this.grounded === 0) {
      applyAirControl(this.body, this.input, dt);
      this.body.setAngularDamping(handling.air.angularDamping);
    } else {
      const down = c.downforce * fv * fv * this.def.mass * dt;
      this.body.applyImpulse({ x: 0, y: -down, z: 0 }, true);
      this.body.setAngularDamping(c.angularDamping);
      limitYawRate(this.body, c.maxYawRate);
    }
    this.righter.update(this.body, dt);
  }

  update(_dt: number, alpha: number): void {
    this.sync(this.curPos, this.curQuat);
    const o = this.model.root;
    o.position.lerpVectors(this.prevPos, this.curPos, alpha);
    o.quaternion.slerpQuaternions(this.prevQuat, this.curQuat, alpha);
    for (let i = 0; i < WHEELS; i++) {
      const wv = this.model.wheels[i];
      const len = this.rc.wheelSuspensionLength(i) ?? wv.spec.restLength;
      poseWheel(wv, wv.spec.front ? this.steer : 0, this.rc.wheelRotation(i) ?? 0, len);
    }
  }

  dispose(): void {
    const i = this.world.vehicles.indexOf(this);
    if (i >= 0) this.world.vehicles.splice(i, 1);
    this.world.scene.remove(this.model.root);
    this.world.physics.removeVehicleController(this.rc);
    this.world.physics.removeRigidBody(this.body);
  }
}

/** Mashinani yaratadi, world.vehicles ga qo'shadi va o'z tizimini ro'yxatdan o'tkazadi. */
export function spawnVehicle(
  world: GameWorld,
  def: VehicleDef,
  controller: Controller,
  pos: { x: number; y: number; z: number },
  yaw: number,
): VehicleHandle {
  const { rapier, physics } = world;
  const c = handling.chassis;
  const [w, h, l] = def.size;
  const m = def.mass;
  const half = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const bodyDesc = rapier.RigidBodyDesc.dynamic()
    .setTranslation(pos.x, pos.y, pos.z)
    .setRotation({ x: half.x, y: half.y, z: half.z, w: half.w })
    .setLinearDamping(c.linearDamping)
    .setAngularDamping(c.angularDamping)
    .setCanSleep(false)
    .setCcdEnabled(true);
  const body = physics.createRigidBody(bodyDesc);
  const inertia = {
    x: (m / 12) * (h * h + l * l) * c.pitchInertia,
    y: (m / 12) * (w * w + l * l) * c.yawInertia,
    z: (m / 12) * (w * w + h * h) * c.rollInertia,
  };
  const colDesc = rapier.ColliderDesc.cuboid(w / 2, h / 2, l / 2)
    .setMassProperties(m, { x: 0, y: -c.comDrop * h, z: 0 }, inertia, { x: 0, y: 0, z: 0, w: 1 })
    .setFriction(c.friction)
    .setRestitution(c.restitution)
    .setCollisionGroups((CG.VEHICLE << 16) | ALL_GROUPS);
  const collider = physics.createCollider(colDesc, body);
  const v = new Vehicle(world, def, controller, body, collider);
  world.vehicles.push(v);
  world.scene.add(v.object);
  world.addSystem(v);
  return v;
}
