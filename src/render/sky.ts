import * as THREE from 'three';
import cfgJson from '../../data/render.json';

const cfg = cfgJson.environment;

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunColor;
uniform vec3 uSunDir; uniform float uSharp; uniform float uGlow; uniform float uPow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h >= 0.0 ? mix(uHorizon, uTop, pow(h, uPow)) : mix(uHorizon, uGround, min(1.0, -h * 4.0));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(s, uSharp) * uGlow * 4.0 + pow(s, 8.0) * 0.25);
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeSkyMaterial(sunDir: THREE.Vector3): THREE.ShaderMaterial {
  const c = (h: string) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: c(cfg.sky.top) },
      uHorizon: { value: c(cfg.sky.horizon) },
      uGround: { value: c(cfg.sky.ground) },
      uSunColor: { value: c(cfg.sky.sunColor) },
      uSunDir: { value: sunDir },
      uSharp: { value: cfg.sky.sunSharpness },
      uGlow: { value: cfg.sky.sunGlow },
      uPow: { value: cfg.sky.horizonPower },
    },
  });
}

/** Kamera bilan birga yuruvchi osmon gumbazi. */
export function makeSkyDome(mat: THREE.ShaderMaterial): THREE.Mesh {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(cfg.sky.radius, 24, 16), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.onBeforeRender = (_r, _s, camera) => dome.position.copy(camera.position);
  return dome;
}
