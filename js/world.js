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

// Una paleta por recuerdo de la relación (ver story.js): del café de la primera cita
// al verde de terminal del "servidor del olvido".
export const PALETTES = [
  { floor: '#9a6b4f', grout: '#74503a', wall: '#7a5a6a', mortar: '#56404c', board: '#5c3f33', bg: '#1e1418', torch: '#ffc46b' },
  { floor: '#3f4f80', grout: '#2c385e', wall: '#3b3a6e', mortar: '#29284f', board: '#2a3358', bg: '#0c0d22', torch: '#7fb8ff' },
  { floor: '#c27a9a', grout: '#965c76', wall: '#9a5f86', mortar: '#6e4260', board: '#7a4562', bg: '#20101c', torch: '#ffb3d9' },
  { floor: '#5d3f7a', grout: '#432c5a', wall: '#6a3a7a', mortar: '#4a2856', board: '#3e2a55', bg: '#140a1e', torch: '#ff6ad5' },
  { floor: '#8c4a44', grout: '#663430', wall: '#7a3a3a', mortar: '#552626', board: '#5c302c', bg: '#1c0c0c', torch: '#ff7a5a' },
  { floor: '#6e6e74', grout: '#505056', wall: '#5a5a66', mortar: '#3e3e48', board: '#46464e', bg: '#121216', torch: '#d8d8e8' },
  { floor: '#b06a6a', grout: '#844e4e', wall: '#7a4a8a', mortar: '#583466', board: '#6a3e5a', bg: '#1a0e1e', torch: '#ffb07a' },
  { floor: '#24402e', grout: '#182c20', wall: '#1e3326', mortar: '#13241a', board: '#163020', bg: '#050c08', torch: '#5cff8a' },
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

const BLOCK_COLORS = { show: 0x8ff0e2, tap: 0xf6d365, error: 0xf0605a, win: 0x9cf07a, hint: 0xff7eb6 };
const BLOCK_LIFT = { show: 0.32, tap: -0.12, error: 0.05, win: 0.32, hint: 0.2 };

// Corazón de 7x6 píxeles que decora cada caja de recuerdos.
const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];

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
      HEART.forEach((row, y) => [...row].forEach((bit, x) => {
        if (bit === '1') {
          g.fillStyle = y === 1 && x === 1 ? '#ff9ec4' : '#c8405e';
          g.fillRect(4 + x, 5 + y, 1, 1);
        }
      }));
      // grieta: el corazón está roto
      g.fillStyle = '#d8be84';
      [[7, 5], [6, 6], [7, 7], [7, 8], [8, 9]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
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
      b.lift = BLOCK_LIFT[kind];
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

  // Posición en el mundo del centro de la puerta (para las partículas).
  get doorWorldPosition() {
    return new THREE.Vector3(DOOR_X, DOOR_H / 2, this.backZ);
  }

  blockWorldPosition(i) {
    const m = this.blocks[i].mesh;
    return new THREE.Vector3(m.position.x, m.position.y + 0.4, this.z + m.position.z);
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
