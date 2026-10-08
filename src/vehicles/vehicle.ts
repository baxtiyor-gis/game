import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { handling } from '../core/data';
import { CG } from '../core/types';
import type { Controller, GameWorld, InputState, Inventory, System, VehicleDef, VehicleHandle, VehicleStatus } from '../core/types';
import { createVehicleModel, poseWheel } from './model';
import type { VehicleModel } from './model';
import { applyAirControl, bodyAxes, SelfRighter } from './motion';
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
  status: VehicleStatus = { blind: 0, smoke: 0, armorMul: 1 };
  surfaceGrip = 1;

  private readonly tuning: Tuning;
  private readonly model: VehicleModel;
  private readonly rc: RAPIER.DynamicRayCastVehicleController;
  private readonly righter = new SelfRighter();
  private readonly prevPos = new THREE.Vector3();
  private readonly prevQuat = new THREE.Quaternion();
  private readonly curPos = new THREE.Vector3();
  private readonly curQuat = new THREE.Quaternion();
  private steer = 0;
  private grounded = 0;
  private readonly gravity: number;

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
    this.gravity = -world.physics.gravity.y;
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
    this.resist(dt);
    if (this.alive) this.assist(dt);
    else this.body.setLinearDamping(handling.damage.wreckLinearDamping);
  }

  private forwardSpeed(): number {
    const v = this.body.linvel();
    return bodyAxes(this.body).fwd.dot(new THREE.Vector3(v.x, v.y, v.z));
  }

  private drive(inp: InputState, fv: number, dt: number): void {
    const pt = handling.powertrain;
    const br = handling.brakes;
    const t = this.tuning;
    const weight = this.def.mass * this.gravity;
    let engine = 0; // N, + = oldinga
    let brake = 0; // N, umumiy
    if (inp.throttle > 0) {
      if (fv < -pt.reverseThreshold) brake = inp.throttle * br.weightFactor * weight;
      else engine = inp.throttle * this.tractiveForce(fv);
    } else if (inp.throttle < 0) {
      if (fv > pt.reverseThreshold) brake = -inp.throttle * br.weightFactor * weight;
      else engine = inp.throttle * pt.reverseFactor * this.tractiveForce(-fv) * Math.max(0, 1 - -fv / pt.reverseMaxSpeed);
    } else if (Math.abs(fv) < br.parkSpeed) brake = br.parkWeightFactor * weight;
    const drift = inp.handbrake;
    // Tezlikka sezgir rul: v kattalashganda burchak kamayadi (haqiqiy mashinalardagi kabi).
    const ratio = fv / handling.steer.speedScale;
    const target = (-inp.steer * t.steerMax) / (1 + ratio * ratio);
    const maxStep = t.steerRate * dt;
    this.steer += Math.max(-maxStep, Math.min(maxStep, target - this.steer));
    const driven = drift ? 2 : WHEELS; // handbrake: orqa g'ildiraklar qulflanadi, dvigatel faqat oldinga
    for (let i = 0; i < WHEELS; i++) {
      const front = this.model.wheels[i].spec.front;
      const rearLock = drift && !front;
      this.rc.setWheelSteering(i, front ? this.steer : 0);
      this.rc.setWheelEngineForce(i, rearLock ? 0 : engine / driven);
      this.rc.setWheelFrictionSlip(i, handling.wheels.frictionSlip * this.surfaceGrip * (rearLock ? br.handbrakeRearGrip : 1));
      this.rc.setWheelBrake(i, (rearLock ? (br.handbrakeWeightFactor * weight) / 2 : brake / WHEELS) * dt); // Rapier: tormoz = impuls (N*s)
    }
  }

  /** Tortish kuchi: P = F*v chegarasi (v >= launchSpeed da F = P/v), pastda launchForce. */
  private tractiveForce(speed: number): number {
    return this.tuning.wheelPower / Math.max(speed, handling.powertrain.launchSpeed);
  }

  /** Havo qarshiligi 0.5*rho*CdA*v^2 va g'ildirak (dumalash) qarshiligi Crr*m*g. */
  private resist(dt: number): void {
    const pt = handling.powertrain;
    const lv = this.body.linvel();
    const speed = Math.hypot(lv.x, lv.y, lv.z);
    if (speed < 1e-3) return;
    const drag = 0.5 * pt.airDensity * this.tuning.dragArea * speed * speed;
    const rolling = pt.rollingResistance * this.def.mass * this.gravity * (this.grounded / WHEELS);
    const impulse = Math.min((drag + rolling) * dt, this.def.mass * speed);
    const k = -impulse / speed;
    this.body.applyImpulse({ x: lv.x * k, y: lv.y * k, z: lv.z * k }, true);
  }

  private assist(dt: number): void {
    if (this.grounded === 0) {
      applyAirControl(this.body, this.input, dt);
      this.body.setAngularDamping(handling.air.angularDamping);
    } else {
      this.body.setAngularDamping(handling.chassis.angularDamping);
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
    .setAngularDamping(c.angularDamping)
    .setCanSleep(false)
    .setCcdEnabled(true);
  const body = physics.createRigidBody(bodyDesc);
  const inertia = {
    x: (m / 12) * (h * h + l * l) * c.inertiaScale,
    y: (m / 12) * (w * w + l * l) * c.inertiaScale,
    z: (m / 12) * (w * w + h * h) * c.inertiaScale,
  };
  const colDesc = rapier.ColliderDesc.cuboid(w / 2, h / 2, l / 2)
    .setMassProperties(m, { x: 0, y: -c.comDrop * h, z: 0 }, inertia, { x: 0, y: 0, z: 0, w: 1 })
    .setFriction(c.friction)
    .setRestitution(c.restitution)
    .setCollisionGroups((CG.VEHICLE << 16) | ALL_GROUPS)
    .setActiveEvents(rapier.ActiveEvents.CONTACT_FORCE_EVENTS)
    .setContactForceEventThreshold(m * handling.collision.forceThresholdAccel);
  const collider = physics.createCollider(colDesc, body);
  const v = new Vehicle(world, def, controller, body, collider);
  world.vehicles.push(v);
  world.scene.add(v.object);
  world.addSystem(v);
  return v;
}
