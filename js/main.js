// Punto de entrada: escena, cámara, máquina de estados del juego e interfaz.
import * as THREE from 'three';
import {
  BLOCK_COUNT, START_SPAN, MAX_SPAN, ATTEMPTS_PER_SPAN,
  generateSequence, generateLayout, expectedResponse, evaluateStep, spanRating, summarizeTrials,
} from './corsi.js';
import { Room, DOOR_X, roomCenterZ, playerStartZ, paletteFor } from './world.js';
import { createPlayer } from './player.js';
import { Particles, Shake } from './fx.js';
import { sfx, music, unlockAudio, isMuted, setMuted } from './audio.js';
import { tween, wait, updateTweens, clearTweens, linear, easeInOut } from './tween.js';
import { MEMORIES, SUCCESS_LINES, ERROR_LINES, CHAOS_MESSAGES, PRACTICE, ENDINGS, pick, makeBag } from './story.js';
import { SUS_ITEMS, susScore, susLabel } from './sus.js';
import { Cinema } from './cinematics.js';
import * as stats from './stats.js';

const $ = (id) => document.getElementById(id);

// ---------------- render pixelado ----------------
const canvas = $('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  $('loader-text').textContent = 'Tu navegador no tiene WebGL activado. Prueba con Chrome o Edge actualizados.';
  throw new Error('WebGL no disponible');
}
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // sombras de borde duro, acordes al estilo pixel

const scene = new THREE.Scene();
const bgColor = new THREE.Color(paletteFor(0).bg);
scene.background = bgColor;
scene.fog = new THREE.Fog(bgColor, 24, 48);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0xd8d0ff, 0x2a1f30, 1.25));
const sun = new THREE.DirectionalLight(0xfff1e0, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
scene.add(sun, sun.target);

const particles = new Particles(scene);
const shake = new Shake();
let camFocusZ = 0;
// Cámara de cine: camZoom acerca la toma (0 = normal) y 'orbit' gira alrededor de Kevin.
const cam = { zoom: 0, mode: 'normal', angle: 0 };
const camTarget = new THREE.Vector3();

function placeCamera(z) {
  if (cam.mode === 'menu') {
    // Toma de portada: Kevin en primer plano, a la derecha en escritorio y arriba en el celular.
    const k = player.group.position;
    const portrait = camera.aspect < 0.85;
    const a = Math.sin(clock.elapsedTime * 0.25) * 0.35 - 0.15;
    const r = portrait ? 7.4 : 5.6;
    camera.position.set(k.x + Math.sin(a) * r, portrait ? 3.2 : 2.2, k.z + Math.cos(a) * r);
    const shift = portrait ? 0 : 2.6; // desplaza el encuadre para dejar sitio al menú
    camTarget.set(k.x - Math.cos(a) * shift, portrait ? -1.5 : 1.6, k.z + Math.sin(a) * shift);
    camera.lookAt(camTarget);
    sun.position.set(k.x - 6, 15, k.z + 8);
    sun.target.position.set(k.x, 0, k.z);
    return;
  }
  if (cam.mode === 'orbit') {
    const k = player.group.position;
    const r = camera.aspect < 0.85 ? 6.5 : 4.6;
    camera.position.set(k.x + Math.sin(cam.angle) * r, 2.6, k.z + Math.cos(cam.angle) * r);
    camera.lookAt(k.x, 1.0, k.z);
    return;
  }
  if (camera.aspect < 0.85) {
    // En vertical se mira casi desde arriba para que la sala ocupe el ancho de la pantalla.
    camera.position.set(-0.4, 19, z + 9);
    camera.lookAt(-0.4, 0, z - 0.2);
  } else {
    camera.position.set(0.6, 12.5, z + 12.5);
    camera.lookAt(0.2, 0, z - 0.9);
  }
  if (cam.zoom > 0) {
    camTarget.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(14 * cam.zoom);
    camera.position.add(camTarget);
  }
  sun.position.set(-6, 15, z + 8);
  sun.target.position.set(0, 0, z);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pixelSize = w < 700 ? 2 : 3;
  renderer.setSize(Math.max(1, Math.floor(w / pixelSize)), Math.max(1, Math.floor(h / pixelSize)), false);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 0.85 ? 72 : 42;
  camera.updateProjectionMatrix();
  placeCamera(camFocusZ);
}
window.addEventListener('resize', resize);

// ---------------- personaje, salas y flecha guía ----------------
const player = createPlayer();
scene.add(player.group);

const hintArrow = new THREE.Group();
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xff7eb6 });
  const parts = [[0.12, 0.3, 0.12, 0.35], [0.46, 0.1, 0.12, 0.15], [0.3, 0.1, 0.12, 0.05], [0.12, 0.1, 0.12, -0.05]];
  for (const [w, h, d, y] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = y;
    hintArrow.add(m);
  }
  hintArrow.scale.setScalar(1.6);
  hintArrow.visible = false;
  scene.add(hintArrow);
}

// Corazón roto gigante del menú: dos mitades de vóxeles que se separan y se juntan.
const menuHeart = new THREE.Group();
{
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  const crack = new Set(['3,0', '2,1', '3,2', '3,3', '4,4']);
  const geo = new THREE.BoxGeometry(0.19, 0.19, 0.19);
  const red = new THREE.MeshBasicMaterial({ color: 0xc8405e });
  const pink = new THREE.MeshBasicMaterial({ color: 0xff7eb6 });
  const halves = [new THREE.Group(), new THREE.Group()];
  rows.forEach((row, y) => [...row].forEach((bit, x) => {
    if (bit !== '1' || crack.has(`${x},${y}`)) return;
    const m = new THREE.Mesh(geo, y === 1 && x === 1 ? pink : red);
    m.position.set((x - 3) * 0.19, (2.5 - y) * 0.19, 0);
    // la grieta va en zigzag: lo que queda a su izquierda es la mitad izquierda
    const crackX = [3, 2, 3, 3, 4, 4][y];
    halves[x < crackX ? 0 : 1].add(m);
  }));
  menuHeart.add(...halves);
  menuHeart.userData.halves = halves;
  menuHeart.visible = false;
  scene.add(menuHeart);
}

function updateMenuHeart(t) {
  menuHeart.visible = cam.mode === 'menu';
  if (!menuHeart.visible) return;
  const k = player.group.position;
  menuHeart.position.set(k.x - 0.4, 2.75 + Math.sin(t * 1.6) * 0.1, k.z - 1.2);
  menuHeart.rotation.y = Math.sin(t * 0.5) * 0.3;
  const gap = 0.06 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.12;
  const [left, right] = menuHeart.userData.halves;
  left.position.x = -gap;
  right.position.x = gap;
  left.rotation.z = gap * 0.5;
  right.rotation.z = -gap * 0.5;
}

function buildRoom(index) {
  return new Room(scene, index, generateLayout(BLOCK_COUNT), START_SPAN + index);
}

const game = {
  state: 'title', // title | ready | showing | input | feedback | transition | over
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
  practice: false,
  presenter: false,
  presenterUsed: false,
  participant: '',
  introShown: -1,
};

const cinema = new Cinema();
const alive = (token) => token === game.token;
const inGame = () => ['ready', 'showing', 'input', 'feedback', 'transition', 'cinematic'].includes(game.state);

function resetWorld(index = 0) {
  particles.clear();
  game.room?.dispose();
  game.oldRooms.forEach((r) => r.dispose());
  game.oldRooms = [];
  game.room = buildRoom(index);
  game.roomIndex = index;
  player.reset(DOOR_X, playerStartZ(index));
  camFocusZ = roomCenterZ(index);
  bgColor.set(paletteFor(index).bg);
  hintArrow.visible = false;
}

// ---------------- interfaz ----------------
const ui = {
  hud: $('hud'),
  ready: $('ready-panel'),
  quip: $('quip'),
  msg: $('hud-msg'),
  pips: $('pips'),
  skip: $('btn-skip-practice'),
  exitConfirm: $('exit-confirm'),
  screens: ['screen-title', 'screen-over', 'screen-progress', 'screen-sus'].map($),
};

function showScreen(id) {
  ui.screens.forEach((s) => { s.hidden = s.id !== id; });
  ui.hud.hidden = id !== null;
}

function setMessage(text, tone = 'info') {
  ui.msg.textContent = text;
  ui.msg.dataset.tone = tone;
}

// Mensaje gracioso que aparece unos segundos y se va solo.
let quipTimer = 0;
function showQuip(text, tone = 'ok', seconds = 2.8) {
  clearTimeout(quipTimer);
  ui.quip.textContent = text;
  ui.quip.dataset.tone = tone;
  ui.quip.classList.add('show');
  sfx.quip();
  quipTimer = setTimeout(() => ui.quip.classList.remove('show'), seconds * 1000);
}
function hideQuip() {
  clearTimeout(quipTimer);
  ui.quip.classList.remove('show');
}

function setPips(filled, total, active) {
  ui.pips.classList.toggle('idle', !active);
  ui.pips.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('');
}

function updateHud() {
  const mem = MEMORIES[game.roomIndex];
  $('hud-room').textContent = String(game.roomIndex + 1);
  $('hud-place').textContent = mem.place;
  $('hud-span').textContent = String(game.span);
  $('hud-mode').textContent = game.mode === 'inverso' ? 'orden inverso' : 'orden directo';
  const left = game.practice ? ATTEMPTS_PER_SPAN : ATTEMPTS_PER_SPAN - game.attempt + 1;
  const att = $('hud-attempts');
  att.setAttribute('aria-label', `Intentos restantes: ${left} de ${ATTEMPTS_PER_SPAN}`);
  att.innerHTML = Array.from({ length: ATTEMPTS_PER_SPAN }, (_, i) => `<i class="${i < left ? '' : 'used'}"></i>`).join('');
  $('presenter-badge').hidden = !game.presenter;
  $('chaos-badge').hidden = !game.chaos;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortDate = (iso) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

function renderRecords() {
  const sessions = stats.getSessions().slice(-3).reverse();
  const list = sessions.length
    ? `<ul>${sessions.map((s) => `<li><span>${shortDate(s.date)}, ${s.mode}${s.participant ? `, ${escapeHtml(s.participant)}` : ''}</span><span>${s.span} cajas</span></li>`).join('')}</ul>`
    : '<p>Aún no tienes partidas. Tu primera amplitud aparecerá aquí.</p>';
  $('records').innerHTML = `
    <div class="best">
      <div>Récord directo<strong>${stats.getBest('directo') || '–'}</strong></div>
      <div>Récord inverso<strong>${stats.getBest('inverso') || '–'}</strong></div>
    </div>${list}
    <div class="records-links">
      <button class="link-btn" type="button" id="btn-progress">Ver mi progreso</button>
    </div>`;
  $('btn-progress').addEventListener('click', () => { sfx.ui(); showProgress(); });
}

function showTitle() {
  game.token++;
  clearTweens();
  game.state = 'title';
  cinema.abort();
  Object.assign(cam, { zoom: 0, mode: 'menu' });
  hideQuip();
  clearNotifs();
  hideThought();
  resetWorld(0);
  ui.exitConfirm.hidden = true;
  showScreen('screen-title');
  renderRecords();
  $('participant').value = stats.getParticipant();
}

// ---------------- flujo del juego ----------------
function startGame(mode) {
  unlockAudio();
  music.start();
  sfx.ui();
  game.token++;
  clearTweens();
  cinema.abort();
  Object.assign(cam, { zoom: 0, mode: 'normal' });
  hideQuip();
  clearNotifs();
  hideThought();
  shuffleLines();
  resetWorld(0);
  game.introShown = -1;
  game.participant = $('participant').value.trim();
  stats.setParticipant(game.participant);
  Object.assign(game, {
    mode, span: START_SPAN, attempt: 1, trials: [], maxSpan: 0,
    startedAt: new Date().toISOString(),
    practice: $('opt-practice').checked,
    chaos: $('opt-chaos').checked,
    presenterUsed: game.presenter,
  });
  showScreen(null);
  updateHud();
  showReady(game.token);
}

// Al entrar a un recuerdo nuevo se reproduce la cinemática con la frase de ELLA;
// en los reintentos se pasa directo al botón "Estoy listo".
async function showReady(token) {
  if (!alive(token)) return;
  hintArrow.visible = false;
  ui.ready.hidden = true;
  updateHud();
  if (!game.practice && game.introShown !== game.roomIndex) {
    game.state = 'cinematic';
    game.introShown = game.roomIndex;
    setMessage('');
    setPips(0, 0, false);
    // Acercamiento lento de cámara mientras se lee la frase (se corta si se salta la escena).
    tween(5, (p) => { if (game.state === 'cinematic') cam.zoom = 0.3 * (1 - p); }, easeInOut);
    await cinema.roomIntro(MEMORIES[game.roomIndex], game.roomIndex + 1, MEMORIES.length, {
      onLie: () => think('?!', 2),
      onTruth: () => think('heart', 2.6),
    });
    if (!alive(token)) return;
    cam.zoom = 0;
  }
  game.state = 'ready';
  $('ready-kicker').textContent = game.practice
    ? 'Práctica guiada'
    : `Recuerdo ${game.roomIndex + 1} de ${MEMORIES.length}: ${MEMORIES[game.roomIndex].place}`;
  $('ready-text').hidden = !game.practice;
  $('ready-text').textContent = game.mode === 'inverso' ? PRACTICE.introInverse : PRACTICE.intro;
  ui.ready.hidden = false;
  ui.skip.hidden = !game.practice;
  setMessage('');
  setPips(0, game.span, false);
  $('btn-ready').focus({ preventScroll: true });
}

function onReady() {
  if (game.state !== 'ready') return;
  unlockAudio();
  sfx.ui();
  ui.ready.hidden = true;
  runTrial(game.token);
}

async function runFinale(won, token) {
  game.state = 'cinematic';
  hintArrow.visible = false;
  hideQuip();
  ui.hud.hidden = true;
  cam.mode = 'orbit';
  cam.angle = 0.6;
  tween(14, (p) => { cam.angle = 0.6 - p * 1.6; }, linear);
  await cinema.finale(won, {
    onWin: () => {
      think('!', 2.5);
      player.cheer();
      sfx.win();
      const k = player.group.position;
      particles.burst(new THREE.Vector3(k.x, 1.6, k.z), { count: 80, colors: [0xff7eb6, 0xf6d365, 0x9cf07a, 0x8ff0e2], speed: 4, up: 6, life: 1.8 });
    },
    onLose: () => { player.shake(); think('…', 3); },
  });
  cam.mode = 'normal';
  return alive(token);
}

async function runTrial(token) {
  game.state = 'showing';
  game.sequence = generateSequence(game.span, BLOCK_COUNT);
  game.expected = expectedResponse(game.sequence, game.mode);
  game.response = [];
  setMessage('Observa las cajas');
  setPips(0, game.span, false);
  await wait(0.7);
  const chaosAt = game.chaos ? chaosSlots(game.sequence.length) : new Set();
  // Presentación estándar de Corsi: un bloque por segundo.
  for (const [i, b] of game.sequence.entries()) {
    if (!alive(token)) return;
    if (chaosAt.has(i)) chaosNotify();
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
  setMessage(game.mode === 'inverso' ? 'Tu turno: tócalas al revés' : 'Tu turno: tócalas en el mismo orden', 'go');
  setPips(0, game.span, true);
  updateHint();
  if (game.chaos) {
    wait(0.8 + Math.random() * 1.5).then(() => {
      if (alive(token) && game.state === 'input') chaosNotify();
    });
  }
}

// ---------------- modo caos ----------------
// Elige 1 o 2 momentos de la secuencia para que ELLA interrumpa.
function chaosSlots(length) {
  const count = length <= 3 ? 1 : 2;
  const slots = new Set();
  while (slots.size < count) slots.add(Math.floor(Math.random() * length));
  return slots;
}

// Frases sin repetición: cada partida nueva vuelve a barajar.
const lines = {};
function shuffleLines() {
  lines.success = makeBag(SUCCESS_LINES);
  lines.error = makeBag(ERROR_LINES);
  lines.chaos = makeBag(CHAOS_MESSAGES);
}
shuffleLines();

function chaosNotify() {
  const box = $('notifs');
  const text = lines.chaos();
  const n = document.createElement('div');
  n.className = 'notif';
  n.innerHTML = '<span class="avatar"></span><strong>ELLA <small>ahora</small></strong><p></p>';
  n.querySelector('p').textContent = text;
  box.prepend(n);
  while (box.children.length > 3) box.lastChild.remove();
  requestAnimationFrame(() => n.classList.add('in'));
  sfx.notify();
  if (Math.random() < 0.5) think(pick(['?!', '…']), 1.3);
  setTimeout(() => n.classList.add('out'), 2400);
  setTimeout(() => n.remove(), 2800);
}

function clearNotifs() {
  $('notifs').innerHTML = '';
}

// ---------------- burbuja de pensamiento ----------------
const HEART_ROWS = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
const HEART_CRACK = new Set(['3,0', '2,1', '3,2', '3,3', '4,4']);
const BROKEN_HEART = `<svg viewBox="0 0 7 6" width="28" height="24" shape-rendering="crispEdges">${
  HEART_ROWS.flatMap((row, y) => [...row].map((bit, x) => (bit === '1' && !HEART_CRACK.has(`${x},${y}`)
    ? `<rect x="${x}" y="${y}" width="1" height="1" fill="#c8405e"/>` : ''))).join('')
}</svg>`;
const thought = { el: $('thought'), until: 0, pos: new THREE.Vector3() };

function think(kind, seconds = 1.8) {
  if (kind === 'heart') thought.el.innerHTML = BROKEN_HEART;
  else thought.el.textContent = kind;
  thought.el.classList.add('show');
  thought.until = clock.elapsedTime + seconds;
}

function hideThought() {
  thought.until = 0;
  thought.el.classList.remove('show');
}

function updateThought() {
  if (!thought.until) return;
  if (clock.elapsedTime > thought.until) {
    hideThought();
    return;
  }
  thought.pos.copy(player.group.position);
  thought.pos.y += 2.25;
  thought.pos.x += 0.35;
  thought.pos.project(camera);
  thought.el.style.left = `${((thought.pos.x + 1) / 2) * window.innerWidth}px`;
  thought.el.style.top = `${((1 - thought.pos.y) / 2) * window.innerHeight}px`;
}

function updateHint() {
  const show = game.state === 'input' && (game.practice || game.presenter) && game.response.length < game.expected.length;
  hintArrow.visible = show;
  if (show) {
    const pos = game.room.blockWorldPosition(game.expected[game.response.length]);
    hintArrow.position.set(pos.x, 1.4, pos.z);
  }
}

function pickBlock(index) {
  if (game.state !== 'input') return;
  const room = game.room;
  game.response.push(index);
  setPips(game.response.length, game.span, true);
  const result = evaluateStep(game.expected, game.response);
  if (result === 'error') {
    room.lightBlock(index, 'error');
    particles.burst(room.blockWorldPosition(index), { count: 10, colors: [0x6a5a70, 0x4b3a50], speed: 2, up: 3, life: 0.8 });
    wait(0.6).then(() => room.lightBlock(index, null));
    hintArrow.visible = false;
    if (game.practice) practiceFailed();
    else finishTrial(false);
    return;
  }
  sfx.tap();
  room.lightBlock(index, 'tap');
  particles.burst(room.blockWorldPosition(index), { count: 6, colors: [0xf6d365, 0xffffff], speed: 1.5, up: 2.5, life: 0.5 });
  wait(0.25).then(() => room.lightBlock(index, null));
  updateHint();
  if (result === 'complete') {
    if (game.practice) practicePassed();
    else finishTrial(true);
  }
}

async function practicePassed() {
  const token = game.token;
  game.state = 'feedback';
  sfx.success();
  player.cheer();
  setMessage(PRACTICE.done, 'ok');
  await wait(2.4);
  if (!alive(token)) return;
  game.practice = false;
  showReady(token);
}

async function practiceFailed() {
  const token = game.token;
  game.state = 'feedback';
  sfx.fail();
  player.shake();
  setMessage(PRACTICE.retry, 'hint');
  await wait(1.6);
  if (alive(token)) runTrial(token);
}

function skipPractice() {
  if (!game.practice || !inGame()) return;
  sfx.ui();
  game.token++;
  clearTweens();
  game.room.setAllBlocks(null);
  game.practice = false;
  showReady(game.token);
}

async function replayCorrect(token) {
  setMessage(game.mode === 'inverso' ? 'Así tenías que tocarlas (al revés):' : 'Así era la secuencia:', 'hint');
  await wait(0.5);
  for (const b of game.expected) {
    if (!alive(token)) return;
    game.room.lightBlock(b, 'hint');
    await wait(0.45);
    if (!alive(token)) return;
    game.room.lightBlock(b, null);
    await wait(0.15);
  }
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
    setMessage('¡Correcto!', 'ok');
    showQuip(lines.success(), 'ok');
    think('!', 1.4);
    await wait(1.2);
    if (!alive(token)) return;
    game.room.setAllBlocks(null);
    if (game.span >= MAX_SPAN) {
      await openDoor(token, true);
      if (!alive(token)) return;
      await wait(0.6);
      if (alive(token) && await runFinale(true, token)) endGame(true);
      return;
    }
    await advanceRoom(token);
    if (!alive(token)) return;
    game.span++;
    game.attempt = 1;
    showReady(token);
    return;
  }

  sfx.fail();
  shake.kick(0.35);
  player.shake();
  setMessage('Ese no era', 'bad');
  showQuip(lines.error(), 'bad');
  think('heart', 2);
  await wait(1.3);
  if (!alive(token)) return;
  await replayCorrect(token);
  if (!alive(token)) return;
  game.attempt++;
  updateHud();
  if (game.attempt > ATTEMPTS_PER_SPAN) {
    setMessage('Se acabaron los intentos de este recuerdo', 'bad');
    await wait(1.4);
    if (alive(token) && await runFinale(false, token)) endGame(false);
    return;
  }
  setMessage('Te queda un intento', 'bad');
  showQuip('Ella no te dio ninguno.', 'bad', 2.2);
  await wait(1.8);
  if (alive(token)) showReady(token);
}

async function openDoor(token, big = false) {
  const room = game.room;
  sfx.door();
  shake.kick(big ? 0.4 : 0.18);
  particles.burst(room.doorWorldPosition, {
    count: big ? 70 : 34,
    colors: [0xff7eb6, 0xc8405e, 0xf6d365],
    speed: big ? 5 : 3.5,
    up: big ? 6 : 4,
    life: big ? 1.6 : 1.1,
  });
  await tween(0.9, (p) => room.setDoorOpen(p));
}

async function advanceRoom(token) {
  game.state = 'transition';
  setMessage('Kevin avanza al siguiente recuerdo');
  setPips(0, 0, false);
  const old = game.room;
  const nextIndex = game.roomIndex + 1;
  const next = buildRoom(nextIndex);
  game.oldRooms.push(old);

  await openDoor(token);
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
    bgColor.copy(bg0).lerp(bg1, p);
    // Al cruzar la puerta, el recuerdo anterior se desvanece para no tapar la vista.
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
  hintArrow.visible = false;
  const summary = summarizeTrials(game.trials);
  const isRecord = stats.recordSession({
    date: game.startedAt,
    participant: game.participant,
    mode: game.mode,
    span: game.maxSpan,
    won,
    presenter: game.presenterUsed,
    chaos: game.chaos,
    trials: game.trials,
  });
  clearNotifs();
  hideThought();
  const ending = won ? ENDINGS.win : ENDINGS.lose;
  $('over-kicker').textContent = ending.kicker;
  $('over-text').textContent = game.maxSpan >= START_SPAN ? ending.text : ENDINGS.zero;
  $('over-span').textContent = String(game.maxSpan);
  $('over-rating').textContent = [
    game.maxSpan >= START_SPAN ? `Tu memoria visoespacial: ${spanRating(game.maxSpan).toLowerCase()} (orden ${game.mode}).` : '',
    game.chaos ? 'Jugaste en modo caos: esta partida no cuenta para el récord.' : '',
  ].filter(Boolean).join(' ');
  $('over-record').hidden = !isRecord || game.maxSpan === 0;
  $('over-rooms').textContent = String(Math.max(0, game.maxSpan - START_SPAN + 1));
  $('over-accuracy').textContent = `${summary.accuracy}%`;
  $('over-rt').textContent = `${(summary.meanRtMs / 1000).toFixed(1)} s`;
  showScreen('screen-over');
  $('btn-again').focus({ preventScroll: true });
}

// ---------------- modo presentador ----------------
function setPresenter(on) {
  game.presenter = on;
  if (on && inGame()) game.presenterUsed = true;
  updateHud();
  updateHint();
}

function jumpToRoom(index) {
  if (!inGame() || index < 0 || index >= MEMORIES.length) return;
  game.token++;
  clearTweens();
  cinema.abort();
  Object.assign(cam, { zoom: 0, mode: 'normal' });
  hideQuip();
  resetWorld(index);
  Object.assign(game, { span: START_SPAN + index, attempt: 1, practice: false, presenterUsed: true });
  showReady(game.token);
}

function autoAnswer(correct) {
  if (game.state !== 'input') return;
  if (correct) {
    game.expected.slice(game.response.length).forEach((i) => pickBlock(i));
  } else {
    const wrong = [...Array(BLOCK_COUNT).keys()].find((i) => i !== game.expected[game.response.length]);
    pickBlock(wrong);
  }
}

// ---------------- progreso ----------------
const SERIES = {
  directo: { color: '#bd8a1a', label: 'Orden directo', shape: 'circle' },
  inverso: { color: '#e0609a', label: 'Orden inverso', shape: 'square' },
};

function showProgress() {
  const sessions = stats.getSessions().filter((s) => !s.presenter && !s.chaos).slice(-20);
  const susScores = stats.getSessions().filter((s) => s.sus).map((s) => s.sus.score);
  const parts = [`${sessions.length} partida${sessions.length === 1 ? '' : 's'} registrada${sessions.length === 1 ? '' : 's'}.`];
  if (stats.getBest('directo')) parts.push(`Mejor en directo: ${stats.getBest('directo')} cajas.`);
  if (stats.getBest('inverso')) parts.push(`Mejor en inverso: ${stats.getBest('inverso')} cajas.`);
  if (susScores.length) parts.push(`Usabilidad promedio (SUS): ${Math.round(susScores.reduce((a, b) => a + b, 0) / susScores.length)} de 100.`);
  $('progress-summary').textContent = parts.join(' ');
  $('chart').innerHTML = sessions.length ? chartSvg(sessions) : '<p class="empty">Aún no hay partidas. Juega una y aquí verás tu curva.</p>';
  $('legend').innerHTML = Object.values(SERIES).map((s) => `<span><i style="background:${s.color};${s.shape === 'circle' ? 'border-radius:50%' : ''}"></i>${s.label}</span>`).join('');
  $('progress-table').innerHTML = sessions.length
    ? `<table><thead><tr><th>#</th><th>Fecha</th><th>Jugador</th><th>Modo</th><th>Cajas</th><th>SUS</th></tr></thead><tbody>${
      sessions.map((s, i) => `<tr><td>${i + 1}</td><td>${shortDate(s.date)}</td><td>${escapeHtml(s.participant || '–')}</td><td>${s.mode}</td><td>${s.span}</td><td>${s.sus ? s.sus.score : '–'}</td></tr>`).join('')
    }</tbody></table>`
    : '';
  bindChartTooltip(sessions);
  showScreen('screen-progress');
  $('btn-progress-back').focus({ preventScroll: true });
}

function chartSvg(sessions) {
  const W = 640, H = 260, L = 44, R = 90, T = 14, B = 40;
  const n = sessions.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - v / MAX_SPAN) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cajas recordadas por partida">`;
  for (const v of [0, 3, 6, 9]) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#3a2c42" stroke-width="1"/>`;
    svg += `<text x="${L - 10}" y="${y(v) + 5}" fill="#c4b3c4" font-size="13" text-anchor="end">${v}</text>`;
  }
  svg += `<text x="${L}" y="${H - 10}" fill="#c4b3c4" font-size="13">Partidas (de la más antigua a la más reciente)</text>`;
  for (const [mode, s] of Object.entries(SERIES)) {
    const pts = sessions.map((ses, i) => ({ ses, i })).filter((p) => p.ses.mode === mode);
    if (!pts.length) continue;
    if (pts.length > 1) {
      svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" points="${pts.map((p) => `${x(p.i)},${y(p.ses.span)}`).join(' ')}"/>`;
    }
    for (const p of pts) {
      const cx = x(p.i), cy = y(p.ses.span);
      svg += s.shape === 'circle'
        ? `<circle cx="${cx}" cy="${cy}" r="5" fill="${s.color}" stroke="#1a1424" stroke-width="2"/>`
        : `<rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" fill="${s.color}" stroke="#1a1424" stroke-width="2"/>`;
    }
    const last = pts.at(-1);
    svg += `<text x="${x(last.i) + 10}" y="${y(last.ses.span) + 4}" fill="#f4ecea" font-size="13">${mode} ${last.ses.span}</text>`;
  }
  // Zonas de interacción más grandes que los puntos
  sessions.forEach((ses, i) => {
    svg += `<circle class="hit" data-i="${i}" cx="${x(i)}" cy="${y(ses.span)}" r="14" fill="transparent"/>`;
  });
  return `${svg}</svg>`;
}

let tipEl = null;
function bindChartTooltip(sessions) {
  const svg = $('chart').querySelector('svg');
  if (!svg) return;
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tip';
    tipEl.hidden = true;
    document.body.append(tipEl);
  }
  svg.querySelectorAll('.hit').forEach((c) => {
    c.addEventListener('pointerenter', (e) => {
      const s = sessions[Number(c.dataset.i)];
      tipEl.innerHTML = `Partida ${Number(c.dataset.i) + 1}, ${shortDate(s.date)}<br>${s.mode}: <b>${s.span} cajas</b>${s.participant ? `<br>${escapeHtml(s.participant)}` : ''}`;
      tipEl.hidden = false;
      tipEl.style.left = `${e.clientX + 14}px`;
      tipEl.style.top = `${e.clientY - 10}px`;
    });
    c.addEventListener('pointerleave', () => { tipEl.hidden = true; });
  });
}

// ---------------- encuesta SUS ----------------
function showSus() {
  $('sus-list').innerHTML = SUS_ITEMS.map((text, i) => `
    <li><fieldset style="border:0;margin:0;padding:0"><legend>${text}</legend>
      <div class="scale">
        <small>Desacuerdo</small>
        ${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="q${i}" value="${v}" aria-label="${v}"><span>${v}</span></label>`).join('')}
        <small>Acuerdo</small>
      </div></fieldset></li>`).join('');
  $('sus-error').hidden = true;
  $('sus-form').hidden = false;
  $('sus-result').hidden = true;
  showScreen('screen-sus');
  $('screen-sus').scrollTop = 0;
}

$('sus-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const answers = SUS_ITEMS.map((_, i) => Number(form.get(`q${i}`)));
  if (answers.some((a) => !a)) {
    $('sus-error').hidden = false;
    return;
  }
  const score = susScore(answers);
  stats.attachSus(score, answers);
  sfx.success();
  $('sus-score').textContent = String(score);
  $('sus-label').textContent = `Usabilidad ${susLabel(score).toLowerCase()} según la escala SUS.`;
  $('sus-form').hidden = true;
  $('sus-result').hidden = false;
  $('btn-sus-done').focus({ preventScroll: true });
});

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

window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const key = e.key.toLowerCase();
  if ((key === ' ' || key === 'enter') && cinema.active) {
    e.preventDefault();
    cinema.skip();
    return;
  }
  if ((key === ' ' || key === 'enter') && game.state === 'ready' && tag !== 'BUTTON') {
    e.preventDefault();
    onReady();
    return;
  }
  if (key === 'escape') ui.exitConfirm.hidden = true;
  // Modo presentador: P lo activa; C acierta, X falla, 1-8 salta de recuerdo.
  if (key === 'p') setPresenter(!game.presenter);
  if (!game.presenter) return;
  if (key === 'c') autoAnswer(true);
  if (key === 'x') autoAnswer(false);
  if (/^[1-8]$/.test(key)) jumpToRoom(Number(key) - 1);
});

document.querySelectorAll('button[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => startGame(btn.dataset.mode));
});
$('btn-ready').addEventListener('click', onReady);
ui.skip.addEventListener('click', skipPractice);
$('btn-again').addEventListener('click', () => startGame(game.mode));
$('btn-home').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-sus').addEventListener('click', () => { sfx.ui(); showSus(); });
$('btn-sus-cancel').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-sus-done').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-progress-back').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-csv').addEventListener('click', stats.downloadCSV);
$('btn-exit').addEventListener('click', () => {
  sfx.ui();
  ui.exitConfirm.hidden = false;
  $('btn-exit-no').focus({ preventScroll: true });
});
$('btn-exit-yes').addEventListener('click', () => { sfx.ui(); showTitle(); });
$('btn-exit-no').addEventListener('click', () => { ui.exitConfirm.hidden = true; });

const muteBtn = $('btn-mute');
function syncMute() {
  muteBtn.setAttribute('aria-pressed', String(isMuted()));
  muteBtn.setAttribute('aria-label', isMuted() ? 'Activar sonido' : 'Silenciar sonido');
}
muteBtn.addEventListener('click', () => { setMuted(!isMuted()); syncMute(); });
syncMute();

const musicBtn = $('btn-music');
function syncMusic() {
  musicBtn.setAttribute('aria-pressed', String(!music.isOn()));
  musicBtn.setAttribute('aria-label', music.isOn() ? 'Apagar música' : 'Encender música');
}
musicBtn.addEventListener('click', () => { music.setOn(!music.isOn()); syncMusic(); });
syncMusic();

// Ayuda para las pruebas automáticas.
window.__mnemo = { game, pickBlock, camera, onReady, jumpToRoom, setPresenter, cinema, chaosNotify, music };

// ---------------- bucle principal ----------------
const clock = new THREE.Clock();
let firstFrame = true;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  updateTweens(dt);
  game.room?.update(dt);
  game.oldRooms.forEach((r) => r.update(dt));
  player.update(dt);
  particles.update(dt);
  placeCamera(camFocusZ);
  camera.position.add(shake.update(dt));
  if (hintArrow.visible) {
    hintArrow.position.y = 1.4 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.3;
  }
  // La música baja mientras el jugador memoriza y responde.
  music.duck(game.state === 'showing' || game.state === 'input' ? 0.2 : 1);
  updateThought();
  updateMenuHeart(clock.elapsedTime);
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    window.__mnemoReady = true;
    $('loader').hidden = true;
  }
  requestAnimationFrame(frame);
}

resize();
showTitle();
frame();
