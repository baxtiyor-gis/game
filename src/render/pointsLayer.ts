import * as THREE from 'three';
import { ParticlePool } from './particlePool';

const VERT = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
uniform float uViewH;
varying vec4 vColor;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, aSize * projectionMatrix[1][1] * uViewH * 0.5 / max(gl_Position.w, 0.01));
  vColor = aColor;
}`;

const FRAG = /* glsl */ `
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  if (dot(d, d) > 0.25) discard;
  gl_FragColor = vColor;
}`;

/** ParticlePool ni bitta Points obyekti (billboard) sifatida chizadi. */
export class PointsLayer {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly size: Float32Array;
  private readonly col: Float32Array;
  private readonly attrs: THREE.BufferAttribute[];
  private readonly geo = new THREE.BufferGeometry();
  private readonly mat: THREE.ShaderMaterial;

  constructor(readonly pool: ParticlePool, additive: boolean) {
    const n = pool.capacity;
    this.pos = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.col = new Float32Array(n * 4);
    const mk = (a: Float32Array, k: number) => new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage);
    this.attrs = [mk(this.pos, 3), mk(this.size, 1), mk(this.col, 4)];
    this.geo.setAttribute('position', this.attrs[0]!);
    this.geo.setAttribute('aSize', this.attrs[1]!);
    this.geo.setAttribute('aColor', this.attrs[2]!);
    this.geo.setDrawRange(0, 0);
    const viewH = { value: 240 };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uViewH: viewH },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    const tmp = new THREE.Vector2();
    // Point o'lchami hozirgi render target balandligiga (PS1 yoki ekran) bog'lanadi
    this.points.onBeforeRender = (r) => {
      const t = r.getRenderTarget();
      viewH.value = t ? t.height : r.getDrawingBufferSize(tmp).y;
    };
  }

  sync(): void {
    this.pool.fill(this.pos, this.size, this.col);
    for (const a of this.attrs) a.needsUpdate = true;
    this.geo.setDrawRange(0, this.pool.count);
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
