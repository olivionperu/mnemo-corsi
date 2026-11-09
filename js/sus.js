// System Usability Scale (Brooke, 1996): 10 afirmaciones con escala de 1 a 5.
// Interpretación según la escala de adjetivos de Bangor, Kortum y Miller (2009).

export const SUS_ITEMS = [
  'Creo que me gustaría jugar este juego con frecuencia.',
  'Encontré el juego innecesariamente complejo.',
  'Pensé que el juego era fácil de usar.',
  'Creo que necesitaría ayuda de una persona con conocimientos técnicos para usarlo.',
  'Las partes del juego estaban bien integradas.',
  'Pensé que había demasiada inconsistencia en el juego.',
  'Imagino que la mayoría de personas aprendería a usarlo muy rápido.',
  'Encontré el juego muy difícil de usar.',
  'Me sentí muy seguro usando el juego.',
  'Necesité aprender muchas cosas antes de poder usar el juego.',
];

// answers: 10 números entre 1 y 5. Devuelve un puntaje de 0 a 100.
export function susScore(answers) {
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new RangeError('La encuesta SUS necesita 10 respuestas');
  }
  let sum = 0;
  answers.forEach((r, i) => {
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new RangeError('Cada respuesta va de 1 a 5');
    sum += i % 2 === 0 ? r - 1 : 5 - r;
  });
  return sum * 2.5;
}

export function susLabel(score) {
  if (score >= 85) return 'Excelente';
  if (score >= 71) return 'Buena';
  if (score >= 51) return 'Aceptable';
  return 'Necesita mejoras';
}
