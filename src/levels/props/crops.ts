import * as THREE from 'three';
import type { PropDef } from '../types';
import { cachedGeo, stdMat } from './common';
import { farm, fc } from './farmKit';

const HEIGHT: Record<string, number> = { corn: 1.5, wheat: 1.0, plowed: 0.3 };

/**
 * Past dala: yer relyefiga mos tuproq yamoqi + ko'p qatorli ekin (InstancedMesh, qator bo'laklari relyefga mos).
 * size = [qatorlar bo'ylab eniga, ekin balandligi (default tur bo'yicha), uzunligi]; mashina ustidan o'ta oladi (kollayder yo'q).
 */
export function buildCrops(def: PropDef, heightAt: (x: number, z: number) => number): THREE.Group {
  const cfg = farm.crops;
  const variant = def.variant ?? 'wheat';
  const [w, hOpt, d] = def.size ?? [40, 0, 40];
  const h = hOpt || HEIGHT[variant] || 1;
  const yaw = def.yaw ?? 0;
  const [cx, cz] = def.pos;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const world = (lx: number, lz: number): [number, number] => [cx + lx * c + lz * s, cz - lx * s + lz * c];
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.rotation.y = yaw;

  const nx = Math.max(1, Math.round(w / cfg.patchCell));
  const nz = Math.max(1, Math.round(d / cfg.patchCell));
  const patch = new THREE.PlaneGeometry(w, d, nx, nz);
  patch.rotateX(-Math.PI / 2);
  const p = patch.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const [wx, wz] = world(p.getX(i), p.getZ(i));
    p.setY(i, heightAt(wx, wz) + cfg.patchLift);
  }
  patch.computeVertexNormals();
  const dirt = new THREE.Mesh(patch, stdMat('farm.plowed', fc.plowed, 0.95, 0.0));
  dirt.receiveShadow = true;
  g.add(dirt);

  const rows = Math.max(1, Math.floor(w / cfg.rowSpacing));
  const segs = Math.max(1, Math.ceil(d / cfg.segment));
  const segLen = d / segs;
  const geo = cachedGeo('cropRow', () => new THREE.BoxGeometry(1, 1, 1));
  const mesh = new THREE.InstancedMesh(geo, stdMat(`farm.crop.${variant}`, '#ffffff', 0.95, 0), rows * segs);
  const base = new THREE.Color(variant === 'corn' ? fc.corn : variant === 'plowed' ? fc.plowed : fc.wheat);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const lx = -w / 2 + (r + 0.5) * (w / rows);
    for (let sg = 0; sg < segs; sg++) {
      const lz = -d / 2 + (sg + 0.5) * segLen;
      const [wx, wz] = world(lx, lz);
      const j = Math.sin(r * 12.9898 + sg * 78.233) * 0.5 + 0.5;
      const hh = h * (0.85 + 0.3 * j);
      m4.compose(new THREE.Vector3(lx, heightAt(wx, wz) + cfg.patchLift + hh / 2, lz), q, new THREE.Vector3(cfg.rowWidth, hh, segLen * 1.02));
      mesh.setMatrixAt(k, m4);
      mesh.setColorAt(k, col.copy(base).multiplyScalar(0.8 + 0.4 * j));
      k++;
    }
  }
  mesh.count = k;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  g.name = `crops:${variant}`;
  return g;
}
