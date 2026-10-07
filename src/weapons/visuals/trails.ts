// Iz zarralari: bitta Points, halqa-bufer (pool). Premultiplied alpha: add=1 -> additive (olov), add=0 -> oddiy (tutun).
import * as THREE from 'three';
import { vis, type TrailLayer } from './config';

const VERT = `
attribute vec4 aColor; attribute float aSize; uniform float uScale; uniform float uMaxPx; varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vColor = aColor;
  gl_PointSize = min(aSize * uScale / max(-mv.z, 0.1), uMaxPx);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float f = clamp(1.0 - d, 0.0, 1.0);
  f = f * f * (3.0 - 2.0 * f);
  gl_FragColor = vColor * f;
}`;

export class TrailPool {
  readonly points: THREE.Points;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly layer: Array<TrailLayer | null>;
  private readonly aPos: THREE.BufferAttribute;
  private readonly aCol: THREE.BufferAttribute;
  private readonly aSize: THREE.BufferAttribute;
  private readonly uniforms = { uScale: { value: 800 }, uMaxPx: { value: vis.viewMax.trailMaxPoint } };
  private cursor = 0;
  private alive = 0;
  private dirty = false;

  constructor(max: number = vis.viewMax.trailParticles) {
    this.n = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.layer = new Array<TrailLayer | null>(max).fill(null);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aColor', this.aCol);
    g.setAttribute('aSize', this.aSize);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.onBeforeRender = (renderer, _scene, camera): void => {
      const target = renderer.getRenderTarget();
      const h = target ? target.height : renderer.getDrawingBufferSize(sizeTmp).y;
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 60;
      this.uniforms.uScale.value = h / (2 * Math.tan((fov * Math.PI) / 360));
    };
  }

  get capacity(): number {
    return this.n;
  }

  /** Hozir tirik zarralar soni. */
  get live(): number {
    return this.alive;
  }

  emit(l: TrailLayer, x: number, y: number, z: number): void {
    const i = this.cursor;
    this.cursor = (i + 1) % this.n;
    if (this.life[i] <= 0) this.alive++;
    const j = l.jitter;
    this.pos[i * 3] = x + (Math.random() - 0.5) * j;
    this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * j;
    this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * j;
    this.age[i] = 0;
    this.life[i] = l.life * (0.85 + Math.random() * 0.3);
    this.layer[i] = l;
    this.dirty = true;
  }

  update(dt: number): void {
    if (this.alive === 0 && !this.dirty) return;
    for (let i = 0; i < this.n; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      const l = this.layer[i]!;
      const a = (this.age[i] += dt);
      if (a >= life) {
        this.life[i] = 0;
        this.alive--;
        this.col.fill(0, i * 4, i * 4 + 4);
        this.size[i] = 0;
        continue;
      }
      const t = a / life;
      this.pos[i * 3 + 1] += l.drift * dt;
      this.size[i] = l.size[0] + (l.size[1] - l.size[0]) * t;
      const f = l.from;
      const o = l.to;
      const alpha = f[3] + (o[3] - f[3]) * t;
      const k = i * 4;
      this.col[k] = (f[0] + (o[0] - f[0]) * t) * alpha;
      this.col[k + 1] = (f[1] + (o[1] - f[1]) * t) * alpha;
      this.col[k + 2] = (f[2] + (o[2] - f[2]) * t) * alpha;
      this.col[k + 3] = alpha * (1 - l.add);
    }
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = true;
    this.dirty = false;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

const sizeTmp = new THREE.Vector2();
