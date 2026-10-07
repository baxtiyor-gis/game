// Zamonaviy sandiq: bevelli metall quti, yon plitalarda ikonka, ustida aylanuvchi mini model, ostida yorqin halqa + nur.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PickupKind, WeaponId } from '../../core/types';
import { vis } from './config';
import { GeoBuilder } from './geom';
import { disposeIconTextures, iconTexture } from './crateIcon';
import { getModel } from './models';

export interface CrateView {
  group: THREE.Group;
  /** halqa + nur (yerga bog'langan: group bobbing ini kompensatsiya qiladi) */
  fx: THREE.Object3D;
  /** mini model tashuvchisi (o'z o'qida aylanadi) */
  holder: THREE.Object3D;
}

type FxClass = 'weapon' | 'health' | 'special';
const fxClass = (k: PickupKind): FxClass => (k === 'health' || k === 'special' ? k : 'weapon');
const isWeapon = (k: PickupKind): k is WeaponId => fxClass(k) === 'weapon';

export class CrateKit {
  private readonly body: THREE.BufferGeometry;
  private readonly plates: THREE.BufferGeometry;
  private readonly bodyMat: THREE.MeshStandardMaterial;
  private readonly fxGeo = new Map<FxClass, THREE.BufferGeometry>();
  private readonly fxMat = new THREE.MeshBasicMaterial({
    vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  });
  private readonly plateMats = new Map<PickupKind, THREE.MeshBasicMaterial>();
  private readonly modelMats = new Map<PickupKind, THREE.Material>();
  private readonly glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  private readonly extraGeo = new Map<PickupKind, THREE.BufferGeometry>();

  constructor(private readonly size: number, crateColor: string, private readonly colors: Record<PickupKind, string>) {
    const c = vis.crate;
    const b = new GeoBuilder();
    b.add(new RoundedBoxGeometry(size, size, size, c.bevelSegments, c.bevel), crateColor);
    const trim = size + c.bandOverhang * 2;
    for (const sy of [-1, 1]) {
      b.add(new RoundedBoxGeometry(trim, c.bandWidth, trim, c.bevelSegments, c.bevel * 0.4), c.bandColor, [0, sy * (size / 2 - c.bandWidth * 0.55), 0]);
    }
    this.body = b.build();
    this.bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: c.metalness, roughness: c.roughness });

    const p = new GeoBuilder();
    const ps = size * c.plateSize;
    const off = size / 2 + c.bandOverhang * 0.5 + 0.004;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      p.add(new THREE.PlaneGeometry(ps, ps), '#ffffff', [Math.sin(a) * off, 0, Math.cos(a) * off], [0, a, 0]);
    }
    this.plates = p.build();
  }

  private fxGeometry(cls: FxClass): THREE.BufferGeometry {
    let g = this.fxGeo.get(cls);
    if (g) return g;
    const r = vis.crate.ring;
    const bm = vis.crate.beam;
    const color = new THREE.Color(vis.crate.ringColors[cls]);
    const ring = new GeoBuilder().add(new THREE.TorusGeometry(r.radius, r.tube, 8, 40).rotateX(Math.PI / 2), vis.crate.ringColors[cls], [0, 0, 0], [0, 0, 0], r.intensity).build();
    const beam = new THREE.CylinderGeometry(bm.radius, r.radius * 0.9, bm.height, 20, 1, true).translate(0, bm.height / 2, 0);
    const nb = beam.toNonIndexed();
    beam.dispose();
    const pos = nb.getAttribute('position');
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = bm.opacity * Math.max(0, 1 - pos.getY(i) / bm.height) ** 1.5;
      arr.set([color.r * k, color.g * k, color.b * k], i * 3);
    }
    nb.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g = mergeGeometries([ring, nb])!;
    ring.dispose();
    nb.dispose();
    this.fxGeo.set(cls, g);
    return g;
  }

  private plateMat(kind: PickupKind): THREE.MeshBasicMaterial {
    let m = this.plateMats.get(kind);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ map: iconTexture(kind, this.colors[kind]), toneMapped: false });
      this.plateMats.set(kind, m);
    }
    return m;
  }

  private modelFor(kind: PickupKind): { geo: THREE.BufferGeometry; mat: THREE.Material; glow: THREE.BufferGeometry | null } {
    if (isWeapon(kind)) {
      const m = getModel(kind);
      let mat = this.modelMats.get(kind);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: m.metalness, roughness: m.roughness });
        this.modelMats.set(kind, mat);
      }
      return { geo: m.body, mat, glow: m.glow };
    }
    let geo = this.extraGeo.get(kind);
    if (!geo) {
      const b = new GeoBuilder();
      if (kind === 'health') {
        b.add(new RoundedBoxGeometry(0.62, 0.2, 0.2, 2, 0.05), '#ffffff').add(new RoundedBoxGeometry(0.2, 0.62, 0.2, 2, 0.05), '#ffffff');
      } else b.add(new THREE.OctahedronGeometry(0.34), '#ffffff', [0, 0, 0], [0, 0, 0]);
      geo = b.build();
      this.extraGeo.set(kind, geo);
    }
    let mat = this.modelMats.get(kind);
    if (!mat) {
      const col = this.colors[kind];
      mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.35 });
      this.modelMats.set(kind, mat);
    }
    return { geo, mat, glow: null };
  }

  build(kind: PickupKind): CrateView {
    const c = vis.crate;
    const group = new THREE.Group();
    group.add(new THREE.Mesh(this.body, this.bodyMat), new THREE.Mesh(this.plates, this.plateMat(kind)));
    const fx = new THREE.Mesh(this.fxGeometry(fxClass(kind)), this.fxMat);
    group.add(fx);
    const holder = new THREE.Group();
    holder.position.y = this.size * c.modelHeight;
    const tilt = new THREE.Group();
    tilt.rotation.x = -c.modelTilt;
    const { geo, mat, glow } = this.modelFor(kind);
    if (!geo.boundingBox) geo.computeBoundingBox();
    const dim = geo.boundingBox!.getSize(new THREE.Vector3());
    tilt.scale.setScalar((c.modelScale * this.size) / Math.max(dim.x, dim.y, dim.z));
    tilt.add(new THREE.Mesh(geo, mat));
    if (glow) tilt.add(new THREE.Mesh(glow, this.glowMat));
    holder.add(tilt);
    group.add(holder);
    return { group, fx, holder };
  }

  /** lift = group Y - sandiq poydevori Y (bobbing); phase = animatsiya vaqti. */
  animate(v: CrateView, phase: number, lift: number): void {
    const r = vis.crate.ring;
    v.fx.position.y = -lift + r.groundOffset;
    v.fx.scale.setScalar(1 + r.pulse * Math.sin(phase * r.pulseSpeed));
    v.holder.rotation.y = phase * vis.crate.modelSpin;
  }

  dispose(): void {
    this.body.dispose();
    this.plates.dispose();
    this.bodyMat.dispose();
    this.fxMat.dispose();
    this.glowMat.dispose();
    for (const g of [...this.fxGeo.values(), ...this.extraGeo.values()]) g.dispose();
    for (const m of [...this.plateMats.values(), ...this.modelMats.values()]) m.dispose();
    disposeIconTextures();
  }
}
