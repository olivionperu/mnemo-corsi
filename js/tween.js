// Mini motor de interpolaciones basado en el tiempo del juego (se pausa con la pestaña).
const tweens = new Set();

export const linear = (p) => p;
export const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);

export function tween(duration, onUpdate = () => {}, ease = easeInOut) {
  return new Promise((resolve) => {
    tweens.add({ t: 0, duration: Math.max(duration, 0.0001), onUpdate, ease, resolve });
  });
}

export const wait = (seconds) => tween(seconds, () => {}, linear);

export function updateTweens(dt) {
  for (const tw of [...tweens]) {
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.duration);
    tw.onUpdate(tw.ease(p));
    if (p >= 1) {
      tweens.delete(tw);
      tw.resolve();
    }
  }
}

// Al reiniciar se descartan las animaciones pendientes; sus promesas nunca se resuelven
// y las cadenas asíncronas antiguas quedan detenidas.
export function clearTweens() {
  tweens.clear();
}
