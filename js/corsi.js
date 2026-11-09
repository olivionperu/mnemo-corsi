// Lógica pura de la prueba de bloques de Corsi (sin dependencias de Three.js).
// Se mantiene separada del render para poder probarla de forma automática.

export const BLOCK_COUNT = 9;        // Corsi (1972) usa 9 bloques
export const START_SPAN = 2;         // la secuencia inicial tiene 2 bloques
export const MAX_SPAN = 9;           // una sala por amplitud: 2..9 = 8 salas
export const ATTEMPTS_PER_SPAN = 2;  // protocolo clásico: 2 ensayos por longitud

// Generador pseudoaleatorio con semilla (mulberry32), útil para pruebas reproducibles.
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Secuencia sin bloques repetidos, como en la prueba original.
export function generateSequence(length, blockCount = BLOCK_COUNT, rng = Math.random) {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError('La longitud debe ser un entero mayor que 0');
  }
  if (length > blockCount) {
    throw new RangeError('La longitud no puede superar la cantidad de bloques');
  }
  const pool = [...Array(blockCount).keys()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, length);
}

// Modo directo: mismo orden. Modo inverso: orden contrario.
export function expectedResponse(sequence, mode) {
  return mode === 'inverso' ? [...sequence].reverse() : [...sequence];
}

// Evalúa la respuesta parcial: 'continue', 'error' o 'complete'.
export function evaluateStep(expected, response) {
  if (response.length > expected.length) return 'error';
  for (let i = 0; i < response.length; i++) {
    if (response[i] !== expected[i]) return 'error';
  }
  return response.length === expected.length ? 'complete' : 'continue';
}

// Distribución irregular de bloques (como el tablero de Corsi) con distancia mínima.
export function generateLayout(count = BLOCK_COUNT, rng = Math.random, area = {}) {
  const { minX = -5.2, maxX = 2.2, minZ = -4.3, maxZ = 3.7 } = area;
  let minDist = area.minDist ?? 1.9;
  while (minDist > 0.5) {
    const points = [];
    let tries = 0;
    while (points.length < count && tries < 4000) {
      tries++;
      const p = {
        x: minX + rng() * (maxX - minX),
        z: minZ + rng() * (maxZ - minZ),
      };
      if (points.every((q) => Math.hypot(p.x - q.x, p.z - q.z) >= minDist)) points.push(p);
    }
    if (points.length === count) return points;
    minDist -= 0.1;
  }
  throw new Error('No se pudo ubicar los bloques');
}

// Interpretación orientativa de la amplitud visoespacial.
export function spanRating(span) {
  if (span >= 7) return 'Por encima del promedio adulto';
  if (span >= 5) return 'Dentro del promedio adulto';
  if (span === 4) return 'Cerca del promedio, sigue practicando';
  return 'En entrenamiento';
}

export function summarizeTrials(trials) {
  const total = trials.length;
  const correct = trials.filter((t) => t.correct);
  const rts = correct.map((t) => t.rtMs);
  return {
    total,
    correct: correct.length,
    accuracy: total ? Math.round((correct.length / total) * 100) : 0,
    meanRtMs: rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0,
    maxSpan: correct.reduce((m, t) => Math.max(m, t.span), 0),
  };
}
