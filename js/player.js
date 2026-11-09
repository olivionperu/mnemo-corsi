// Mnemo: personaje vóxel hecho con cajas, con animaciones de caminar, festejar y negar.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  return m;
}

export function createPlayer() {
  const cloak = lambert(0xe0a43a);
  const cloakDark = lambert(0xb27a22);
  const skin = lambert(0xf1c9a0);
  const pants = lambert(0x4b3f72);
  const boots = lambert(0x2a2238);
  const eye = lambert(0x1c1830);
  const lamp = new THREE.MeshLambertMaterial({ color: 0xffe08a, emissive: 0xffc24a, emissiveIntensity: 1.4 });

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const makeLeg = (x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.55, 0);
    const thigh = box(0.22, 0.45, 0.24, pants);
    thigh.position.y = -0.2;
    const boot = box(0.24, 0.14, 0.3, boots);
    boot.position.set(0, -0.48, 0.03);
    leg.add(thigh, boot);
    return leg;
  };
  const legL = makeLeg(-0.15);
  const legR = makeLeg(0.15);

  const torso = box(0.62, 0.6, 0.38, cloak);
  torso.position.y = 0.85;
  const belt = box(0.64, 0.08, 0.4, cloakDark);
  belt.position.y = 0.6;

  const head = new THREE.Group();
  head.position.y = 1.42;
  const face = box(0.5, 0.46, 0.46, skin);
  const hood = box(0.58, 0.22, 0.54, cloak);
  hood.position.set(0, 0.24, -0.03);
  const hoodBack = box(0.58, 0.5, 0.14, cloak);
  hoodBack.position.set(0, 0.02, -0.24);
  const hoodSideL = box(0.06, 0.4, 0.5, cloak);
  hoodSideL.position.set(-0.28, 0.02, -0.02);
  const hoodSideR = hoodSideL.clone();
  hoodSideR.position.x = 0.28;
  const eyeL = box(0.08, 0.11, 0.02, eye);
  eyeL.position.set(-0.11, 0, 0.235);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.11;
  head.add(face, hood, hoodBack, hoodSideL, hoodSideR, eyeL, eyeR);

  const makeArm = (x) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.08, 0);
    const sleeve = box(0.18, 0.5, 0.2, cloak);
    sleeve.position.y = -0.22;
    const hand = box(0.16, 0.12, 0.18, skin);
    hand.position.y = -0.5;
    arm.add(sleeve, hand);
    return arm;
  };
  const armL = makeArm(-0.41);
  const armR = makeArm(0.41);

  // Linterna: la memoria ilumina el camino.
  const lantern = new THREE.Group();
  lantern.position.set(0, -0.62, 0.05);
  const handle = box(0.04, 0.1, 0.04, boots);
  handle.position.y = 0.02;
  const glass = box(0.18, 0.2, 0.18, lamp);
  glass.position.y = -0.12;
  const lanternLight = new THREE.PointLight(0xffc24a, 2.2, 4, 1.5);
  lanternLight.position.y = -0.12;
  lantern.add(handle, glass, lanternLight);
  armR.add(lantern);

  body.add(legL, legR, torso, belt, head, armL, armR);

  let t = 0;
  let phase = 0;
  let walking = false;
  let cheerT = -1;
  let shakeT = -1;
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
      armL.rotation.x = -s * 0.6;
      armR.rotation.x = s * 0.5;
      y = Math.abs(s) * 0.06;
      const sign = Math.sign(s);
      if (sign !== lastStepSign && onStep) onStep();
      lastStepSign = sign;
    } else {
      const k = Math.min(1, dt * 10);
      legL.rotation.x -= legL.rotation.x * k;
      legR.rotation.x -= legR.rotation.x * k;
      armL.rotation.x -= armL.rotation.x * k;
      armR.rotation.x -= armR.rotation.x * k;
      y = Math.sin(t * 2.2) * 0.025;
    }

    if (cheerT >= 0) {
      cheerT += dt;
      const k = Math.min(1, cheerT / 0.75);
      const arc = Math.sin(Math.PI * k);
      y += arc * 0.55;
      armL.rotation.z = -2.6 * arc;
      armR.rotation.z = 2.6 * arc;
      if (k >= 1) {
        cheerT = -1;
        armL.rotation.z = armR.rotation.z = 0;
      }
    }

    if (shakeT >= 0) {
      shakeT += dt;
      const k = Math.min(1, shakeT / 0.8);
      head.rotation.y = Math.sin(shakeT * 28) * 0.45 * (1 - k);
      if (k >= 1) {
        shakeT = -1;
        head.rotation.y = 0;
      }
    }
    body.position.y = y;
  }

  return {
    group,
    update,
    setWalking(v, stepCallback = null) {
      walking = v;
      onStep = stepCallback;
    },
    cheer() { cheerT = 0; },
    shake() { shakeT = 0; },
    reset(x, z) {
      group.position.set(x, 0, z);
      group.rotation.y = 0;
      walking = false;
      cheerT = shakeT = -1;
      head.rotation.y = 0;
      armL.rotation.z = armR.rotation.z = 0;
    },
  };
}
