// Statik proplarni birlashtirish: bir xil material (+ soya bayroqlari, fazoviy katak) dagi meshlar bitta geometriyaga
// qo'shiladi. Natija: draw call keskin kamayadi (asosiy va soya o'tishlarida). Faqat oddiy Mesh lar; qolganlari o'z holicha.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { propCfg } from './props/common';

interface Bucket {
  mat: THREE.Material;
  cast: boolean;
  recv: boolean;
  geos: THREE.BufferGeometry[];
}

/** Material talab qiladigan atributlar (qolganlari tashlanadi, shunda hamma geometriya bir xil bo'ladi). */
function attrsFor(mat: THREE.Material): string[] {
  const m = mat as THREE.MeshStandardMaterial;
  const a = ['position', 'normal'];
  if (m.map || m.emissiveMap || m.roughnessMap || m.normalMap) a.push('uv');
  if (m.vertexColors) a.push('color');
  return a;
}

/** Dunyo matritsasi qo'llangan, indekssiz, faqat kerakli atributli nusxa (atribut yetishmasa null). */
function prepare(mesh: THREE.Mesh, mat: THREE.Material): THREE.BufferGeometry | null {
  const src = mesh.geometry;
  const need = attrsFor(mat);
  if (need.some((n) => n !== 'normal' && !src.getAttribute(n))) return null;
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const name of Object.keys(g.attributes)) if (!need.includes(name)) g.deleteAttribute(name);
  g.morphAttributes = {};
  g.clearGroups();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  g.applyMatrix4(mesh.matrixWorld);
  return g;
}

const mergeable = (o: THREE.Object3D): boolean =>
  (o as THREE.Mesh).isMesh === true && !(o as THREE.InstancedMesh).isInstancedMesh && !Array.isArray((o as THREE.Mesh).material) && o.visible;

/**
 * `roots` (sahnaga hali qo'shilmagan, dunyo koordinatalaridagi prop daraxtlari) ni `into` ga birlashtirib qo'shadi.
 * Birlashmaydigan obyekt bo'lsa, butun daraxt o'zgarishsiz qo'shiladi. Qaytadi: yangi geometriyalarni bo'shatuvchi.
 */
export function mergeStatic(roots: THREE.Object3D[], into: THREE.Object3D): () => void {
  const buckets = new Map<string, Bucket>();
  const cell = propCfg.merge.cell;
  for (const root of roots) {
    root.updateMatrixWorld(true);
    let ok = true;
    root.traverse((o) => {
      const drawable = (o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine || (o as THREE.Sprite).isSprite;
      if (drawable && !mergeable(o)) ok = false;
    });
    const meshes: Array<[THREE.Mesh, THREE.BufferGeometry]> = [];
    if (ok) {
      root.traverse((o) => {
        if (!mergeable(o)) return;
        const m = o as THREE.Mesh;
        const g = prepare(m, m.material as THREE.Material);
        if (g) meshes.push([m, g]);
        else ok = false;
      });
    }
    if (!ok) {
      for (const [, g] of meshes) g.dispose();
      into.add(root);
      continue;
    }
    const p = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
    const cx = Math.floor(p.x / cell);
    const cz = Math.floor(p.z / cell);
    for (const [m, g] of meshes) {
      const mat = m.material as THREE.Material;
      const key = `${mat.uuid}:${m.castShadow}:${m.receiveShadow}:${cx}:${cz}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat, cast: m.castShadow, recv: m.receiveShadow, geos: [] }));
      b.geos.push(g);
      if (m.userData.ownGeo) m.geometry.dispose();
    }
  }
  const made: THREE.BufferGeometry[] = [];
  for (const b of buckets.values()) {
    const merged = b.geos.length > 1 ? mergeGeometries(b.geos, false) : null;
    if (merged) for (const g of b.geos) g.dispose();
    // Atributlar mos kelmasa (null) — har bir geometriya alohida mesh bo'lib qoladi
    for (const geo of merged ? [merged] : b.geos) {
      geo.computeBoundingSphere();
      made.push(geo);
      const mesh = new THREE.Mesh(geo, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.recv;
      mesh.name = 'static';
      into.add(mesh);
    }
  }
  return () => made.forEach((g) => g.dispose());
}
