// Narrativa: Kevin, programador junior, recorre los recuerdos de su ex.
// Cada sala es un recuerdo y cada recuerdo guarda una de las típicas excusas de ELLA.

export const GAME_TITLE = '404: Amor no encontrado';
export const HERO = 'Kevin';

export const MEMORIES = [
  {
    place: 'La primera sospecha',
    lie: 'Solo es un amigo.',
    truth: 'El "amigo" le escribía "buenos días, preciosa" todos los días a las 7:00. Con cron job.',
  },
  {
    place: 'La foto con "el primo"',
    lie: 'Es mi primo.',
    truth: 'Kevin conoce a toda su familia. Ese primo no sale en ninguna foto de Navidad.',
  },
  {
    place: 'La noche sin respuesta',
    lie: 'Me quedé sin batería.',
    truth: 'Pero sí tuvo batería para subir 14 historias esa noche.',
  },
  {
    place: 'El sábado con "las amigas"',
    lie: 'Estoy en casa de mi amiga.',
    truth: 'La amiga estaba en el gimnasio. Lo subió a sus historias.',
  },
  {
    place: 'El chat que se quedó abierto',
    lie: 'No es lo que parece.',
    truth: 'Era exactamente lo que parecía. Hasta el compilador lo detectó.',
  },
  {
    place: 'El WhatsApp "hackeado"',
    lie: 'Me hackearon el WhatsApp.',
    truth: 'Kevin es programador y revisó. Ningún hacker borra solo los chats con Brayan.',
  },
  {
    place: 'El "hermano" de la universidad',
    lie: 'Él es como un hermano para mí.',
    truth: 'Un hermano que la llamaba "bebé" a las 2 a.m.',
  },
  {
    place: 'La última conversación',
    lie: 'Tú eres el único.',
    truth: 'Era verdad: el único que no sabía nada.',
  },
];

// 8 frases para 8 recuerdos: con makeBag ninguna se repite dentro de una partida.
export const SUCCESS_LINES = [
  'Commit exitoso: una mentira menos.',
  'La puerta se abrió. Su celular, nunca.',
  'Build passing. Brayan sigue en los logs.',
  'Merge sin conflictos. Todo lo contrario a su historial de chats.',
  'Bug encontrado y corregido. Se llamaba Brayan.',
  'Deploy exitoso. Kevin 1, excusas 0.',
  'Memoria intacta. Su "primo" no puede decir lo mismo.',
  'Acceso concedido. Ella nunca te dio la contraseña de su celular.',
];

export const ERROR_LINES = [
  'Error 404: recuerdo no encontrado.',
  'Le creíste otra vez, ¿no?',
  'Ese no era. Como "el primo", que tampoco era primo.',
  'Segmentation fault emocional.',
  'Hasta ella recordaba mejor sus coartadas.',
];

// Modo caos: mensajes de ELLA que interrumpen mientras Kevin intenta memorizar.
export const CHAOS_MESSAGES = [
  '¿estás molesto?',
  '¿por qué no contestas?',
  'ya llegué, bebé (era para mi amiga)',
  '¿me prestas tu Netflix?',
  'mi primo te manda saludos',
  'tenemos que hablar',
  '¿viste mi historia?',
  'no es lo que parece',
  'me quedé sin batería',
  'estoy en casa de mi amiga',
  '¿sigues despierto?',
  'jajaja no, nada',
  'oye, ¿y tu contraseña del wifi?',
  'k',
];

export const PRACTICE = {
  intro: 'Antes de empezar, una práctica. Mira las 2 cajas que se encienden y luego tócalas en el mismo orden. La flecha te ayuda.',
  introInverse: 'Antes de empezar, una práctica. Mira las 2 cajas que se encienden y luego tócalas al revés: primero la última. La flecha te ayuda.',
  done: 'Práctica superada. Ahora va en serio: sin flecha y con 2 intentos por recuerdo.',
  retry: 'Casi. Sigue la flecha, en la práctica no se pierde nada.',
};

export const ENDINGS = {
  win: {
    kicker: 'Kevin cerró la última puerta',
    text: 'Hizo git push --force al olvido y siguió adelante. Ya no recuerda a ELLA, pero sí cada una de sus coartadas.',
  },
  lose: {
    kicker: 'Kevin se quedó atrapado en un recuerdo',
    text: 'Le faltó memoria para cerrar esta puerta. Ella contaba con eso. Mañana puede intentarlo otra vez.',
  },
  zero: 'Ni la primera sospecha pudo superar. Respira y prueba otra vez con calma.',
};

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// "Bolsa" de frases: las entrega en orden aleatorio sin repetir ninguna hasta usarlas
// todas, y evita que la última de una vuelta sea la primera de la siguiente.
export function makeBag(list, rng = Math.random) {
  let bag = [];
  let last;
  return function next() {
    if (!bag.length) {
      bag = [...list];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
    }
    last = bag.shift();
    return last;
  };
}
