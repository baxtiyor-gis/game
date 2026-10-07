// Dev vositasi: barcha mashina modellarini 4x4 to'rda yoritilgan holda ko'rsatadi (?id=rattler&yaw=0.6 — yakka ko'rinish).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { vehicles } from '../core/data';
import { createVehicleModel } from '../vehicles/model';
import { wheelLayout } from '../vehicles/layout';

const SPACING = 11;
const COLS = 4;
const q = new URLSearchParams(location.search);
const only = q.get('id');
const yaw = Number(q.get('yaw') ?? 0.65);
const pitch = Number(q.get('pitch') ?? (only ? 0.45 : 0.85));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fb4d8');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.position.set(30, 50, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 150 });
scene.add(sun, new THREE.HemisphereLight('#bcd4ff', '#6a5a46', 0.6));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#7d7664', roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const list = only ? vehicles.filter((v) => v.id === only) : vehicles;
let tris = 0;
list.forEach((def, i) => {
  const { root } = createVehicleModel(def);
  const gy = wheelLayout(def)[0]!;
  root.position.set(only ? 0 : ((i % COLS) - (COLS - 1) / 2) * SPACING, -(gy.y - gy.restLength - gy.radius), only ? 0 : (Math.floor(i / COLS) - 1.5) * SPACING);
  root.rotation.y = yaw;
  scene.add(root);
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  });
});

const camera = new THREE.PerspectiveCamera(only ? 30 : 22, innerWidth / innerHeight, 0.5, 400);
const dist = only ? 2.5 * Math.max(...list[0]!.size) : 80;
camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
camera.lookAt(0, only ? 0.8 : -1, 0);
renderer.render(scene, camera);
Object.assign(window, { __garageReady: true, __tris: tris });
