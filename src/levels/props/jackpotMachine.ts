import * as THREE from 'three';
import { cachedGeo, onCacheDispose, stdMat } from './common';
import { put, unitBox } from './farmKit';
import { casino, cmat, neon, signPanel } from './casinoKit';
import { mergeStatic } from '../mergeStatic';

const J = casino.jackpot;
const REEL_Y = 5.4;
const REEL_R = 1.15;
const REEL_W = 1.3;
const PALETTE = ['#e0242f', '#f2d23c', '#52d05a', '#ffd23f', '#3a8cff', '#ff8a2a', '#f06ad0', '#1a1418'];

export interface JackpotModel {
  /** Statik korpus (birlashtirilgan), reellar va richag alohida */
  body: THREE.Group;
  reels: THREE.Mesh[];
  lever: THREE.Object3D;
  /** Chaqnaydigan lampochkalar materiallari (ikki guruh) */
  bulbs: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  dispose(): void;
}

let reelTex: THREE.DataTexture | null = null;

/** Reel materiali: 8 ta belgi (rangli blok + qorong'i chegara), silindr bo'ylab; tekstura kesh bilan birga tozalanadi. */
function reelMat(): THREE.MeshStandardMaterial {
  if (!reelTex) {
    const data = new Uint8Array(J.symbols * 4 * 4);
    PALETTE.forEach((c, i) => {
      const rgb = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
      for (let px = 0; px < 4; px++) data.set(px === 0 || px === 3 ? [30, 22, 28, 255] : [...rgb, 255], (i * 4 + px) * 4);
    });
    reelTex = new THREE.DataTexture(data, J.symbols * 4, 1, THREE.RGBAFormat);
    reelTex.colorSpace = THREE.SRGBColorSpace;
    reelTex.wrapS = THREE.RepeatWrapping;
    reelTex.magFilter = THREE.NearestFilter;
    reelTex.minFilter = THREE.NearestFilter;
    reelTex.needsUpdate = true;
    onCacheDispose(() => {
      reelTex?.dispose();
      reelTex = null;
    });
  }
  return stdMat('casino.reel', '#ffffff', 0.35, 0.1, { map: reelTex, emissiveMap: reelTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.85 });
}

/** Ulkan o'yin avtomati viveskasi (lokal +z — old, asosi y=0): korpus, 3 ta reel, richag, tepada "JACKPOT" paneli va lampochkalar. */
export function buildJackpotMachine(): JackpotModel {
  const [W, , D] = J.size;
  const body = new THREE.Group();
  const red = cmat('cabinet', 0.4, 0.5);
  const trim = cmat('cabinetTrim', 0.35, 0.7);
  const frame = cmat('reelFrame', 0.6, 0.3);
  const bulbA = neon('amber', '.bulbA');
  const bulbB = neon('amber', '.bulbB');
  const src = new THREE.Group();
  put(src, unitBox(), red, [0, 1.6, 0], [W, 3.2, D]);
  put(src, unitBox(), trim, [0, 3.3, D / 2 + 0.05], [W + 0.2, 0.3, 0.3]);
  put(src, unitBox(), red, [0, 5.4, -0.1], [W - 0.4, 4.2, D - 0.6]);
  put(src, unitBox(), frame, [0, REEL_Y, D / 2 - 0.45], [W - 1.2, 2.9, 0.5]);
  for (const sx of [-1, 1]) put(src, unitBox(), trim, [sx * (W / 2 - 0.25), 5.4, D / 2 - 0.35], [0.3, 4.2, 0.3]);
  put(src, unitBox(), neon('red'), [0, 2.0, D / 2 + 0.05], [W * 0.6, 0.5, 0.1]);
  put(src, unitBox(), neon('amber'), [0, 1.0, D / 2 + 0.05], [W * 0.4, 0.4, 0.1]);
  put(src, unitBox(), red, [0, 8.9, -0.2], [W + 0.6, 2.8, 1.2]);
  put(src, unitBox(), trim, [0, 10.4, -0.2], [W + 0.9, 0.4, 1.4]);
  signPanel(src, W - 0.4, 2.2, [0, 8.9, 0.42], 'casino.sign.jackpot', 'amber');
  const bulbCount = 10;
  for (let i = 0; i < bulbCount; i++) {
    const x = (i / (bulbCount - 1) - 0.5) * (W + 0.2);
    put(src, unitBox(), i % 2 ? bulbA : bulbB, [x, 10.0, 0.5], [0.34, 0.34, 0.34]).castShadow = false;
    put(src, unitBox(), i % 2 ? bulbB : bulbA, [x, 7.8, 0.5], [0.34, 0.34, 0.34]).castShadow = false;
  }
  for (const sy of [4.1, 6.7]) put(src, unitBox(), neon('cyan'), [0, sy, D / 2 - 0.15], [W - 1.2, 0.18, 0.12]);
  const free = mergeStatic([src], body);

  const reelGeo = cachedGeo('casino.reelGeo', () => new THREE.CylinderGeometry(REEL_R, REEL_R, REEL_W, 24).rotateZ(Math.PI / 2));
  const reels: THREE.Mesh[] = [];
  const rm = reelMat();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(reelGeo, rm);
    r.position.set((i - 1) * (REEL_W + 0.1), REEL_Y, D / 2 - 0.8);
    body.add(r);
    reels.push(r);
  }
  const lever = new THREE.Group();
  lever.position.set(W / 2 + 0.2, 3.8, 0);
  const rod = new THREE.Mesh(cachedGeo('casino.rod', () => new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6).translate(0, 1.2, 0)), cmat('chrome', 0.3, 0.8));
  const ball = new THREE.Mesh(cachedGeo('casino.ball', () => new THREE.SphereGeometry(0.4, 10, 8)), cmat('#d11a2a', 0.4, 0.3));
  ball.position.y = 2.5;
  lever.add(rod, ball);
  body.add(lever);
  return { body, reels, lever, bulbs: [bulbA, bulbB], dispose: free };
}
