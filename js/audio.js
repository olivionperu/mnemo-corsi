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
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, { delay: i * 0.12, vol: 0.08, type: 'triangle' })),
};

export const unlockAudio = () => ensure();
export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem('mnemo-muted', value ? '1' : '0');
  } catch { /* sin persistencia */ }
}
