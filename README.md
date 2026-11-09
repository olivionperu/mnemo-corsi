# Mnemo y las puertas de Corsi

Juego web 3D con estética pixel art para entrenar la **memoria de trabajo visoespacial**. Está basado en la prueba de bloques de Corsi (Corsi, 1972; Milner, 1971).

**Jugar en línea:** https://olivionperu.github.io/mnemo-corsi/

Mnemo, un explorador con linterna, recorre 8 salas. En cada sala, unos bloques de piedra se encienden en secuencia. Si el jugador los toca en el orden correcto, la puerta se abre y Mnemo avanza a la siguiente sala, donde la secuencia tiene un bloque más.

## Cómo se juega

1. Elige **orden directo** (repetir la secuencia tal cual) u **orden inverso** (repetirla al revés).
2. Observa: los bloques se encienden a razón de **un bloque por segundo**, como en el protocolo estándar.
3. Cuando aparezca "Tu turno", toca los bloques.
4. Si aciertas, la puerta se abre y pasas a la sala siguiente. La sala 1 pide 2 bloques y la sala 8 pide 9.
5. Tienes **2 intentos por sala**. Si fallas ambos, el viaje termina y se muestra tu **amplitud de Corsi**: la secuencia más larga que recordaste.

## Ejecutar en local

No necesita instalación ni compilación. Solo hay que servir la carpeta:

```bash
python -m http.server 5190
```

Luego abrir `http://localhost:5190`. Las pruebas automáticas de la lógica se ejecutan con Node 18 o superior:

```bash
npm test
```

## Tecnologías

| Parte | Tecnología |
|---|---|
| Motor 3D | [Three.js](https://threejs.org) r160 (JavaScript, módulos ES, cargado desde CDN) |
| Estilo pixel | Render a 1/3 de la resolución y escalado con `image-rendering: pixelated`, más texturas de 16 px generadas por código con filtro *nearest* |
| Sonido | Web Audio API: sonidos 8 bits sintetizados, sin archivos externos |
| Datos | `localStorage` y exportación a CSV |
| Pruebas | `node:test` (8 pruebas unitarias de la lógica Corsi) |

## Estructura del proyecto

```
index.html          Estructura de pantallas (inicio, HUD, resultado)
css/style.css       Estilos: paleta, tipografía Pixelify Sans, bordes pixelados
js/corsi.js         Lógica pura de la prueba de Corsi (secuencias, validación, puntaje)
js/world.js         Salas 3D: piso, muros, puerta, antorchas, bloques y paletas
js/player.js        Personaje vóxel Mnemo y sus animaciones
js/main.js          Escena, cámara, máquina de estados del juego y entrada del usuario
js/tween.js         Animaciones basadas en el tiempo del juego
js/audio.js         Efectos de sonido sintetizados
js/stats.js         Registro de partidas, récords y exportación CSV
tests/              Pruebas automáticas
capturas/           Pantallazos de la funcionalidad
```

### Máquina de estados

```
inicio -> mostrando -> respuesta -> (acierto) -> transición -> mostrando ...
                                 -> (error, quedan intentos) -> mostrando
                                 -> (error, sin intentos) -> resultado
```

## Fundamento psicológico (resumen para el marco teórico)

| Decisión de diseño | Fundamento |
|---|---|
| 9 bloques en posiciones irregulares | Diseño original de Corsi (1972). La disposición irregular impide que el jugador use patrones geométricos y obliga a recordar ubicaciones. |
| Presentación de 1 bloque por segundo | Protocolo estandarizado (Kessels et al., 2000). |
| La secuencia empieza en 2 y sube de 1 en 1 | Medición de la amplitud de memoria. Los límites de capacidad descritos por Miller (1956) y Cowan (2001) explican por qué la dificultad crece rápido después de 4 a 6 elementos. |
| 2 intentos por longitud | Regla clásica de interrupción de la prueba. |
| Modo inverso | Exige manipular la información, no solo retenerla, y carga más al ejecutivo central (Baddeley y Hitch, 1974). |
| Mismo sonido para todos los bloques | Evita que el jugador codifique la secuencia como melodía (bucle fonológico), de modo que la tarea siga siendo visoespacial (Logie, 1995). |
| Registro de tiempos y aciertos | Permite medir el progreso, siguiendo los estudios de entrenamiento cognitivo (Klingberg et al., 2005; Jaeggi et al., 2008). Se cita la evidencia crítica de Simons et al. (2016) sobre la transferencia limitada. |

## Calidad total: aplicación del ciclo PDCA de W. Edwards Deming

El proyecto se desarrolló en iteraciones cortas usando el ciclo **Planificar, Hacer, Verificar, Actuar** (Deming, 1986).

### Ciclo 1: núcleo del juego
- **Planificar:** se definieron los requisitos a partir del protocolo de Corsi (9 bloques, 1 bloque/s, 2 intentos por longitud, modos directo e inverso).
- **Hacer:** se programó primero la lógica pura (`corsi.js`), separada del 3D, para poder probarla de forma aislada.
- **Verificar:** 8 pruebas automáticas cubren la generación de secuencias sin repeticiones, el modo inverso, la validación paso a paso, la distribución de bloques y las estadísticas. Todas pasan.
- **Actuar:** se corrigió el script de pruebas, que en Windows no encontraba la carpeta `tests/`, y se dejó estandarizado en `package.json`.

### Ciclo 2: mundo 3D y jugabilidad
- **Planificar:** cada nivel es una sala con una puerta. Acertar abre la puerta y el personaje avanza.
- **Hacer:** se construyeron las salas, la puerta animada, el personaje y la transición de cámara.
- **Verificar:** una prueba automatizada de extremo a extremo (Playwright) jugó una partida completa con clics reales sobre los bloques. Superó 3 salas, falló 2 veces, llegó a la pantalla de resultados y guardó los datos sin errores en la consola. Las capturas están en `capturas/`.
- **Actuar:** las capturas revelaron 3 defectos, que se corrigieron:
  1. El número de la placa sobre la puerta no se leía. Se reemplazó por una fuente de píxeles de 3x5 dibujada a mano.
  2. En el celular, la cámara dejaba la sala pequeña y cortaba un bloque. Se agregó una cámara cenital específica para pantallas verticales.
  3. El "2" en negrita del HUD se confundía con un "8". Se cambió el grosor de la fuente.

### Ciclo 3: validación con usuarios (para completar por el equipo)
- **Planificar:** probar con 5 a 10 compañeros y anotar dudas, errores y tiempos.
- **Hacer:** cada participante juega 2 partidas, una en cada modo.
- **Verificar:** exportar el CSV ("Descargar mis datos") y comparar aciertos y tiempos de respuesta.
- **Actuar:** registrar los cambios que se hagan y su justificación.

### Relación con los 14 puntos de Deming (selección)
- **Punto 1, constancia en el propósito:** el objetivo de reforzar la memoria visoespacial guió cada decisión.
- **Punto 3, no depender de la inspección masiva:** las pruebas automáticas incorporan la calidad durante el desarrollo, no al final.
- **Punto 5, mejora continua:** cada ciclo PDCA dejó evidencia del antes y el después.
- **Punto 9, derribar barreras entre áreas:** lógica, gráficos e interfaz están en módulos separados con interfaces claras, de modo que cada integrante puede trabajar en uno sin bloquear a los demás.

## Publicar en línea (GitHub Pages)

1. Crear un repositorio público en GitHub, por ejemplo `mnemo-corsi`.
2. Subir esta carpeta:
   ```bash
   git remote add origin https://github.com/USUARIO/mnemo-corsi.git
   git push -u origin main
   ```
3. En GitHub, ir a **Settings > Pages > Source: Deploy from a branch > main / (root)**.
4. En uno o dos minutos, el juego queda disponible en `https://USUARIO.github.io/mnemo-corsi/`.

También funciona en Netlify o Cloudflare Pages arrastrando la carpeta, porque no tiene paso de compilación.

## Referencias (APA 7)

Antes de entregar, verifiquen cada referencia y agreguen el DOI.

- Anguera, J. A., Boccanfuso, J., Rintoul, J. L., Al-Hashimi, O., Faraji, F., Janowich, J., Kong, E., Larraburo, Y., Rolle, C., Johnston, E., & Gazzaley, A. (2013). Video game training enhances cognitive control in older adults. *Nature, 501*(7465), 97–101.
- Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system and its control processes. En K. W. Spence & J. T. Spence (Eds.), *The psychology of learning and motivation* (Vol. 2, pp. 89–195). Academic Press.
- Baddeley, A. D., & Hitch, G. (1974). Working memory. En G. H. Bower (Ed.), *The psychology of learning and motivation* (Vol. 8, pp. 47–89). Academic Press.
- Brunetti, R., Del Gatto, C., & Delogu, F. (2014). eCorsi: Implementation and testing of the Corsi block-tapping task for digital tablets. *Frontiers in Psychology, 5*, Artículo 939.
- Claessen, M. H. G., van der Ham, I. J. M., & van Zandvoort, M. J. E. (2015). Computerization of the standard Corsi block-tapping task affects its underlying cognitive concepts: A pilot study. *Applied Neuropsychology: Adult, 22*(3), 180–188.
- Corsi, P. M. (1972). *Human memory and the medial temporal region of the brain* [Tesis doctoral, McGill University].
- Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. *Behavioral and Brain Sciences, 24*(1), 87–114.
- Deming, W. E. (1986). *Out of the crisis*. MIT Press.
- Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J. (2008). Improving fluid intelligence with training on working memory. *Proceedings of the National Academy of Sciences, 105*(19), 6829–6833.
- Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). The Corsi block-tapping task: Standardization and normative data. *Applied Neuropsychology, 7*(4), 252–258.
- Klingberg, T., Fernell, E., Olesen, P. J., Johnson, M., Gustafsson, P., Dahlström, K., Gillberg, C. G., Forssberg, H., & Westerberg, H. (2005). Computerized training of working memory in children with ADHD: A randomized, controlled trial. *Journal of the American Academy of Child & Adolescent Psychiatry, 44*(2), 177–186.
- Logie, R. H. (1995). *Visuo-spatial working memory*. Lawrence Erlbaum Associates.
- Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review, 63*(2), 81–97.
- Milner, B. (1971). Interhemispheric differences in the localization of psychological processes in man. *British Medical Bulletin, 27*(3), 272–277.
- Simons, D. J., Boot, W. R., Charness, N., Gathercole, S. E., Chabris, C. F., Hambrick, D. Z., & Stine-Morrow, E. A. L. (2016). Do "brain-training" programs work? *Psychological Science in the Public Interest, 17*(3), 103–186.
