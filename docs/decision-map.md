# Atlas espacial de decisiones

`/mapa-decisiones.html` es una vista interactiva y autocontenida del catálogo real de LIFE DUEL. No es una pantalla de la partida, no crea salas y no modifica ninguna vida guardada: sirve para entender qué preguntas existen, qué opciones abren, qué requisitos tienen y cómo el motor elige la siguiente situación.

La página se abre en **http://localhost:5173/mapa-decisiones.html** con el cliente en desarrollo, o en la ruta equivalente del servidor compilado. La portada incluye un enlace directo.

## 1. Qué muestra

- Las **dos entradas guiadas** del catálogo, visibles al mismo tiempo en escritorio:
  - `story_first_encounter` — Infancia, 2 años.
  - `tiempo_propio` — Adultez, 18+.
- Cada entrada y cada pregunta expanden sus opciones reales como nodos satélite.
- Al pulsar una opción se añaden:
  1. un nodo de consecuencia con la narrativa y los efectos declarados;
  2. una o varias preguntas siguientes, según las banderas, la edad y la guía del catálogo.
- Las ramas anteriores **permanecen en el mapa**. Se pueden abrir varias opciones de la misma pregunta y comparar los caminos.
- El inspector lateral muestra requisitos, costes, opciones, tiradas base, efectos de éxito y de fallo, banderas activas y la foto aproximada del personaje.
- La **constelación** distribuye las 171 preguntas en cinco grupos por etapa, con buscador y acceso directo para añadir cualquiera al mapa.

## 2. Datos y generación

El atlas no duplica el catálogo a mano. `scripts/build-decision-map.ts` importa:

- `DECISIONS` desde `server/src/simulation/decisions.ts`;
- `listEvents()` desde `server/src/simulation/events.ts`;
- `loadDemographics()` para los países;
- `DECISION_CATEGORY_META` y `EDUCATION_META` desde `shared`.

Después serializa un payload con:

| Campo | Contenido |
| --- | --- |
| `totals` | 171 decisiones, 543 opciones, 30 sucesos, países, decisiones `once`, cooldowns y decisiones con banderas |
| `decisions` | Título, descripción, etapa, categoría, prioridad, edades, requisitos, opciones, costes, tiradas y efectos |
| `guide` | Entradas `A/B`, rutas de infancia y enlaces de adultez |
| `education` / `categories` | Etiquetas y colores compartidos con el juego |
| `countries` | Código, nombre, grupo de ingresos y moneda |
| `events` | Sucesos compartidos y decisión asociada |

La plantilla `client/decision-map/template.html` contiene el HUD, el CSS y los marcadores `__DECISION_MAP_DATA__` y `__DECISION_MAP_APP__`. El script inyecta el JSON y `client/decision-map/app.js`, y valida que no queden marcadores. La salida es `client/public/mapa-decisiones.html`.

```bash
npm run map:build
```

El build principal ya ejecuta esta orden antes de compilar servidor y cliente. Si una decisión de la guía cambia de identificador, la generación falla en vez de producir un enlace muerto.

## 3. Interacción y accesibilidad

- Paneo con arrastre y zoom con rueda o pinza.
- Botones `+`, `−`, `100 %`, `1:1`, `Encuadrar` y `Reiniciar`.
- Minimapa clickable.
- Inspector lateral en escritorio y hoja inferior en móvil.
- Teclado: `+`/`-` para zoom, `0` para encuadrar, `/` para abrir el buscador de la constelación, `Esc` para cerrar.
- `aria-label`, `aria-pressed`, `aria-live` para avisos, `dialog` para la ayuda, foco visible y `prefers-reduced-motion`.
- Sin overflow horizontal verificado a 390 px.

## 4. Qué es aproximado

El atlas usa una **foto de estado aproximada** para que las ramas se puedan explorar sin abrir una partida. Aplica los efectos declarados de una opción y avanza la edad con reglas de muestra. No reproduce:

- la semilla completa ni el mundo compartido de una partida;
- tiradas reales del servidor;
- economía mensual, impuestos, familia viva, arcos o mortalidad;
- puntuación, persistencia o privacidad entre jugadores.

Por tanto, una consecuencia del atlas es una explicación visual del catálogo, no un resultado oficial ni una fuente de verdad para el juego. El servidor sigue siendo la única autoridad de una partida.

## 5. Límites y mantenimiento

- Es una página estática: no consulta `/api` ni Socket.IO y funciona sin backend.
- Se regenera en cada `npm run build`. Si editas decisiones, ejecuta `npm run map:build` antes de abrir la página en producción.
- La guía de entradas es intencionadamente pequeña. Para añadir otra entrada, edita `guide.roots` en el generador y vuelve a ejecutar las pruebas.
- El catálogo completo se puede explorar aunque una decisión no sea alcanzable desde las dos entradas; la constelación la añade con un estado de muestra.
- Las etiquetas de categorías y etapas provienen del código compartido; no se mantienen en dos sitios.

## 6. Verificación

```bash
npm run map:build
npm test -- --run
npx playwright test e2e/decision-map.spec.ts
```

`tests/decision-map.test.ts` comprueba que el HTML generado contiene las 171 decisiones, las 543 opciones, los 30 sucesos, la guía de entradas, los metadatos y que no quedan marcadores de plantilla.

`e2e/decision-map.spec.ts` comprueba en un navegador real:

- las dos entradas visibles;
- una opción abre una consecuencia y una pregunta nueva sin borrar la raíz;
- dos opciones de la misma pregunta conviven;
- la rama guiada llega a la adultez y al curso;
- el zoom, el reinicio y el panel funcionan;
- la constelación busca “epidemia”, añade `respuesta_epidemia` y la pregunta aparece en el mapa;
- una recarga vuelve a un estado inicial limpio;
- el layout de 390 px no desborda.

La ejecución de esa prueba genera capturas locales en `artifacts/` (`decision-map-desktop.png`, `decision-map-branch.png` y `decision-map-mobile.png`). El directorio está ignorado por git.
