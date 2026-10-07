import * as THREE from 'three';
import type { GameWorld } from '../core/types';
import type { World } from '../core/world';
import cfgJson from '../../data/render.json';

const cfg = cfgJson.ps1;

/** 4x4 Bayer matritsasi (0..15). */
export const BAYER4: readonly number[] = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Past aniqlikdagi target o'lchami: balandlik qat'iy, eni aspect bo'yicha. */
export function lowResSize(aspect: number, height: number = cfg.height): { w: number; h: number } {
  return { w: Math.max(1, Math.round(height * aspect)), h: height };
}

/** Kanal darajalari soni (5 bit => 31). */
export function colorLevels(bits: number = cfg.colorBits): number {
  return 2 ** bits - 1;
}

/** Bayer chegarasi: -0.5..0.5 oralig'ida. */
export function bayerThreshold(x: number, y: number): number {
  return ((BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16 - 0.5;
}

const snapGrid = { value: new THREE.Vector2(160, 120) };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uLow;
uniform float uLevels;
uniform float uDither;
varying vec2 vUv;
const float BAYER[16] = float[16](${BAYER4.map((n) => n.toFixed(1)).join(', ')});
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  vec2 p = floor(vUv * uLow);
  int idx = int(mod(p.y, 4.0)) * 4 + int(mod(p.x, 4.0));
  float t = (BAYER[idx] + 0.5) / 16.0 - 0.5;
  gl_FragColor.rgb = clamp(floor(gl_FragColor.rgb * uLevels + t * uDither + 0.5) / uLevels, 0.0, 1.0);
}`;

/** Material uchun vertex snapping (clip-space grid). Ikki marta chaqirilsa ham xavfsiz. */
export function applyPS1Material(material: THREE.Material): void {
  if (material.userData.ps1) return;
  if (material instanceof THREE.ShaderMaterial || material instanceof THREE.PointsMaterial) return;
  material.userData.ps1 = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    shader.uniforms.uPS1Grid = snapGrid;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform vec2 uPS1Grid;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 ps1p = gl_Position;
        ps1p.xy = floor(ps1p.xy / ps1p.w * uPS1Grid + 0.5) / uPS1Grid * ps1p.w;
        gl_Position = ps1p;`,
      );
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey.call(material)}|ps1`;
  material.needsUpdate = true;
}

export function applyPS1Scene(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(applyPS1Material);
    else applyPS1Material(m);
  });
}

/** Sahnani past aniqlikdagi targetga chizib, dither + 15-bit rang bilan ekranga kattalashtiradi. */
export class PS1Pipeline {
  private target: THREE.WebGLRenderTarget;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;
  private readonly size = new THREE.Vector2();
  private frames = 0;

  constructor(private readonly world: GameWorld) {
    this.target = this.makeTarget(lowResSize(16 / 9));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uLow: { value: new THREE.Vector2() },
        uLevels: { value: colorLevels() },
        uDither: { value: cfg.ditherStrength },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    if (!world.scene.fog) world.scene.fog = new THREE.Fog(cfg.fog.color, cfg.fog.near, cfg.fog.far);
    applyPS1Scene(world.scene);
  }

  private makeTarget(s: { w: number; h: number }): THREE.WebGLRenderTarget {
    const t = new THREE.WebGLRenderTarget(s.w, s.h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    return t;
  }

  private resizeIfNeeded(): void {
    const r = this.world.renderer;
    r.getSize(this.size);
    const s = lowResSize(this.size.x / Math.max(1, this.size.y));
    if (s.w !== this.target.width || s.h !== this.target.height) this.target.setSize(s.w, s.h);
    this.mat.uniforms.uLow.value.set(s.w, s.h);
    snapGrid.value.set(s.w * 0.5 * cfg.snapScale, s.h * 0.5 * cfg.snapScale);
  }

  render(): void {
    const r = this.world.renderer;
    if (this.frames++ % cfg.rescanFrames === 0) applyPS1Scene(this.world.scene);
    this.resizeIfNeeded();
    r.setRenderTarget(this.target);
    r.render(this.world.scene, this.world.camera);
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  dispose(): void {
    this.target.dispose();
    this.mat.dispose();
    this.quad.geometry.dispose();
  }
}

/** World.renderHook orqali PS1 pipeline ni ulaydi. */
export function installPS1(world: World): PS1Pipeline {
  const pipe = new PS1Pipeline(world);
  world.renderHook = () => pipe.render();
  return pipe;
}
