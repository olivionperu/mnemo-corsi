// Efectos de sonido 8 bits sintetizados con Web Audio (sin archivos externos).
let ctx = null;
let master = null;
let muted = false;

try {
  muted = localStorage.getItem('mnemo-muted') === '1';
} catch { /* almacenamiento no disponible */ }

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.1, delay = 0, to = null } = {}) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// El tono de "mostrar" es siempre el mismo para no dar pistas auditivas:
// la tarea debe seguir siendo visoespacial.
export const sfx = {
  show: () => tone(660, 0.22, { type: 'triangle', vol: 0.16 }),
  tap: () => tone(440, 0.08, { vol: 0.07 }),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { delay: i * 0.08, vol: 0.08 })),
  fail: () => tone(220, 0.38, { type: 'sawtooth', to: 110, vol: 0.08 }),
  door: () => {
    tone(95, 0.8, { type: 'sawtooth', to: 60, vol: 0.05 });
    tone(150, 0.45, { type: 'square', to: 80, vol: 0.025, delay: 0.1 });
  },
  step: () => tone(120, 0.05, { type: 'square', vol: 0.025 }),
  ui: () => tone(880, 0.05, { vol: 0.04 }),
  notify: () => {
    tone(988, 0.09, { type: 'triangle', vol: 0.09 });
    tone(1319, 0.14, { type: 'triangle', vol: 0.09, delay: 0.09 });
  },
  key: () => tone(1800 + Math.random() * 300, 0.025, { vol: 0.018 }),
  send: () => tone(500, 0.16, { type: 'triangle', to: 1200, vol: 0.06 }),
  quip: () => tone(740, 0.06, { type: 'triangle', vol: 0.05 }),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, { delay: i * 0.12, vol: 0.08, type: 'triangle' })),
};

export const unlockAudio = () => ensure();
export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem('mnemo-muted', value ? '1' : '0');
  } catch { /* sin persistencia */ }
  applyMusicGain();
}

// ---------------- música chiptune ----------------
// Balada original en La menor (i - VI - III - VII) a 84 pulsos por minuto:
// bajo en triángulo, arpegio en onda cuadrada y melodía de 8 compases.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [
  { bass: 45, arp: [57, 60, 64] }, // La menor
  { bass: 41, arp: [53, 57, 60] }, // Fa
  { bass: 48, arp: [55, 60, 64] }, // Do
  { bass: 43, arp: [55, 59, 62] }, // Sol
];
const MELODY = [ // una nota por negra, -1 = silencio
  [72, 71, 69, -1], [69, 72, 71, 69], [67, -1, 64, 67], [71, 69, 67, -1],
  [76, 74, 72, 71], [72, -1, 69, -1], [67, 69, 72, 74], [71, -1, -1, -1],
];
const EIGHTH = 60 / 84 / 2;
const MUSIC_VOLUME = 0.07;

let musicGain = null;
let musicTimer = 0;
let musicOn = true;
let duckLevel = 1;
let nextNoteTime = 0;
let step = 0;

try {
  musicOn = localStorage.getItem('mnemo-music') !== '0';
} catch { /* sin persistencia */ }

function voice(freq, t, dur, type, vol) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function scheduleMusic() {
  while (nextNoteTime < ctx.currentTime + 0.5) {
    const bar = Math.floor(step / 8) % MELODY.length;
    const s = step % 8;
    const chord = CHORDS[bar % CHORDS.length];
    if (s % 4 === 0) voice(midi(chord.bass), nextNoteTime, EIGHTH * 3.6, 'triangle', 0.5);
    voice(midi(chord.arp[[0, 1, 2, 1][s % 4]]), nextNoteTime, EIGHTH * 0.9, 'square', 0.1);
    if (s % 2 === 0) {
      const note = MELODY[bar][s / 2];
      if (note > 0) voice(midi(note), nextNoteTime, EIGHTH * 1.8, 'triangle', 0.35);
    }
    nextNoteTime += EIGHTH;
    step++;
  }
}

function applyMusicGain() {
  if (!musicGain) return;
  const target = muted || !musicOn ? 0.0001 : MUSIC_VOLUME * duckLevel;
  musicGain.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
}

export const music = {
  start() {
    const c = ensure();
    if (!c || musicTimer) return;
    musicGain = c.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(master);
    nextNoteTime = c.currentTime + 0.1;
    step = 0;
    musicTimer = setInterval(scheduleMusic, 120);
    applyMusicGain();
  },
  // Baja el volumen mientras el jugador memoriza (1 = normal).
  duck(level) {
    if (level === duckLevel) return;
    duckLevel = level;
    applyMusicGain();
  },
  isOn: () => musicOn,
  state: () => ({ playing: Boolean(musicTimer), notesScheduled: step, duck: duckLevel }),
  setOn(value) {
    musicOn = value;
    try {
      localStorage.setItem('mnemo-music', value ? '1' : '0');
    } catch { /* sin persistencia */ }
    applyMusicGain();
  },
};
