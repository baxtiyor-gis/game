import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyEnvParams, resolveEnvironment } from '../src/render/envParams';
import { makeSkyMaterial } from '../src/render/sky';
import oilFields from '../data/levels/oil_fields.json';
import valleyFarms from '../data/levels/valley_farms.json';
import type { ArenaDef } from '../src/levels/types';
import cfgJson from '../data/render.json';

function targets() {
  const dir = new THREE.Vector3(0, 1, 0);
  return {
    scene: new THREE.Scene(), skyMat: makeSkyMaterial(dir), dir,
    sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(),
  };
}

describe('arena muhiti', () => {
  it('def yo\'q bo\'lsa data/render.json defaultlari', () => {
    const r = resolveEnvironment(undefined);
    expect(r.skyTop).toBe(cfgJson.environment.sky.top);
    expect(r.fogFar).toBe(cfgJson.environment.fog.far);
    expect(resolveEnvironment({ fog: { near: 5 } }).fogFar).toBe(cfgJson.environment.fog.far);
  });

  it('ikki arena har xil osmon, tuman va quyosh oladi', () => {
    const a = resolveEnvironment((oilFields as unknown as ArenaDef).environment);
    const b = resolveEnvironment((valleyFarms as unknown as ArenaDef).environment);
    expect(a.skyTop).not.toBe(b.skyTop);
    expect(a.fogColor).not.toBe(b.fogColor);
    expect(a.sunColor).not.toBe(b.sunColor);
    expect(a.fogColor).not.toBe(resolveEnvironment().fogColor);
    expect(b.skyTop).not.toBe(resolveEnvironment().skyTop);
  });

  it('applyEnvParams: uniform, tuman, quyosh, hemisphere, yo\'nalish (joyida) yangilanadi', () => {
    const t = targets();
    const b = resolveEnvironment((valleyFarms as unknown as ArenaDef).environment);
    applyEnvParams(b, t);
    expect((t.skyMat.uniforms.uTop!.value as THREE.Color).getHexString()).toBe(b.skyTop.slice(1));
    expect(t.scene.fog).toBeInstanceOf(THREE.Fog);
    expect((t.scene.fog as THREE.Fog).far).toBe(b.fogFar);
    expect((t.scene.background as THREE.Color).getHexString()).toBe(b.fogColor.slice(1));
    expect(t.sun.intensity).toBe(b.sunIntensity);
    expect(t.sun.color.getHexString()).toBe(b.sunColor.slice(1));
    expect(t.hemi.intensity).toBe(b.hemiIntensity);
    expect(t.skyMat.uniforms.uSunDir!.value).toBe(t.dir);
    expect(t.dir.length()).toBeCloseTo(1, 5);
    expect(t.dir.x).toBeGreaterThan(0);
    // qayta qo'llash mavjud Fog ni yangilaydi
    const fog = t.scene.fog;
    applyEnvParams(resolveEnvironment((oilFields as unknown as ArenaDef).environment), t);
    expect(t.scene.fog).toBe(fog);
    expect((t.scene.fog as THREE.Fog).far).not.toBe(b.fogFar);
  });
});
