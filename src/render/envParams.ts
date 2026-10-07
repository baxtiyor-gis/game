// Arena muhiti parametrlari: data/render.json default + ArenaDef.environment. Three obyektlariga qo'llash (DOM/GL siz).
import * as THREE from 'three';
import cfgJson from '../../data/render.json';
import type { EnvironmentDef } from '../levels/types';

const cfg = cfgJson.environment;

export interface ResolvedEnv {
  skyTop: string;
  skyHorizon: string;
  skyGround: string;
  skySun: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunDir: [number, number, number];
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
}

/** Arena ta'rifi (yo'q bo'lsa default) bilan to'liq parametrlar to'plami. */
export function resolveEnvironment(def?: EnvironmentDef): ResolvedEnv {
  return {
    skyTop: def?.sky?.top ?? cfg.sky.top,
    skyHorizon: def?.sky?.horizon ?? cfg.sky.horizon,
    skyGround: def?.sky?.ground ?? cfg.sky.ground,
    skySun: def?.sky?.sunColor ?? cfg.sky.sunColor,
    fogColor: def?.fog?.color ?? cfg.fog.color,
    fogNear: def?.fog?.near ?? cfg.fog.near,
    fogFar: def?.fog?.far ?? cfg.fog.far,
    sunColor: def?.sun?.color ?? cfg.sunColor,
    sunDir: def?.sun?.direction ?? (cfg.sunDirection as [number, number, number]),
    sunIntensity: def?.sun?.intensity ?? cfg.sunIntensity,
    hemiSky: def?.hemi?.sky ?? cfg.hemi.sky,
    hemiGround: def?.hemi?.ground ?? cfg.hemi.ground,
    hemiIntensity: def?.hemi?.intensity ?? cfg.hemi.intensity,
  };
}

export interface EnvTargets {
  scene: THREE.Scene;
  skyMat: THREE.ShaderMaterial;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** Quyosh yo'nalishi (birlik vektor); osmon uniform i ham shu obyektga havola — joyida o'zgartiriladi */
  dir: THREE.Vector3;
}

export function applyEnvParams(r: ResolvedEnv, t: EnvTargets): void {
  const u = t.skyMat.uniforms;
  (u.uTop!.value as THREE.Color).set(r.skyTop);
  (u.uHorizon!.value as THREE.Color).set(r.skyHorizon);
  (u.uGround!.value as THREE.Color).set(r.skyGround);
  (u.uSunColor!.value as THREE.Color).set(r.skySun);
  t.dir.set(...r.sunDir).normalize();
  if (t.scene.background instanceof THREE.Color) t.scene.background.set(r.fogColor);
  else t.scene.background = new THREE.Color(r.fogColor);
  if (t.scene.fog instanceof THREE.Fog) {
    t.scene.fog.color.set(r.fogColor);
    t.scene.fog.near = r.fogNear;
    t.scene.fog.far = r.fogFar;
  } else {
    t.scene.fog = new THREE.Fog(r.fogColor, r.fogNear, r.fogFar);
  }
  t.sun.color.set(r.sunColor);
  t.sun.intensity = r.sunIntensity;
  t.hemi.color.set(r.hemiSky);
  t.hemi.groundColor.set(r.hemiGround);
  t.hemi.intensity = r.hemiIntensity;
}
