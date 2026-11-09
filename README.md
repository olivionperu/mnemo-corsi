# 404: Amor no encontrado

Juego web 3D con estética pixel art para entrenar la **memoria de trabajo visoespacial**. Está basado en la prueba de bloques de Corsi (Corsi, 1972; Milner, 1971).

**Jugar en línea:** https://olivionperu.github.io/mnemo-corsi/

Kevin, programador junior, quedó en visto para siempre. Para olvidarla, primero tiene que recordar todas sus mentiras. Cada sala es un recuerdo de la relación con una frase de ELLA ("Solo es un amigo", "Ya estoy lista en 5 minutos"…). En cada sala, unas cajas de recuerdos se encienden en secuencia. Si el jugador las toca en el orden correcto, la puerta se abre y Kevin avanza al siguiente recuerdo, donde la secuencia tiene una caja más.

## Cómo se juega

1. Escribe tu nombre o código (opcional) y elige **orden directo** u **orden inverso**.
2. La primera vez hay una **práctica guiada**: una flecha señala qué caja tocar.
3. Cada recuerdo muestra una tarjeta con la frase de ELLA. Pulsa **Estoy listo** (o Espacio) cuando quieras empezar.
4. Las cajas se encienden a razón de **una por segundo**, como en el protocolo estándar. Luego aparece "Tu turno".
5. Si aciertas, la puerta se abre con una lluvia de corazones rotos. Si fallas, el juego te muestra la secuencia correcta.
6. Tienes **2 intentos por recuerdo**. Si fallas ambos, el viaje termina y ves tu **amplitud de Corsi**.
7. Al final puedes responder la encuesta de usabilidad y ver tu evolución en **Mi progreso**.

### Modo presentador (para la exposición)

| Tecla | Acción |
|---|---|
| `P` | Activa o desactiva el modo presentador (muestra la flecha en todas las secuencias) |
| `C` | Responde correctamente la secuencia actual |
| `X` | Fuerza un error |
| `1` a `8` | Salta directamente a ese recuerdo |

Las partidas con modo presentador se marcan en el CSV y no cuentan como récord ni aparecen en el gráfico.

## Ejecutar en local

No necesita instalación, compilación ni internet: el motor 3D y la fuente están dentro del proyecto.

```bash
python -m http.server 5190
```

Luego abrir `http://localhost:5190`. Las pruebas automáticas se ejecutan con Node 18 o superior:

```bash
npm test
```

## Tecnologías

| Parte | Tecnología |
|---|---|
| Motor 3D | [Three.js](https://threejs.org) r160, incluido en `vendor/` para funcionar sin internet |
| Estilo pixel | Render a 1/3 de la resolución con `image-rendering: pixelated` y texturas de 16 px generadas por código |
| Efectos | Partículas de píxeles y temblor de cámara (`js/fx.js`) |
| Sonido | Web Audio API: sonidos 8 bits sintetizados, sin archivos externos |
| Datos | `localStorage`, gráfico SVG propio y exportación a CSV |
| Pruebas | `node:test` (12 pruebas unitarias) y Playwright (partida completa de extremo a extremo, sin internet) |

## Estructura del proyecto

```
index.html          Pantallas: carga, inicio, HUD, tarjeta de recuerdo, resultado, progreso, encuesta
css/style.css       Paleta, tipografía Pixelify Sans local, bordes pixelados
js/corsi.js         Lógica pura de la prueba de Corsi (secuencias, validación, puntaje)
js/story.js         Narrativa: recuerdos, frases de ELLA y mensajes de acierto y error
js/sus.js           Encuesta System Usability Scale y su puntaje
js/world.js         Salas 3D: piso, muros, puerta, antorchas, cajas y paletas
js/player.js        Kevin, el programador vóxel, y sus animaciones
js/fx.js            Partículas y temblor de cámara
js/main.js          Escena, cámara, máquina de estados, modo presentador, progreso
js/tween.js         Animaciones basadas en el tiempo del juego
js/audio.js         Efectos de sonido sintetizados
js/stats.js         Partidas, récords, participante, SUS y exportación CSV
vendor/             Three.js
fonts/              Pixelify Sans
tests/              Pruebas automáticas
capturas/           Pantallazos de la funcionalidad
```

### Máquina de estados

```
inicio -> listo -> mostrando -> respuesta -> (acierto) -> transición -> listo ...
                                          -> (error) -> secuencia correcta -> listo (si quedan intentos)
                                                                           -> resultado (sin intentos)
```

## Fundamento psicológico (resumen para el marco teórico)

| Decisión de diseño | Fundamento |
|---|---|
| 9 cajas en posiciones irregulares | Diseño original de Corsi (1972). La disposición irregular impide usar patrones geométricos y obliga a recordar ubicaciones. |
| Una caja por segundo | Protocolo estandarizado (Kessels et al., 2000). |
| La secuencia empieza en 2 y sube de 1 en 1 | Medición de la amplitud de memoria. Los límites de capacidad de Miller (1956) y Cowan (2001) explican por qué la dificultad crece rápido después de 4 a 6 elementos. |
| 2 intentos por longitud | Regla clásica de interrupción de la prueba. |
| Práctica guiada antes de puntuar | El protocolo de Corsi incluye ensayos de práctica para que el puntaje mida memoria y no comprensión de la tarea. |
| Botón "Estoy listo" | El jugador controla cuándo empieza cada ensayo, así un parpadeo o una distracción no se confunden con un fallo de memoria. |
| Modo inverso | Exige manipular la información, no solo retenerla, y carga más al ejecutivo central (Baddeley y Hitch, 1974). |
| Mismo sonido para todas las cajas | Evita codificar la secuencia como melodía (bucle fonológico), de modo que la tarea siga siendo visoespacial (Logie, 1995). |
| Mostrar la secuencia correcta tras un error | Retroalimentación inmediata: el jugador ve qué falló en lugar de solo perder. |
| Narrativa humorística | El humor mejora la atención y el recuerdo del material (Schmidt, 1994) y aumenta la motivación para repetir el entrenamiento. Las frases están en la tarjeta, no en las cajas, para no contaminar la tarea visoespacial. |
| Registro de tiempos y aciertos | Permite medir el progreso, como en los estudios de entrenamiento cognitivo (Klingberg et al., 2005; Jaeggi et al., 2008). Se cita la evidencia crítica de Simons et al. (2016) sobre la transferencia limitada. |
| Encuesta SUS | Instrumento estándar de usabilidad (Brooke, 1996), interpretado con la escala de Bangor et al. (2009). |

## Calidad total: aplicación del ciclo PDCA de W. Edwards Deming

El proyecto se desarrolló en iteraciones cortas usando el ciclo **Planificar, Hacer, Verificar, Actuar** (Deming, 1986).

### Ciclo 1: núcleo del juego
- **Planificar:** se definieron los requisitos a partir del protocolo de Corsi (9 cajas, 1 caja/s, 2 intentos por longitud, modos directo e inverso).
- **Hacer:** se programó primero la lógica pura (`corsi.js`), separada del 3D, para probarla de forma aislada.
- **Verificar:** 8 pruebas automáticas cubren secuencias sin repeticiones, modo inverso, validación paso a paso, distribución de cajas y estadísticas. Todas pasan.
- **Actuar:** se corrigió el script de pruebas, que en Windows no encontraba la carpeta `tests/`.

### Ciclo 2: mundo 3D y jugabilidad
- **Planificar:** cada nivel es una sala con una puerta. Acertar abre la puerta y el personaje avanza.
- **Hacer:** salas, puerta animada, personaje y transición de cámara.
- **Verificar:** una prueba automatizada (Playwright) jugó una partida completa con clics reales, sin errores en la consola.
- **Actuar:** las capturas revelaron 3 defectos, que se corrigieron:
  1. El número sobre la puerta no se leía. Se reemplazó por una fuente de píxeles de 3x5 dibujada a mano.
  2. En el celular, la cámara cortaba la sala. Se agregó una cámara cenital para pantallas verticales.
  3. El "2" en negrita del HUD parecía un "8". Se cambió el grosor de la fuente.

### Ciclo 3: revisión UX/UI y temática
- **Planificar:** una revisión de experiencia de usuario priorizó los riesgos: dependencia de internet en la exposición, falta de práctica, inicio abrupto de cada secuencia, poca retroalimentación y ausencia de métricas de usabilidad.
- **Hacer:** se incluyeron Three.js y la fuente en el proyecto, se agregó la pantalla de carga, la práctica guiada con flecha, el botón "Estoy listo", la confirmación al salir, partículas y temblor de cámara, la repetición de la secuencia correcta tras un error, el modo presentador, el código de participante, la pantalla Mi progreso y la encuesta SUS. Se cambió la temática a la historia de Kevin.
- **Verificar:** 12 pruebas unitarias pasan. La prueba de extremo a extremo se ejecutó **bloqueando todo internet**: 0 peticiones externas, 0 errores, encuesta SUS calculada (75/100) y CSV con participante y puntaje SUS.
- **Actuar:** las capturas revelaron 3 defectos, que se corrigieron:
  1. La pantalla de la laptop de Kevin miraba hacia la cámara y su brillo tapaba al personaje. Se giró la tapa.
  2. La fuente pixel dibujaba mal la ligadura "fl" ("flecha" se leía "Aecha"). Se desactivaron las ligaduras.
  3. En el celular se mostraba "pulsa Espacio", que no aplica a pantallas táctiles. Se oculta en dispositivos táctiles.

### Ciclo 4: validación con usuarios (para completar por el equipo)
- **Planificar:** probar con 5 a 10 compañeros, cada uno con un código (P01, P02…).
- **Hacer:** cada participante juega una partida en cada modo y responde la encuesta SUS.
- **Verificar:** descargar el CSV desde "Mi progreso" y comparar amplitud, aciertos, tiempos y puntaje SUS promedio.
- **Actuar:** registrar los cambios que se hagan y su justificación.

### Relación con los 14 puntos de Deming (selección)
- **Punto 1, constancia en el propósito:** reforzar la memoria visoespacial guió cada decisión, incluso la narrativa (las frases van en la tarjeta, no en las cajas).
- **Punto 3, no depender de la inspección masiva:** las pruebas automáticas incorporan la calidad durante el desarrollo.
- **Punto 5, mejora continua:** cada ciclo PDCA dejó evidencia del antes y el después.
- **Punto 9, derribar barreras entre áreas:** lógica, narrativa, gráficos e interfaz están en módulos separados, de modo que cada integrante puede trabajar en uno sin bloquear a los demás.

## Publicar en línea (GitHub Pages)

El juego está publicado desde la rama `main` en GitHub Pages. Cualquier `git push` actualiza la página en uno o dos minutos.

## Referencias (APA 7)

Antes de entregar, verifiquen cada referencia y agreguen el DOI.

- Anguera, J. A., Boccanfuso, J., Rintoul, J. L., Al-Hashimi, O., Faraji, F., Janowich, J., Kong, E., Larraburo, Y., Rolle, C., Johnston, E., & Gazzaley, A. (2013). Video game training enhances cognitive control in older adults. *Nature, 501*(7465), 97–101.
- Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system and its control processes. En K. W. Spence & J. T. Spence (Eds.), *The psychology of learning and motivation* (Vol. 2, pp. 89–195). Academic Press.
- Baddeley, A. D., & Hitch, G. (1974). Working memory. En G. H. Bower (Ed.), *The psychology of learning and motivation* (Vol. 8, pp. 47–89). Academic Press.
- Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies, 4*(3), 114–123.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. En P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis.
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
- Schmidt, S. R. (1994). Effects of humor on sentence memory. *Journal of Experimental Psychology: Learning, Memory, and Cognition, 20*(4), 953–967.
- Simons, D. J., Boot, W. R., Charness, N., Gathercole, S. E., Chabris, C. F., Hambrick, D. Z., & Stine-Morrow, E. A. L. (2016). Do "brain-training" programs work? *Psychological Science in the Public Interest, 17*(3), 103–186.
