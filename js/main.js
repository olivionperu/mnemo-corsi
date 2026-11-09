// Punto de entrada: escena, cámara, máquina de estados del juego e interfaz.
import * as THREE from 'three';
import {
  BLOCK_COUNT, START_SPAN, MAX_SPAN, ATTEMPTS_PER_SPAN,
  generateSequence, generateLayout, expectedResponse, evaluateStep, spanRating, summarizeTrials,
} from './corsi.js';
import { Room, DOOR_X, roomCenterZ, playerStartZ, paletteFor } from './world.js';
import { createPlayer } from './player.js';
import { sfx, unlockAudio, isMuted, setMuted } from './audio.js';
import { tween, wait, updateTweens, clearTweens, linear, easeInOut } from './tween.js';
import * as stats from './stats.js';

// ---------------- render pixelado ----------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // sombras de borde duro, acordes al estilo pixel

const scene = new THREE.Scene();
const bgColor = new THREE.Color(paletteFor(0).bg);
scene.background = bgColor;
scene.fog = new THREE.Fog(bgColor, 24, 48);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0xc8d6ff, 0x2a2238, 1.25));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
scene.add(sun, sun.target);

let pixelSize = 3;
let camFocusZ = 0;

function placeCamera(z) {
  const portrait = camera.aspect < 0.85;
  if (portrait) {
    // En vertical se mira casi desde arriba para que la sala ocupe el ancho de la pantalla.
    camera.position.set(-0.4, 19, z + 9);
    camera.lookAt(-0.4, 0, z - 0.2);
  } else {
    camera.position.set(0.6, 12.5, z + 12.5);
    camera.lookAt(0.2, 0, z - 0.9);
  }
  sun.position.set(-6, 15, z + 8);
  sun.target.position.set(0, 0, z);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  pixelSize = w < 700 ? 2 : 3;
  renderer.setSize(Math.max(1, Math.floor(w / pixelSize)), Math.max(1, Math.floor(h / pixelSize)), false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.85 ? 72 : 42;
  camera.updateProjectionMatrix();
  placeCamera(camFocusZ);
}
window.addEventListener('resize', resize);

// ---------------- personaje y salas ----------------
const player = createPlayer();
scene.add(player.group);

function buildRoom(index) {
  return new Room(scene, index, generateLayout(BLOCK_COUNT), START_SPAN + index);
}

const game = {
  state: 'title', // title | showing | input | feedback | transition | over
  mode: 'directo',
  roomIndex: 0,
  span: START_SPAN,
  attempt: 1,
  sequence: [],
  expected: [],
  response: [],
  inputStart: 0,
  trials: [],
  maxSpan: 0,
  token: 0,
  room: null,
  oldRooms: [],
  startedAt: '',
};

function resetWorld() {
  game.room?.dispose();
  game.oldRooms.forEach((r) => r.dispose());
  game.oldRooms = [];
  game.room = buildRoom(0);
  player.reset(DOOR_X, playerStartZ(0));
  camFocusZ = roomCenterZ(0);
  bgColor.set(paletteFor(0).bg);
  placeCamera(camFocusZ);
}

const alive = (token) => token === game.token;

// ---------------- interfaz ----------------
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'),
  title: $('screen-title'),
  over: $('screen-over'),
  msg: $('hud-msg'),
  pips: $('pips'),
};

function setMessage(text, tone = 'info') {
  ui.msg.textContent = text;
  ui.msg.dataset.tone = tone;
}

function setPips(filled, total, active) {
  ui.pips.classList.toggle('idle', !active);
  ui.pips.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('');
}

function updateHud() {
  const pal = paletteFor(game.roomIndex);
  $('hud-room').textContent = String(game.roomIndex + 1);
  $('hud-room-name').textContent = pal.name;
  $('hud-span').textContent = String(game.span);
  $('hud-mode').textContent = game.mode === 'inverso' ? 'orden inverso' : 'orden directo';
  const left = ATTEMPTS_PER_SPAN - game.attempt + 1;
  const att = $('hud-attempts');
  att.setAttribute('aria-label', `Intentos restantes: ${left} de ${ATTEMPTS_PER_SPAN}`);
  att.innerHTML = Array.from({ length: ATTEMPTS_PER_SPAN }, (_, i) => `<i class="${i < left ? '' : 'used'}"></i>`).join('');
}

function renderRecords() {
  const sessions = stats.getSessions().slice(-4).reverse();
  const list = sessions.length
    ? `<ul>${sessions.map((s) => `<li><span>${new Date(s.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}, ${s.mode}</span><span>${s.span} bloques</span></li>`).join('')}</ul>
       <button class="link-btn" type="button" id="btn-csv-title">Descargar mis datos (CSV)</button>`
    : '<p>Aún no tienes partidas. Tu primera amplitud aparecerá aquí.</p>';
  $('records').innerHTML = `
    <div class="best">
      <div>Récord directo<strong>${stats.getBest('directo') || '–'}</strong></div>
      <div>Récord inverso<strong>${stats.getBest('inverso') || '–'}</strong></div>
    </div>${list}`;
  $('btn-csv-title')?.addEventListener('click', stats.downloadCSV);
}

function showTitle() {
  game.token++;
  clearTweens();
  game.state = 'title';
  resetWorld();
  ui.hud.hidden = true;
  ui.over.hidden = true;
  ui.title.hidden = false;
  renderRecords();
  ui.title.querySelector('.btn-primary').focus({ preventScroll: true });
}

// ---------------- flujo del juego ----------------
function startGame(mode) {
  unlockAudio();
  sfx.ui();
  game.token++;
  clearTweens();
  resetWorld();
  Object.assign(game, {
    mode, roomIndex: 0, span: START_SPAN, attempt: 1, trials: [], maxSpan: 0,
    startedAt: new Date().toISOString(),
  });
  ui.title.hidden = true;
  ui.over.hidden = true;
  ui.hud.hidden = false;
  updateHud();
  runTrial(game.token);
}

async function runTrial(token) {
  game.state = 'showing';
  game.sequence = generateSequence(game.span, BLOCK_COUNT);
  game.expected = expectedResponse(game.sequence, game.mode);
  game.response = [];
  setMessage('Observa la secuencia');
  setPips(0, game.span, false);
  await wait(1.0);
  // Presentación estándar de Corsi: un bloque por segundo.
  for (const b of game.sequence) {
    if (!alive(token)) return;
    game.room.lightBlock(b, 'show');
    sfx.show();
    await wait(0.7);
    if (!alive(token)) return;
    game.room.lightBlock(b, null);
    await wait(0.3);
  }
  if (!alive(token)) return;
  game.state = 'input';
  game.inputStart = performance.now();
  setMessage(game.mode === 'inverso' ? 'Tu turno: tócalos al revés' : 'Tu turno: tócalos en el mismo orden', 'go');
  setPips(0, game.span, true);
}

function pickBlock(index) {
  if (game.state !== 'input') return;
  const room = game.room;
  game.response.push(index);
  setPips(game.response.length, game.span, true);
  const result = evaluateStep(game.expected, game.response);
  if (result === 'error') {
    room.lightBlock(index, 'error');
    wait(0.5).then(() => room.lightBlock(index, null));
    finishTrial(false);
    return;
  }
  sfx.tap();
  room.lightBlock(index, 'tap');
  wait(0.28).then(() => room.lightBlock(index, null));
  if (result === 'complete') finishTrial(true);
}

async function finishTrial(correct) {
  const token = game.token;
  game.state = 'feedback';
  game.trials.push({
    room: game.roomIndex + 1,
    span: game.span,
    attempt: game.attempt,
    correct,
    rtMs: Math.round(performance.now() - game.inputStart),
    sequence: game.sequence.map((n) => n + 1).join('-'),
    response: game.response.map((n) => n + 1).join('-'),
  });

  if (correct) {
    game.maxSpan = game.span;
    sfx.success();
    player.cheer();
    await wait(0.3);
    if (!alive(token)) return;
    game.room.setAllBlocks('win');
    setMessage(game.span >= MAX_SPAN ? '¡Recordaste las 9 piedras!' : '¡Correcto! La puerta se abre', 'ok');
    await wait(0.5);
    if (!alive(token)) return;
    game.room.setAllBlocks(null);
    if (game.span >= MAX_SPAN) {
      sfx.door();
      await tween(0.9, (p) => game.room.setDoorOpen(p));
      if (!alive(token)) return;
      sfx.win();
      await wait(0.6);
      if (alive(token)) endGame(true);
      return;
    }
    await advanceRoom(token);
    if (!alive(token)) return;
    game.span++;
    game.attempt = 1;
    updateHud();
    runTrial(token);
    return;
  }

  sfx.fail();
  player.shake();
  game.attempt++;
  updateHud();
  if (game.attempt > ATTEMPTS_PER_SPAN) {
    setMessage('Se acabaron los intentos de esta sala', 'bad');
    await wait(1.6);
    if (alive(token)) endGame(false);
    return;
  }
  setMessage('No era ese bloque. Te queda un intento', 'bad');
  await wait(1.8);
  if (alive(token)) runTrial(token);
}

async function advanceRoom(token) {
  game.state = 'transition';
  setMessage('Mnemo avanza a la siguiente sala');
  setPips(0, 0, false);
  const old = game.room;
  const nextIndex = game.roomIndex + 1;
  const next = buildRoom(nextIndex);
  game.oldRooms.push(old);

  sfx.door();
  await tween(0.9, (p) => old.setDoorOpen(p));
  if (!alive(token)) return;
  await tween(0.3, (p) => { player.group.rotation.y = Math.PI * p; });
  if (!alive(token)) return;

  const z0 = player.group.position.z;
  const z1 = playerStartZ(nextIndex);
  const c0 = roomCenterZ(old.index);
  const c1 = roomCenterZ(nextIndex);
  const bg0 = new THREE.Color(old.pal.bg);
  const bg1 = new THREE.Color(next.pal.bg);
  let faded = false;
  player.setWalking(true, sfx.step);
  await tween((z0 - z1) / 3.4, (p) => {
    player.group.position.z = z0 + (z1 - z0) * p;
    camFocusZ = c0 + (c1 - c0) * easeInOut(p);
    placeCamera(camFocusZ);
    bgColor.copy(bg0).lerp(bg1, p);
    // Al cruzar la puerta, la sala anterior se desvanece para no tapar la vista.
    if (!faded && player.group.position.z < old.backZ - 0.5) {
      faded = true;
      tween(0.7, (q) => old.setOpacity(1 - q), linear).then(() => {
        old.dispose();
        game.oldRooms = game.oldRooms.filter((r) => r !== old);
      });
    }
  }, linear);
  player.setWalking(false);
  if (!alive(token)) return;
  game.room = next;
  game.roomIndex = nextIndex;
  await tween(0.3, (p) => { player.group.rotation.y = Math.PI * (1 - p); });
}

function endGame(won) {
  game.state = 'over';
  const summary = summarizeTrials(game.trials);
  const isRecord = stats.recordSession({
    date: game.startedAt,
    mode: game.mode,
    span: game.maxSpan,
    won,
    trials: game.trials,
  });
  ui.hud.hidden = true;
  $('over-kicker').textContent = won ? 'Llegaste al núcleo de la memoria' : 'Fin del viaje';
  $('over-span').textContent = String(game.maxSpan);
  $('over-rating').textContent = game.maxSpan >= START_SPAN
    ? `${spanRating(game.maxSpan)} (orden ${game.mode}).`
    : 'Aún no superas la primera sala. Prueba otra vez con calma.';
  $('over-record').hidden = !isRecord || game.maxSpan === 0;
  $('over-rooms').textContent = String(Math.max(0, game.maxSpan - START_SPAN + 1));
  $('over-accuracy').textContent = `${summary.accuracy}%`;
  $('over-rt').textContent = `${(summary.meanRtMs / 1000).toFixed(1)} s`;
  ui.over.hidden = false;
  $('btn-again').focus({ preventScroll: true });
}

// ---------------- entrada ----------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function blockAt(event) {
  if (!game.room) return null;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(game.room.pickables, false)[0];
  return hit ? hit.object.userData.blockIndex : null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (game.state !== 'input') return;
  const index = blockAt(e);
  if (index !== null) pickBlock(index);
});
canvas.addEventListener('pointermove', (e) => {
  canvas.style.cursor = game.state === 'input' && blockAt(e) !== null ? 'pointer' : 'default';
});

document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => startGame(btn.dataset.mode));
});
$('btn-again').addEventListener('click', () => startGame(game.mode));
$('btn-home').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-exit').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-csv').addEventListener('click', stats.downloadCSV);

const muteBtn = $('btn-mute');
function syncMute() {
  muteBtn.setAttribute('aria-pressed', String(isMuted()));
  muteBtn.setAttribute('aria-label', isMuted() ? 'Activar sonido' : 'Silenciar sonido');
}
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); });
syncMute();

// Ayuda para pruebas automáticas y para la demostración en clase.
window.__mnemo = { game, pickBlock, camera };

// ---------------- bucle principal ----------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  game.room?.update(dt);
  game.oldRooms.forEach((r) => r.update(dt));
  player.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resize();
showTitle();
frame();
