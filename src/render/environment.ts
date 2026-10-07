import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import cfgJson from '../../data/render.json';
import { makeSkyDome, makeSkyMaterial } from './sky';
import { upgradeMaterials } from './materials';

export { makeGroundMaterial, upgradeMaterials } from './materials';

const cfg = cfgJson.environment;

export interface EnvironmentOptions {
  /** Lambert -> Standard avtomatik yangilash (yangi obyektlar uchun ham). Default: true */
  autoUpgrade?: boolean;
  /** Soya kamerasi kuzatadigan obyekt (keyin follow() bilan o'zgartirish mumkin) */
  follow?: THREE.Object3D | null;
}

/** Quyosh soyasi markazini yorug'lik-fazosi texel to'rtiga yaxlitlaydi (soya titrashini oldini oladi). */
export function snapToTexelGrid(
  focus: THREE.Vector3, dir: THREE.Vector3, texel: number, out: THREE.Vector3,
): THREE.Vector3 {
  const r = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
  const u = new THREE.Vector3().crossVectors(dir, r);
  const fr = Math.round(focus.dot(r) / texel) * texel;
  const fu = Math.round(focus.dot(u) / texel) * texel;
  return out.set(0, 0, 0).addScaledVector(r, fr).addScaledVector(u, fu).addScaledVector(dir, focus.dot(dir));
}

/** Osmon, quyosh (soyali), hemisphere, tuman, PBR environment map. */
export class Environment implements System {
  readonly name = 'environment';
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private target: THREE.Object3D | null;
  private readonly dir = new THREE.Vector3(...(cfg.sunDirection as [number, number, number])).normalize();
  private readonly dome: THREE.Mesh;
  private readonly envTex: THREE.Texture;
  private readonly tmp = new THREE.Vector3();
  private frames = 0;

  constructor(private readonly world: GameWorld, private readonly opts: EnvironmentOptions = {}) {
    const { scene, renderer } = world;
    this.target = opts.follow ?? null;
    const skyMat = makeSkyMaterial(this.dir);
    this.dome = makeSkyDome(skyMat);
    scene.add(this.dome);
    scene.background = new THREE.Color(cfg.fog.color);
    scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);

    this.hemi = new THREE.HemisphereLight(cfg.hemi.sky, cfg.hemi.ground, cfg.hemi.intensity);
    scene.add(this.hemi);

    const sh = cfg.shadow;
    this.sun = new THREE.DirectionalLight(cfg.sunColor, cfg.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(cfgJson.modern.shadowMapSize);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -sh.half;
    cam.right = cam.top = sh.half;
    cam.near = sh.near;
    cam.far = sh.far;
    this.sun.shadow.bias = sh.bias;
    this.sun.shadow.normalBias = sh.normalBias;
    scene.add(this.sun, this.sun.target);

    // PBR aks etish uchun osmondan environment map
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), skyMat));
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTex = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    scene.environment = this.envTex;
    scene.environmentIntensity = cfg.envIntensity;

    this.placeSun();
    if (opts.autoUpgrade !== false) upgradeMaterials(scene);
  }

  follow(object: THREE.Object3D | null): void {
    this.target = object;
  }

  private placeSun(): void {
    const sh = cfg.shadow;
    const focus = this.target ? this.target.position : this.tmp.set(0, 0, 0);
    const texel = (2 * sh.half) / this.sun.shadow.mapSize.x;
    const snapped = snapToTexelGrid(focus, this.dir, texel, new THREE.Vector3());
    this.sun.target.position.copy(snapped);
    this.sun.position.copy(snapped).addScaledVector(this.dir, sh.distance);
    this.sun.target.updateMatrixWorld();
  }

  update(): void {
    this.placeSun();
    if (this.opts.autoUpgrade !== false && this.frames++ % cfg.rescanFrames === 0) upgradeMaterials(this.world.scene);
  }

  dispose(): void {
    const s = this.world.scene;
    s.remove(this.dome, this.hemi, this.sun, this.sun.target);
    this.dome.geometry.dispose();
    this.envTex.dispose();
    this.sun.shadow.dispose();
  }
}

export function installEnvironment(world: GameWorld, opts?: EnvironmentOptions): Environment {
  const env = new Environment(world, opts);
  world.addSystem(env);
  return env;
}
