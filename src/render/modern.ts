import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { World } from '../core/world';
import cfgJson from '../../data/render.json';
import { installPS1 } from './ps1';

const cfg = cfgJson.modern;

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uStrength: { value: cfg.vignette.strength },
    uSoft: { value: cfg.vignette.softness },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uStrength; uniform float uSoft; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5)) * 1.4142;
      c.rgb *= 1.0 - uStrength * smoothstep(1.0 - uSoft, 1.0, d);
      gl_FragColor = c;
    }`,
};

export interface ModernPipeline {
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  render(): void;
  dispose(): void;
}

/** Zamonaviy ko'rinish: ACES + sRGB + PCFSoft soya + bloom + FXAA + vinyetka. */
export function installModern(world: World): ModernPipeline {
  const r = world.renderer;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = cfg.exposure;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, cfg.pixelRatioMax));

  const composer = new EffectComposer(r);
  composer.addPass(new RenderPass(world.scene, world.camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), cfg.bloom.strength, cfg.bloom.radius, cfg.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  if (cfg.fxaa) composer.addPass(new FXAAPass());
  composer.addPass(new ShaderPass(VignetteShader));

  const size = new THREE.Vector2();
  let lastW = 0, lastH = 0, lastPR = 0;
  const resize = (): void => {
    r.getSize(size);
    const pr = r.getPixelRatio();
    if (size.x === lastW && size.y === lastH && pr === lastPR) return;
    [lastW, lastH, lastPR] = [size.x, size.y, pr];
    composer.setPixelRatio(pr);
    composer.setSize(size.x, size.y);
    // Bloom yarim aniqlikda
    bloom.setSize(size.x * pr * cfg.bloom.resolutionScale, size.y * pr * cfg.bloom.resolutionScale);
  };

  const render = (): void => {
    resize();
    composer.render();
  };
  world.renderHook = render;
  return {
    composer,
    bloom,
    render,
    dispose: () => {
      world.renderHook = undefined;
      // EffectComposer.dispose() pass larni bo'shatmaydi (bloom/FXAA/Output render targetlari) — avval ularni
      for (const pass of composer.passes) pass.dispose?.();
      composer.dispose();
    },
  };
}

/** `retro` (data/render.json) bo'yicha PS1 yoki zamonaviy pipeline ni ulaydi. */
export function installRenderMode(world: World, retro: boolean = cfgJson.retro): void {
  if (retro) installPS1(world);
  else installModern(world);
}
