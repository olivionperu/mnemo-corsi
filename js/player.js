// Kevin: programador junior vóxel con hoodie, lentes y su laptop siempre encendida.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  return m;
}

export function createPlayer() {
  const hoodie = lambert(0x4f63a8);
  const hoodieDark = lambert(0x3a4a82);
  const skin = lambert(0xe8b98f);
  const hair = lambert(0x2a1d16);
  const jeans = lambert(0x2f3a5a);
  const shoes = lambert(0xeeeeee);
  const black = lambert(0x15121f);
  const lens = new THREE.MeshLambertMaterial({ color: 0xbfefff, emissive: 0x5fb8d0, emissiveIntensity: 0.5 });
  const silver = lambert(0xb8bcc8);
  const screen = new THREE.MeshLambertMaterial({ color: 0x8ff0e2, emissive: 0x4fd0c0, emissiveIntensity: 1.3 });
  const heart = new THREE.MeshBasicMaterial({ color: 0xff7eb6 });

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.55, 0);
    const thigh = box(0.22, 0.45, 0.24, jeans);
    thigh.position.y = -0.2;
    const shoe = box(0.25, 0.13, 0.32, shoes);
    shoe.position.set(0, -0.48, 0.04);
    leg.add(thigh, shoe);
    return leg;
  };
  const legL = makeLeg(-0.15);
  const legR = makeLeg(0.15);

  const torso = box(0.64, 0.62, 0.4, hoodie);
  torso.position.y = 0.86;
  const pocket = box(0.4, 0.14, 0.02, hoodieDark);
  pocket.position.set(0, 0.7, 0.21);
  const hood = box(0.5, 0.16, 0.18, hoodieDark); // capucha caída en la espalda
  hood.position.set(0, 1.12, -0.22);
  const stringL = box(0.03, 0.16, 0.02, shoes);
  stringL.position.set(-0.08, 1.04, 0.21);
  const stringR = stringL.clone();
  stringR.position.x = 0.08;

  const head = new THREE.Group();
  head.position.y = 1.44;
  const face = box(0.5, 0.46, 0.46, skin);
  const hairTop = box(0.54, 0.14, 0.5, hair);
  hairTop.position.set(0, 0.24, -0.01);
  const fringe = box(0.54, 0.08, 0.1, hair);
  fringe.position.set(0, 0.15, 0.21);
  const hairBack = box(0.54, 0.34, 0.08, hair);
  hairBack.position.set(0, 0.06, -0.24);
  // Lentes de programador
  const frame = box(0.46, 0.04, 0.03, black);
  frame.position.set(0, 0.04, 0.245);
  const lensL = box(0.15, 0.11, 0.02, lens);
  lensL.position.set(-0.11, -0.01, 0.25);
  const lensR = lensL.clone();
  lensR.position.x = 0.11;
  const pupilL = box(0.05, 0.06, 0.02, black);
  pupilL.position.set(-0.11, -0.01, 0.262);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.11;
  head.add(face, hairTop, fringe, hairBack, frame, lensL, lensR, pupilL, pupilR);

  // Los brazos sostienen la laptop hacia adelante.
  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.08, 0);
    const sleeve = box(0.18, 0.5, 0.2, hoodie);
    sleeve.position.y = -0.22;
    const hand = box(0.16, 0.12, 0.18, skin);
    hand.position.y = -0.5;
    arm.add(sleeve, hand);
    arm.rotation.x = -0.9;
    return arm;
  };
  const armL = makeArm(-0.42);
  const armR = makeArm(0.42);

  const laptop = new THREE.Group();
  laptop.position.set(0, 0.86, 0.5);
  const base = box(0.6, 0.04, 0.38, silver);
  // La tapa va en el borde lejano: la pantalla mira a Kevin y la cámara ve
  // la tapa trasera con un sticker de corazón.
  const lid = new THREE.Group();
  lid.position.set(0, 0.02, 0.18);
  lid.rotation.x = 0.25;
  const lidBack = box(0.6, 0.38, 0.03, silver);
  lidBack.position.set(0, 0.19, 0);
  const display = box(0.54, 0.32, 0.01, screen);
  display.position.set(0, 0.19, -0.02);
  const sticker = box(0.12, 0.1, 0.01, heart);
  sticker.position.set(0, 0.2, 0.02);
  lid.add(lidBack, display, sticker);
  const glow = new THREE.PointLight(0x8ff0e2, 2.4, 4, 1.5);
  glow.position.set(0, 0.3, -0.2);
  laptop.add(base, lid, glow);

  body.add(legL, legR, torso, pocket, hood, stringL, stringR, head, armL, armR, laptop);

  let t = 0;
  let phase = 0;
  let walking = false;
  let cheerT = -1;
  let sadT = -1;
  let onStep = null;
  let lastStepSign = 1;

  function update(dt) {
    t += dt;
    let y = 0;
    if (walking) {
      phase += dt * 9;
      const s = Math.sin(phase);
      legL.rotation.x = s * 0.7;
      legR.rotation.x = -s * 0.7;
      y = Math.abs(s) * 0.06;
      const sign = Math.sign(s);
      if (sign !== lastStepSign && onStep) onStep();
      lastStepSign = sign;
    } else {
      const k = Math.min(1, dt * 10);
      legL.rotation.x -= legL.rotation.x * k;
      legR.rotation.x -= legR.rotation.x * k;
      y = Math.sin(t * 2.2) * 0.025;
    }

    // Por defecto: mira la laptop y teclea un poco.
    let armX = -0.9 + Math.sin(t * 14) * (walking ? 0 : 0.04);
    let laptopY = 0.86;
    head.rotation.x = 0.12;

    if (cheerT >= 0) {
      cheerT += dt;
      const k = Math.min(1, cheerT / 0.8);
      const arc = Math.sin(Math.PI * k);
      y += arc * 0.55;
      armX = -0.9 - arc * 1.9;
      laptopY += arc * 0.6;
      head.rotation.x = 0.12 - arc * 0.4;
      if (k >= 1) cheerT = -1;
    }

    if (sadT >= 0) {
      sadT += dt;
      const k = Math.min(1, sadT / 1.2);
      const drop = Math.sin(Math.PI * k);
      head.rotation.x = 0.12 + drop * 0.45;
      head.rotation.y = Math.sin(sadT * 24) * 0.3 * (1 - k);
      armX = -0.9 + drop * 0.5;
      laptopY -= drop * 0.2;
      if (k >= 1) {
        sadT = -1;
        head.rotation.y = 0;
      }
    }

    armL.rotation.x = armX;
    armR.rotation.x = armX;
    laptop.position.y = laptopY;
    body.position.y = y;
  }

  return {
    group,
    update,
    setWalking(v, stepCallback = null) {
      walking = v;
      onStep = stepCallback;
    },
    cheer() { cheerT = 0; sadT = -1; },
    shake() { sadT = 0; cheerT = -1; },
    reset(x, z) {
      group.position.set(x, 0, z);
      group.rotation.y = 0;
      walking = false;
      cheerT = sadT = -1;
      head.rotation.set(0.12, 0, 0);
    },
  };
}
