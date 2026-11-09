// Narrativa: Kevin, programador junior, recorre los recuerdos de su ex.
// Cada sala es un recuerdo y cada recuerdo guarda una frase de ELLA.

export const GAME_TITLE = '404: Amor no encontrado';
export const HERO = 'Kevin';

export const MEMORIES = [
  {
    place: 'La primera cita',
    lie: 'Me encanta que seas programador.',
    truth: 'Kevin aún no sabía que eso incluía arreglarle la impresora a toda su familia.',
  },
  {
    place: 'El chat de las 3 a.m.',
    lie: 'Solo es un amigo.',
    truth: 'El "amigo" tenía su propio álbum de fotos. Con stickers.',
  },
  {
    place: 'Su cumpleaños',
    lie: 'Ya estoy lista en 5 minutos.',
    truth: 'La reserva del restaurante expiró. Dos veces.',
  },
  {
    place: 'La salida con sus amigas',
    lie: 'Te escribo cuando llegue.',
    truth: 'Según el último reporte, sigue en camino.',
  },
  {
    place: 'La pelea por nada',
    lie: 'No estoy enojada.',
    truth: 'Lo escribió con punto final. Y los puntos finales no mienten.',
  },
  {
    place: 'El "tenemos que hablar"',
    lie: 'No eres tú, soy yo.',
    truth: 'Kevin revisó el git blame. Decía "Kevin".',
  },
  {
    place: 'Las historias de Instagram',
    lie: 'Necesito tiempo para mí.',
    truth: 'Su "tiempo para mí" tuvo 1,2 k vistas y un tal Brayan en todas las fotos.',
  },
  {
    place: 'El servidor del olvido',
    lie: 'Siempre vamos a ser amigos.',
    truth: 'Kevin fue bloqueado en 3 plataformas. Récord personal.',
  },
];

export const SUCCESS_LINES = [
  'Commit exitoso: una mentira menos.',
  'Build passing. El corazón sigue en mantenimiento.',
  'Merge sin conflictos. Ojalá la relación hubiera sido así.',
  'Test aprobado. Ella nunca aprobó ninguno de los tuyos.',
  'La puerta se abrió. Ella nunca abrió tus mensajes.',
];

export const ERROR_LINES = [
  'Error 404: recuerdo no encontrado.',
  'Le creíste otra vez, ¿no?',
  'Ese no era. Como Brayan, que tampoco "era nada".',
  'Segmentation fault emocional.',
  'Hasta ella recordaba mejor sus excusas.',
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
    text: 'Hizo git push --force al olvido y siguió adelante. Ya no recuerda a ELLA, pero sí todas sus mentiras.',
  },
  lose: {
    kicker: 'Kevin se quedó atrapado en un recuerdo',
    text: 'Le faltó memoria para cerrar esta puerta. Mañana puede intentarlo otra vez.',
  },
  zero: 'Ni la primera cita pudo superar. Respira y prueba otra vez con calma.',
};

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
