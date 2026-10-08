import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import type { BuildContext } from './context';
import { ski } from './props/skiKit';

const F = ski.snowfall;

const VERT = `
uniform float uSize;
uniform float uScale;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(uSize * uScale / max(-mv.z, 0.5), 1.0, ${F.maxPx.toFixed(1)});
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d) * uOpacity;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uColor, a);
}`;

/**
 * Yengil qor yog'ishi: ≤ `count` zarra (bitta Points), kamera atrofidagi quti ichida; pastga tushadi, shamolda og'adi,
 * quti chegarasidan chiqsa qarama-qarshi tomondan qaytadi (CPU da bitta sodda sikl, GC yo'q).
 */
export class SnowfallSystem implements System {
  readonly name = 'snowfall';
  readonly points: THREE.Points;
  readonly count: number;
  private readonly pos: Float32Array;
  private readonly speed: Float32Array;
  private readonly phase: Float32Array;
  private readonly mat: THREE.ShaderMaterial;
  private readonly size = new THREE.Vector2();
  private t = 0;

  constructor(private readonly world: GameWorld, parent: THREE.Object3D) {
    this.count = Math.min(F.count, F.maxCount);
    this.pos = new Float32Array(this.count * 3);
    this.speed = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);
    let seed = F.seed;
    const rnd = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 3] = (rnd() - 0.5) * F.box[0];
      this.pos[i * 3 + 1] = (rnd() - 0.5) * F.box[1];
      this.pos[i * 3 + 2] = (rnd() - 0.5) * F.box[2];
      this.speed[i] = F.fall * (0.6 + rnd() * 0.8);
      this.phase[i] = rnd() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uSize: { value: F.size }, uScale: { value: F.pxScale }, uColor: { value: new THREE.Color(F.color) }, uOpacity: { value: F.opacity } },
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.name = 'snowfall';
    parent.add(this.points);
  }

  update(dt: number): void {
    const cam = this.world.camera;
    this.points.position.copy(cam.position);
    // Nuqta o'lchami: piksel balandligi / (2 tan(fov/2)); renderer bo'lmasa (test) standart
    const r = this.world.renderer as Partial<THREE.WebGLRenderer>;
    if (typeof r.getDrawingBufferSize === 'function') {
      this.mat.uniforms.uScale!.value = r.getDrawingBufferSize(this.size).y / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    }
    this.t += dt;
    const [bx, by, bz] = F.box as [number, number, number];
    const p = this.pos;
    const wind = F.wind;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      p[k]! += (wind + Math.sin(this.t * F.sway + this.phase[i]!) * F.swayAmp) * dt;
      p[k + 1]! -= this.speed[i]! * dt;
      if (p[k]! > bx / 2) p[k]! -= bx;
      else if (p[k]! < -bx / 2) p[k]! += bx;
      if (p[k + 1]! < -by / 2) p[k + 1]! += by;
      if (p[k + 2]! > bz / 2) p[k + 2]! -= bz;
      else if (p[k + 2]! < -bz / 2) p[k + 2]! += bz;
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

export const createSnowfall = (ctx: BuildContext): SnowfallSystem | null => (ctx.def.snowfall ? new SnowfallSystem(ctx.world, ctx.root) : null);
