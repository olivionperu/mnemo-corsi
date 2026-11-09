// Construcción de cada sala: piso, muros, puerta, antorchas y bloques de Corsi.
import * as THREE from 'three';
import { createRng } from './corsi.js';

export const ROOM_W = 12;
export const ROOM_D = 12;
export const WALL_H = 4.2;
export const WALL_T = 0.5;
export const DOOR_X = 3.8;
export const DOOR_W = 1.8;
export const DOOR_H = 2.8;

// Una paleta por sala: el jugador "desciende" hacia el núcleo de la memoria.
export const PALETTES = [
  { name: 'Vestíbulo de musgo', floor: '#5b7a5e', grout: '#41594a', wall: '#6b6a8a', mortar: '#4b4a66', board: '#3b4a3f', bg: '#17142a', torch: '#ffb55a' },
  { name: 'Archivo de arena', floor: '#b08a5b', grout: '#8a6a44', wall: '#8c6b4e', mortar: '#664c37', board: '#6e5236', bg: '#1e1420', torch: '#ffc46b' },
  { name: 'Cripta azul', floor: '#4d6b8c', grout: '#36506b', wall: '#5c5f86', mortar: '#3f4263', board: '#2f405a', bg: '#0f1426', torch: '#7fd8ff' },
  { name: 'Jardín de cobre', floor: '#6f8e5a', grout: '#526b42', wall: '#a0674a', mortar: '#764a35', board: '#455a37', bg: '#1a1218', torch: '#ffa25a' },
  { name: 'Bóveda de cristal', floor: '#6e7fa8', grout: '#4f5d80', wall: '#7a6aa8', mortar: '#574a80', board: '#46527a', bg: '#120f24', torch: '#c59bff' },
  { name: 'Salón de ceniza', floor: '#7c7570', grout: '#5a5450', wall: '#5e5568', mortar: '#433c4c', board: '#4c4642', bg: '#141216', torch: '#ff8a5a' },
  { name: 'Templo del ocaso', floor: '#a86e5e', grout: '#7e5044', wall: '#6e4a6e', mortar: '#4f344f', board: '#6a4038', bg: '#1a0f1c', torch: '#ffb07a' },
  { name: 'Núcleo de la memoria', floor: '#3e4f7a', grout: '#2c3858', wall: '#2f2a55', mortar: '#211d3e', board: '#262f4f', bg: '#0a0918', torch: '#8ff0e2' },
];

export const paletteFor = (i) => PALETTES[i % PALETTES.length];
export const roomCenterZ = (i) => -i * ROOM_D;
export const playerStartZ = (i) => roomCenterZ(i) + ROOM_D / 2 - 1.6;

const PIXEL_DIGITS = [
  ['111', '101', '101', '101', '111'], ['010', '110', '010', '010', '111'],
  ['111', '001', '111', '100', '111'], ['111', '001', '111', '001', '111'],
  ['101', '101', '111', '001', '001'], ['111', '100', '111', '001', '111'],
  ['111', '100', '111', '101', '111'], ['111', '001', '010', '010', '010'],
  ['111', '101', '111', '101', '111'], ['111', '101', '111', '001', '111'],
];

const BLOCK_COLORS ={ show: 0x8ff0e2, tap: 0xf6d365, error: 0xf0605a, win: 0x9cf07a };

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
}

function speckle(g, size, base, rng, count, amount) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = shade(base, (rng() - 0.5) * amount);
    g.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 1, 1);
  }
}

export class Room {
  constructor(scene, index, layout, label) {
    this.scene = scene;
    this.index = index;
    this.pal = paletteFor(index);
    this.z = roomCenterZ(index);
    this.backZ = this.z - ROOM_D / 2;
    this.rng = createRng(index * 7919 + 13);
    this.group = new THREE.Group();
    this.group.position.z = this.z;
    this.materials = [];
    this.textures = [];
    this.geometries = [];
    this.lights = [];
    this.blocks = [];
    this.torches = [];
    this.time = 0;
    this.disposed = false;

    this.buildFloor();
    this.buildWalls();
    this.buildDoor(label);
    this.buildTorches();
    this.buildBlocks(layout);

    // Luz de color que acompaña al bloque iluminado y tiñe el piso.
    this.blockLight = this.addLight(new THREE.PointLight(BLOCK_COLORS.show, 0, 5, 1.5));
    this.blockLight.position.y = 1.2;

    scene.add(this.group);
  }

  // ---------- utilidades ----------
  texture(size, paint, rx = 1, ry = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    paint(g, size);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    this.textures.push(t);
    return t;
  }

  material(params, Type = THREE.MeshLambertMaterial) {
    const m = new Type(params);
    this.materials.push(m);
    return m;
  }

  mesh(geometry, material, { cast = true, receive = true } = {}) {
    this.geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    this.group.add(m);
    return m;
  }

  addLight(light) {
    light.userData.base = light.intensity;
    this.lights.push(light);
    this.group.add(light);
    return light;
  }

  brickTexture(w, h) {
    const { wall, mortar } = this.pal;
    const rng = this.rng;
    return this.texture(16, (g, s) => {
      g.fillStyle = mortar;
      g.fillRect(0, 0, s, s);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let x = -8; x < s; x += 8) {
          g.fillStyle = shade(wall, (rng() - 0.5) * 0.08);
          g.fillRect(x + off, row * 4, 7, 3);
          g.fillStyle = shade(wall, 0.06);
          g.fillRect(x + off, row * 4, 7, 1);
        }
      }
      speckle(g, s, wall, rng, 14, 0.12);
    }, w / 1.6, h / 1.6);
  }

  // ---------- construcción ----------
  buildFloor() {
    const { floor, grout, board } = this.pal;
    const rng = this.rng;
    const tiles = this.texture(16, (g, s) => {
      g.fillStyle = floor;
      g.fillRect(0, 0, s, s);
      speckle(g, s, floor, rng, 40, 0.1);
      g.fillStyle = grout;
      g.fillRect(0, 0, s, 1);
      g.fillRect(0, 0, 1, s);
      g.fillStyle = shade(floor, 0.05);
      g.fillRect(1, 1, s - 1, 1);
    }, (ROOM_W + WALL_T * 2) / 1.5, ROOM_D / 1.5);
    const f = this.mesh(new THREE.BoxGeometry(ROOM_W + WALL_T * 2, 0.4, ROOM_D), this.material({ map: tiles }), { cast: false });
    f.position.y = -0.2;

    // Tablero de Corsi: la superficie donde descansan los bloques.
    const boardTex = this.texture(16, (g, s) => {
      g.fillStyle = board;
      g.fillRect(0, 0, s, s);
      speckle(g, s, board, rng, 30, 0.08);
      g.fillStyle = shade(board, 0.08);
      g.fillRect(0, 0, s, 1);
    }, 6, 6);
    const b = this.mesh(new THREE.BoxGeometry(8.4, 0.08, 9.2), this.material({ map: boardTex }), { cast: false });
    b.position.set(-1.5, 0.04, -0.3);
    const rimMat = this.material({ color: shade(board, -0.08) });
    for (const [w, d, x, z] of [[8.6, 0.2, -1.5, -4.9], [8.6, 0.2, -1.5, 4.3], [0.2, 9.4, -5.8, -0.3], [0.2, 9.4, 2.8, -0.3]]) {
      const r = this.mesh(new THREE.BoxGeometry(w, 0.14, d), rimMat);
      r.position.set(x, 0.07, z);
    }
  }

  buildWalls() {
    const bz = -ROOM_D / 2;
    const segments = [];
    const leftEdge = -ROOM_W / 2 - WALL_T;
    const doorL = DOOR_X - DOOR_W / 2;
    const doorR = DOOR_X + DOOR_W / 2;
    const rightEdge = ROOM_W / 2 + WALL_T;
    segments.push({ w: doorL - leftEdge, h: WALL_H, x: (leftEdge + doorL) / 2, y: WALL_H / 2 });
    segments.push({ w: rightEdge - doorR, h: WALL_H, x: (doorR + rightEdge) / 2, y: WALL_H / 2 });
    segments.push({ w: DOOR_W, h: WALL_H - DOOR_H, x: DOOR_X, y: (WALL_H + DOOR_H) / 2 });
    for (const s of segments) {
      const m = this.mesh(new THREE.BoxGeometry(s.w, s.h, WALL_T), this.material({ map: this.brickTexture(s.w, s.h) }));
      m.position.set(s.x, s.y, bz);
    }
    // Muros laterales, un poco más bajos para no tapar la vista.
    const sideH = WALL_H * 0.75;
    for (const side of [-1, 1]) {
      const m = this.mesh(new THREE.BoxGeometry(WALL_T, sideH, ROOM_D), this.material({ map: this.brickTexture(ROOM_D, sideH) }));
      m.position.set(side * (ROOM_W / 2 + WALL_T / 2), sideH / 2, 0);
    }
    // Remate superior de piedra.
    const capMat = this.material({ color: shade(this.pal.wall, 0.1) });
    const cap = this.mesh(new THREE.BoxGeometry(ROOM_W + WALL_T * 2 + 0.2, 0.25, WALL_T + 0.2), capMat);
    cap.position.set(0, WALL_H + 0.12, bz);
  }

  buildDoor(label) {
    const bz = -ROOM_D / 2;
    const frameMat = this.material({ color: shade(this.pal.mortar, -0.05) });
    for (const side of [-1, 1]) {
      const post = this.mesh(new THREE.BoxGeometry(0.28, DOOR_H + 0.25, WALL_T + 0.24), frameMat);
      post.position.set(DOOR_X + side * (DOOR_W / 2 + 0.14), (DOOR_H + 0.25) / 2, bz);
    }
    const lintel = this.mesh(new THREE.BoxGeometry(DOOR_W + 0.56, 0.3, WALL_T + 0.24), frameMat);
    lintel.position.set(DOOR_X, DOOR_H + 0.12, bz);

    const wood = this.texture(16, (g, s) => {
      for (let x = 0; x < s; x += 4) {
        g.fillStyle = x % 8 ? '#7a4a2a' : '#6a3f23';
        g.fillRect(x, 0, 4, s);
        g.fillStyle = '#4f2e18';
        g.fillRect(x, 0, 1, s);
      }
      g.fillStyle = '#3a3346';
      g.fillRect(0, 3, s, 2);
      g.fillRect(0, 11, s, 2);
      g.fillStyle = '#9b93ad';
      for (const x of [2, 6, 10, 14]) {
        g.fillRect(x, 3, 1, 1);
        g.fillRect(x, 11, 1, 1);
      }
    }, 1, 1.5);
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(DOOR_X - DOOR_W / 2, 0, bz);
    this.group.add(this.doorPivot);
    this.geometries.push(new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.02, 0.22));
    const door = new THREE.Mesh(this.geometries.at(-1), this.material({ map: wood }));
    door.castShadow = door.receiveShadow = true;
    door.position.set(DOOR_W / 2, DOOR_H / 2, 0);
    this.doorPivot.add(door);
    const knobGeo = new THREE.BoxGeometry(0.12, 0.12, 0.34);
    this.geometries.push(knobGeo);
    const knob = new THREE.Mesh(knobGeo, this.material({ color: '#d8b45a' }));
    knob.position.set(DOOR_W - 0.3, DOOR_H / 2, 0);
    this.doorPivot.add(knob);

    // Placa con la cantidad de bloques que hay que recordar en esta sala.
    const plaque = this.texture(16, (g, s) => {
      g.fillStyle = '#1c1830';
      g.fillRect(0, 0, s, s / 2);
      g.fillStyle = this.pal.torch;
      g.fillRect(0, 0, s, 1);
      g.fillRect(0, s / 2 - 1, s, 1);
      // Dígito dibujado píxel a píxel (fuente 3x5) para que se lea nítido.
      const rows = PIXEL_DIGITS[label % 10];
      rows.forEach((row, y) => [...row].forEach((bit, x) => {
        if (bit === '1') g.fillRect(6 + x, 1 + y, 1, 1);
      }));
    });
    plaque.repeat.set(1, 0.5);
    plaque.offset.set(0, 0.5);
    const p = this.mesh(new THREE.PlaneGeometry(1.1, 0.55), this.material({ map: plaque }, THREE.MeshBasicMaterial), { cast: false, receive: false });
    p.position.set(DOOR_X, DOOR_H + 0.75, bz + WALL_T / 2 + 0.01);
  }

  buildTorches() {
    const bz = -ROOM_D / 2 + WALL_T / 2;
    const stickMat = this.material({ color: '#5a3a24' });
    const flameMat = this.material({ color: this.pal.torch }, THREE.MeshBasicMaterial);
    [-4.2, 1.4].forEach((x, i) => {
      const stick = this.mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), stickMat);
      stick.position.set(x, 2.5, bz + 0.15);
      const flame = this.mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), flameMat, { cast: false, receive: false });
      flame.position.set(x, 2.88, bz + 0.15);
      const light = this.addLight(new THREE.PointLight(this.pal.torch, 7, 10, 1.4));
      light.position.set(x, 3.0, bz + 0.6);
      this.torches.push({ flame, light, seed: i * 1.7 });
    });
  }

  buildBlocks(layout) {
    const rng = this.rng;
    const stone = this.texture(16, (g, s) => {
      g.fillStyle = '#d8be84';
      g.fillRect(0, 0, s, s);
      speckle(g, s, '#d8be84', rng, 30, 0.1);
      g.fillStyle = '#efd9a4';
      g.fillRect(0, 0, s, 1);
      g.fillRect(0, 0, 1, s);
      g.fillStyle = '#a88a52';
      g.fillRect(0, s - 1, s, 1);
      g.fillRect(s - 1, 0, 1, s);
    });
    layout.forEach((pos, index) => {
      const material = this.material({ map: stone, emissive: 0x000000 });
      const m = this.mesh(new THREE.BoxGeometry(1.05, 0.55, 1.05), material);
      m.position.set(pos.x, 0.355, pos.z);
      m.userData.blockIndex = index;
      this.blocks.push({ mesh: m, material, lift: 0, baseY: 0.355, kind: null });
    });
  }

  // ---------- estado ----------
  get pickables() {
    return this.blocks.map((b) => b.mesh);
  }

  lightBlock(i, kind) {
    const b = this.blocks[i];
    if (!b || this.disposed) return;
    b.kind = kind;
    if (kind) {
      b.material.emissive.setHex(BLOCK_COLORS[kind]);
      b.material.emissiveIntensity = 0.85;
      b.lift = kind === 'error' ? 0.05 : 0.32;
      this.blockLight.color.setHex(BLOCK_COLORS[kind]);
      this.blockLight.intensity = 9;
      this.blockLight.position.x = b.mesh.position.x;
      this.blockLight.position.z = b.mesh.position.z;
    } else {
      b.material.emissive.setHex(0x000000);
      b.lift = 0;
      if (this.blocks.every((x) => !x.kind)) this.blockLight.intensity = 0;
    }
  }

  setAllBlocks(kind) {
    this.blocks.forEach((_, i) => this.lightBlock(i, kind));
    if (kind) {
      this.blockLight.position.set(-1.5, 2.5, -0.3);
      this.blockLight.distance = 12;
    } else {
      this.blockLight.distance = 5;
    }
  }

  setDoorOpen(p) {
    this.doorPivot.rotation.y = p * 1.85;
  }

  setOpacity(a) {
    for (const m of this.materials) {
      m.transparent = true;
      m.opacity = a;
      m.depthWrite = a > 0.98;
    }
    for (const l of this.lights) l.intensity = (l.userData.base ?? l.intensity) * a;
  }

  update(dt) {
    if (this.disposed) return;
    this.time += dt;
    for (const t of this.torches) {
      const f = Math.sin(this.time * 13 + t.seed) * 0.6 + Math.sin(this.time * 7.3 + t.seed * 2) * 0.4;
      t.light.intensity = (7 + f * 1.2) * (this.materials[0].opacity ?? 1);
      t.flame.scale.y = 1 + f * 0.15;
    }
    for (const b of this.blocks) {
      const target = b.baseY + b.lift;
      b.mesh.position.y += (target - b.mesh.position.y) * Math.min(1, dt * 14);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.group);
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.lights.forEach((l) => l.dispose?.());
  }
}
