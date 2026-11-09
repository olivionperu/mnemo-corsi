// Pruebas automáticas de la lógica del juego. Ejecutar con: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRng, generateSequence, expectedResponse, evaluateStep,
  generateLayout, spanRating, summarizeTrials, BLOCK_COUNT,
} from '../js/corsi.js';

test('la secuencia tiene la longitud pedida y no repite bloques', () => {
  const rng = createRng(42);
  for (let len = 1; len <= BLOCK_COUNT; len++) {
    const seq = generateSequence(len, BLOCK_COUNT, rng);
    assert.equal(seq.length, len);
    assert.equal(new Set(seq).size, len);
    seq.forEach((b) => assert.ok(b >= 0 && b < BLOCK_COUNT));
  }
});

test('la secuencia rechaza longitudes inválidas', () => {
  assert.throws(() => generateSequence(0), RangeError);
  assert.throws(() => generateSequence(10, 9), RangeError);
  assert.throws(() => generateSequence(2.5), RangeError);
});

test('la misma semilla produce la misma secuencia', () => {
  assert.deepEqual(generateSequence(5, 9, createRng(7)), generateSequence(5, 9, createRng(7)));
});

test('el modo inverso invierte la respuesta esperada sin alterar el original', () => {
  const seq = [3, 1, 7];
  assert.deepEqual(expectedResponse(seq, 'directo'), [3, 1, 7]);
  assert.deepEqual(expectedResponse(seq, 'inverso'), [7, 1, 3]);
  assert.deepEqual(seq, [3, 1, 7]);
});

test('evaluateStep detecta continuar, error y completo', () => {
  assert.equal(evaluateStep([1, 2, 3], []), 'continue');
  assert.equal(evaluateStep([1, 2, 3], [1, 2]), 'continue');
  assert.equal(evaluateStep([1, 2, 3], [1, 3]), 'error');
  assert.equal(evaluateStep([1, 2, 3], [1, 2, 3]), 'complete');
  assert.equal(evaluateStep([1, 2], [1, 2, 3]), 'error');
});

test('los bloques respetan la distancia mínima y el área', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const pts = generateLayout(9, createRng(seed));
    assert.equal(pts.length, 9);
    for (let i = 0; i < pts.length; i++) {
      assert.ok(pts[i].x >= -5.2 && pts[i].x <= 2.2);
      assert.ok(pts[i].z >= -4.3 && pts[i].z <= 3.7);
      for (let j = i + 1; j < pts.length; j++) {
        assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) >= 1.2);
      }
    }
  }
});

test('la calificación de amplitud cubre todos los rangos', () => {
  assert.equal(spanRating(2), 'En entrenamiento');
  assert.equal(spanRating(4), 'Cerca del promedio, sigue practicando');
  assert.equal(spanRating(5), 'Dentro del promedio adulto');
  assert.equal(spanRating(8), 'Por encima del promedio adulto');
});

test('el resumen calcula precisión, tiempo medio y amplitud máxima', () => {
  const s = summarizeTrials([
    { span: 2, correct: true, rtMs: 1000 },
    { span: 3, correct: true, rtMs: 2000 },
    { span: 4, correct: false, rtMs: 900 },
    { span: 4, correct: false, rtMs: 800 },
  ]);
  assert.deepEqual(s, { total: 4, correct: 2, accuracy: 50, meanRtMs: 1500, maxSpan: 3 });
  assert.deepEqual(summarizeTrials([]), { total: 0, correct: 0, accuracy: 0, meanRtMs: 0, maxSpan: 0 });
});
