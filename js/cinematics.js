// Cinemáticas: la frase de ELLA al entrar a cada recuerdo y el final con su chat.
// Todas se pueden saltar con un toque o con la barra espaciadora.
import { wait } from './tween.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Cinema {
  constructor() {
    this.el = $('cine');
    this.active = false;
    this.skipped = false;
    this.resolvers = [];
    this.el.addEventListener('pointerdown', () => this.skip());
  }

  skip() {
    if (!this.active) return;
    this.skipped = true;
    this.resolvers.splice(0).forEach((r) => r());
  }

  // Pausa que termina antes si el jugador salta la escena.
  hold(seconds) {
    if (this.skipped) return Promise.resolve();
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
      wait(seconds).then(resolve);
    });
  }

  async type(el, text, charsPerSecond = 26, keySound = false) {
    if (reducedMotion || this.skipped) {
      el.textContent = text;
      return;
    }
    el.textContent = '';
    for (const ch of text) {
      if (this.skipped) {
        el.textContent = text;
        return;
      }
      el.textContent += ch;
      if (keySound && ch !== ' ') sfx.key();
      await this.hold(1 / charsPerSecond);
    }
  }

  begin(mode) {
    this.active = true;
    this.skipped = false;
    this.el.dataset.mode = mode;
    this.el.hidden = false;
    void this.el.offsetWidth; // fuerza el reflujo para que la transición de las barras arranque
    this.el.classList.add('on');
  }

  async end() {
    this.el.classList.remove('on');
    this.resolvers.splice(0).forEach((r) => r());
    await wait(0.45);
    this.abort();
  }

  abort() {
    // Las escenas interrumpidas quedan detenidas: no deben continuar dentro de la siguiente.
    this.resolvers = [];
    this.active = false;
    this.el.classList.remove('on');
    this.el.hidden = true;
    ['cine-lie', 'cine-truth', 'cine-caption', 'composer'].forEach((id) => { $(id).textContent = ''; });
    $('cine-truth').classList.remove('show');
    $('cine-cite').classList.remove('show');
    $('phone-status').classList.remove('blocked');
    $('chat').innerHTML = '';
    $('phone').classList.remove('show');
  }

  // ---------- entrada a cada recuerdo ----------
  async roomIntro(memory, number, total, hooks = {}) {
    this.begin('intro');
    $('cine-kicker').textContent = `Recuerdo ${number} de ${total}`;
    $('cine-place').textContent = memory.place;
    await this.hold(0.7);
    await this.type($('cine-lie'), `“${memory.lie}”`, 22);
    $('cine-cite').classList.add('show');
    hooks.onLie?.();
    await this.hold(0.9);
    $('cine-truth').textContent = memory.truth;
    $('cine-truth').classList.add('show');
    hooks.onTruth?.();
    await this.hold(Math.min(4.2, 1.8 + memory.truth.length * 0.03));
    await this.end();
  }

  // ---------- final: el chat con ELLA ----------
  bubble(who, text) {
    const b = document.createElement('p');
    b.className = `bubble ${who}`;
    b.textContent = text;
    $('chat').append(b);
    $('chat').scrollTop = $('chat').scrollHeight;
  }

  async herMessage(text, typingSeconds = 1.2) {
    $('phone-status').textContent = 'escribiendo…';
    await this.hold(typingSeconds);
    $('phone-status').textContent = 'en línea';
    this.bubble('her', text);
    sfx.notify();
    await this.hold(1.1);
  }

  async kevinTypes(text) {
    await this.type($('composer'), text, 12, true);
    await this.hold(0.35);
  }

  async kevinErases() {
    const el = $('composer');
    while (el.textContent.length && !this.skipped) {
      el.textContent = el.textContent.slice(0, -1);
      sfx.key();
      await this.hold(0.09);
    }
    el.textContent = '';
  }

  kevinSends() {
    const el = $('composer');
    this.bubble('me', el.textContent);
    el.textContent = '';
    sfx.send();
  }

  async finale(won, hooks) {
    this.begin('finale');
    $('phone-status').textContent = 'en línea';
    await this.hold(0.6);
    $('phone').classList.add('show');
    sfx.notify();
    await this.hold(0.7);

    if (won) {
      await this.herMessage('hola… te extraño');
      await this.herMessage('ese chico de verdad era mi primo', 1.4);
      await this.kevinTypes('Error 410: Gone.');
      this.kevinSends();
      await this.hold(0.8);
      this.bubble('sys', 'Bloqueaste a ELLA');
      $('phone-status').textContent = 'bloqueada';
      $('phone-status').classList.add('blocked');
      hooks.onWin();
      await this.hold(1.0);
      await this.type($('cine-caption'), 'Kevin cerró la última puerta. Por fin.', 24);
    } else {
      hooks.onLose();
      await this.herMessage('¿podemos hablar?');
      await this.kevinTypes('no');
      await this.hold(0.5);
      await this.kevinErases();
      await this.hold(0.5);
      await this.kevinTypes('sí, claro');
      this.kevinSends();
      await this.hold(0.9);
      await this.type($('cine-caption'), 'Kevin volvió a caer. Entrena tu memoria y vuelve a intentarlo.', 24);
    }
    await this.hold(2.4);
    await this.end();
  }
}
