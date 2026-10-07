// Mashina tanlashdagi aylanuvchi 3D ko'rinish: alohida kichik renderer (faqat shu ekran ochiq bo'lganda chiziladi).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { VehicleDef } from '../../core/types';
import { createVehicleModel } from '../../vehicles/model';
import { MENU } from './config';

const P = MENU.preview as Record<string, number | string> & {
  fov: number; pitch: number; spin: number; fitMargin: number; pixelRatioMax: number; envIntensity: number;
  sun: number; hemi: number; padRadiusFactor: number; padColor: string; padRing: string;
};

export class Preview {
  readonly canvas: HTMLCanvasElement;
  private renderer?: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(P.fov, 1, 0.1, 200);
  private readonly turntable = new THREE.Group();
  private current?: THREE.Object3D;
  private pad?: THREE.Group;
  private radius = 3;
  private w = 0;
  private h = 0;
  private yaw = 0.6;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    parent.appendChild(this.canvas);
    this.scene.add(this.turntable);
    const sun = new THREE.DirectionalLight('#fff1d6', P.sun);
    sun.position.set(8, 14, 10);
    this.scene.add(sun, new THREE.HemisphereLight('#ffd9a0', '#3a1a10', P.hemi));
  }

  private ensureRenderer(): THREE.WebGLRenderer | undefined {
    if (this.renderer) return this.renderer;
    try {
      const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
      r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, P.pixelRatioMax));
      const pm = new THREE.PMREMGenerator(r);
      this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = P.envIntensity;
      pm.dispose();
      this.renderer = r;
    } catch {
      this.renderer = undefined; // WebGL yo'q: 3D ko'rinishsiz ham menyu ishlaydi
    }
    return this.renderer;
  }

  /** Tanlangan mashina modeli (oldingisi tozalanadi: faqat material nusxalari, geometriya umumiy keshda). */
  show(def: VehicleDef): void {
    this.clear();
    const { root } = createVehicleModel(def);
    const box = new THREE.Box3().setFromObject(root);
    root.position.y = -box.min.y;
    box.setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    this.radius = Math.max(size.x, size.z, size.y) * 0.5;
    this.current = root;
    this.turntable.add(root);
    this.buildPad(Math.max(size.x, size.z) * P.padRadiusFactor);
    this.layout(size.y);
  }

  private buildPad(r: number): void {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 1.04, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: P.padColor, roughness: 0.6, metalness: 0.3 }),
    );
    disc.position.y = -0.07;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: P.padRing }));
    ring.rotation.x = Math.PI / 2;
    g.add(disc, ring);
    this.pad = g;
    this.scene.add(g);
  }

  private layout(height: number): void {
    const fit = (this.radius * P.fitMargin) / Math.sin((P.fov * Math.PI) / 360);
    const d = Math.max(fit, 4);
    this.camera.position.set(0, Math.sin(P.pitch) * d + height * 0.3, Math.cos(P.pitch) * d);
    this.camera.lookAt(0, height * 0.4, 0);
  }

  private clear(): void {
    const cur = this.current;
    if (cur) {
      cur.removeFromParent();
      cur.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const x of Array.isArray(m) ? m : m ? [m] : []) x.dispose();
      });
      this.current = undefined;
    }
    if (this.pad) {
      this.pad.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      this.pad.removeFromParent();
      this.pad = undefined;
    }
  }

  /** Ekran ochiq bo'lganda har kadr: aylantirish + chizish. */
  tick(dt: number): void {
    const r = this.ensureRenderer();
    if (!r || !this.current) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (w !== this.w || h !== this.h) {
      this.w = w;
      this.h = h;
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.yaw += dt * P.spin;
    this.turntable.rotation.y = this.yaw;
    r.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clear();
    (this.scene.environment as THREE.Texture | null)?.dispose();
    this.renderer?.dispose();
    this.renderer = undefined;
    this.canvas.remove();
  }
}
