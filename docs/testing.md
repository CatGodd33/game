# Pruebas y verificación

## 1. Comandos

```bash
npm test              # Vitest, sin navegador
npm run map:build     # regenera el atlas estático desde el catálogo
npm run typecheck     # shared + server + client
npm run build         # tsup + tsc + vite
npm run e2e           # Playwright con Chrome del sistema
npm run sim:demo      # humo de simulación sin navegador
npm run audit:pacing  # 20 vidas automáticas y métricas de repetición
```

Playwright:

```bash
# Usar Chrome instalado (por defecto)
npm run e2e

# Usar Chromium de Playwright en CI
npx playwright install chromium
E2E_CHANNEL=chromium npm run e2e
```

El `webServer` de Playwright reutiliza un `npm run dev` ya activo. Si no existe, lo arranca con `NODE_ENV=test PERSIST_DIR=.e2e-data LOG_LEVEL=warn` para aislar las partidas de prueba del almacén local, omitir el rate limit de desarrollo y esperar a `http://localhost:5173`. Ese directorio está ignorado por git.

### Resultado de la última ejecución

- Vitest: **26 archivos, 208 pruebas, 204 correctas** (incluye `tests/coherence-v9.test.ts`, `tests/relationship-narrative.test.ts`, `tests/country-paths.test.ts`, `tests/decision-map.test.ts` y `tests/mobile-v22.test.ts`: límite de cuatro escenas, enfoques por edad y catálogo de gasto infantil).
- Playwright: **6 pruebas, 6 correctas** (vida individual completa, duelo en dos contextos, acciones económicas manuales, deudas con pago dirigido, atlas espacial y dashboard móvil 2.2 a 390 px: orden de bloques, sin overflow, Life Record ≤4 y gasto sin empresa ni inversión).
- `npm run typecheck`: correcto.
- `npm run build`: correcto; cliente de 909,50 kB (273,78 kB gzip), CSS de 162,66 kB (34,87 kB gzip) y aviso no bloqueante de chunk.
- Reinicio real del servidor compilado: sesión y partida recuperadas con la misma huella de semilla, nacimiento y turno.
- Arranque de producción (`node server/dist/index.js`) en el puerto 4105: `GET /api/health` devuelve `status: ok`, persistencia JSON y modo IA local.
- Producción: `https://life-duel.onrender.com/api/health` devuelve `version: 2.3.0` con `persistence: postgres`; la portada sirve el bundle nuevo y muestra «versión 2.3».
- Inicio y panel de vida sin overflow horizontal en 390, 768 y 1440 px.
- Banco compacto: máximo de cinco filas y sin overflow interno en 390 px; la animación del saldo termina en el importe autoritativo.

## 2. Suites Vitest

### `tests/simulation.test.ts`
Motor puro:

- misma semilla → mismo nacimiento, mundo, eventos y estadísticas;
- ambos jugadores reciben el mismo nacimiento y eventos compartidos;
- privacidad de la decisión rival y consecuencias independientes;
- límites 0–100 y redondeo;
- costes, ingresos y deuda registrados en ledger;
- tiradas y política automática reproducibles;
- puntuaciones por categoría y empate;
- muerte individual y continuación del superviviente en duelo;
- rechazo de decisiones tras finalizar y de claves duplicadas;
- historial con categoría y economía;
- la semilla completa no se expone.

### `tests/decision-map.test.ts`
Atlas espacial estático:

- el HTML generado contiene las 196 decisiones, 624 opciones y 30 sucesos del catálogo real;
- no quedan los marcadores `__DECISION_MAP_DATA__` ni `__DECISION_MAP_APP__`;
- la plantilla incluye el lienzo (`map-viewport`) y la constelación;
- todas las entradas de la guía (`story_first_encounter`, `tiempo_propio`, rutas de infancia, adultez y curso) apuntan a decisiones existentes;
- cada decisión publicada conserva título, descripción, etapa, rango de edad, opciones y narrativa de éxito.

### `tests/story.test.ts`
Flujo narrativo y reloj manual:

- una vida manual no crea deadline ni avanza por el reloj;
- el modo automático sí programa y ejecuta el avance;
- la crónica anual produce hasta cuatro escenas, es determinista y no repite las frases recientes;
- la crónica no modifica dinero ni estadísticas;
- el eco anual inline (`YearEcho`) se cubre en el e2e individual: tras elegir con un clic, la página muestra el resultado y avanza de edad sin modales intermedios.

### `tests/persistence-http.test.ts`
- Guardar una partida, crear una nueva instancia de `JsonGameStore` y recuperar exactamente semilla, nacimiento, mundo, pendiente, historial, personalidad financiera y decisiones.
- Guardado repetido, búsqueda por código y borrado.
- Archivo corrupto → copia `.corrupt-*`, arranque vacío.
- HTTP: sesión inválida, alias inválido, falta de token, pesos que no suman 100.
- Creación individual, acceso de un tercero (`403`), decisión inválida (`400`).
- Epílogo local al terminar una vida.

### `tests/service.test.ts`
- Creación de sala, preview, unión, listo y comienzo.
- Nacimiento idéntico a través del servicio.
- Dos decisiones simultáneas con `Promise.all` y serialización por lock.
- Duplicado idempotente sin bloquear al rival.
- Presencia de sockets, abandono y revancha tras finalizar.
- Reconstrucción de `GameService` con el mismo almacén y recuperación del estado.
- Rechazo de pagos y funerales cuando la partida ya terminó, para no alterar un resultado cerrado.

### `tests/debts-funerals-diary.test.ts`
- Pago parcial y total de un préstamo concreto, con reducción del saldo y de `finance.debt`.
- Rechazo de importes por encima del saldo disponible o del pendiente.
- Condonación de un préstamo familiar al morir el acreedor; el préstamo bancario permanece.
- Funeral pendiente sin cobro automático, coste correcto, efectos de bienestar e idempotencia (misma clave duplicada; misma clave con otra opción, `409`).
- Despedida sin ceremonia sin coste y con efecto en felicidad/relaciones.
- Diario de escenas anuales sin resúmenes financieros ni escenas genéricas eliminadas.
- Encuentros online con peso reducido y requisito educativo.

### `e2e/debts.spec.ts`
- Crea una vida adulta pausada, genera un préstamo desde la UI y abre «Tus deudas».
- Paga 100 USD PPP contra la fila correcta y compara el resultado con `GET /api/games/:id`.
- Comprueba ausencia de overflow horizontal a 390 px y captura ambas vistas.


### `tests/realism.test.ts`
Modelo de vida realista v2:

- hogar reproducible y presupuesto coherente;
- poliginia solo en contextos legales y religiosos compatibles;
- psicología limitada a 0–100;
- quiebra personal limitada, con banderas no duplicadas;
- ingresos y costes de empresa en el libro mayor;
- herencia liquidada una sola vez;
- funeral pendiente que solo se cobra al elegir ceremonia y no admite doble cobro;
- 196 decisiones, identificadores únicos y al menos dos opciones base por decisión (la interfaz garantiza varios caminos);
- resultado final con psicología, empresa, hogar y saldo de préstamos.

### `tests/context-v3.test.ts`
Contexto realista v3:

- toda decisión (83) produce al menos cinco opciones visibles incluso con cero dinero y requisitos incumplidos;
- las decisiones culturales solo aparecen en el contexto compatible (mujer, India, familia);
- el coste de migración depende de origen y destino;
- el banco genera doce meses, suma suministros y cierra exactamente en el saldo autoritativo;
- las decisiones nuevas (presión social, migración, contrato, empresa, vivienda, segunda oportunidad, descanso digital, mascota, inversión, hogar, voluntariado, arte, testamento y límites laborales) existen y tienen al menos cinco opciones.

### `tests/recovery.test.ts`
Salidas ante la crisis y política automática:

- un personaje adulto con desempleo, deuda o salud baja recibe una decisión `recovery`;
- un personaje estable no recibe recuperación;
- existen `reconstruir_empleo`, `renegociar_deudas` y `recuperar_salud`, con cinco opciones cada una; empleo y salud son repetibles y la deuda es única;
- ninguna opción de recuperación regala más de 1.000 USD;
- tras usar la recuperación se puede volver a una decisión mayor;
- el automático devuelve siempre una opción visible, varía entre semillas y es determinista para la misma semilla, jugador y turno;
- la infancia no acumula gastos ni deuda personal y un menor puede elegir una opción con coste sin endeudarse.

### `tests/socket.test.ts`
Servidor HTTP real + Socket.IO + dos clientes:

- socket anónimo rechazado con `No autorizado.`;
- dos suscripciones autenticadas;
- nacimiento compartido;
- vista privada: el rival ve `hasSubmitted=true` pero `ownChoice=null`;
- resolución al enviar la segunda decisión;
- entrada inválida rechazada con `VALIDATION_ERROR`;
- desconexión, presencia actualizada y reconexión;
- clave duplicada devuelve `duplicate: true`.

### `tests/coherence-v9.test.ts`
- La epidemia compartida ofrece a los 8 años solo opciones infantiles, a los 15 las adolescentes y a los 25 las adultas.
- Las escenas de relación no fijan Italia; el país de la pareja se sortea con la semilla y nunca coincide con el actual.
- `primer_billete` aparece a los 17–19 con cuatro caminos y destino aleatorio reproducible.
- Los arcos no encadenan más de tres por vida ni repiten capítulos; la deuda familiar exige nivel socioeconómico bajo/medio-bajo, empieza a los 10 y no aparece en todas las vidas.
- El patrimonio alto genera mantenimiento registrado y una vista `wealthPressure` visible para cada jugador, sin filtrar la decisión privada del rival.


## 3. Playwright

### `e2e/decision-map.spec.ts` → atlas espacial
1. Dos raíces visibles: Infancia y Adultez, con contadores en 2/0.
2. La opción `observe` abre `infancia_ruta_curioso` y la raíz anterior permanece.
3. `explore` abre una segunda rama; las dos siguen en el mapa.
4. La rama guiada llega a `tiempo_propio`, `ruta_curso_proyecto` y `ruta_beca_exterior`.
5. Zoom real, reinicio a 100 %, inspector y cierre del panel.
6. Constelación con 196 nodos, búsqueda de “epidemia” y adición de `respuesta_epidemia`.
7. Recarga limpia y layout de 390 px sin overflow horizontal.
8. Sin errores de página.

### `e2e/life-duel.spec.ts` → vida individual
1. Inicio.
2. Nueva vida.
3. Creación real contra API.
4. Aparición del prompt.
5. Sin modal de confirmación: la decisión se registra con un clic y el eco anual aparece inline.
6. Dos avances manuales hasta la decisión de los 2 años.
7. Decisión con un clic, comprobación de la edad siguiente y del comparador sin rival.
8. Historial y exportación visible.
9. Avance por API hasta el final.
10. Pantalla final, tarjeta y enlace al historial.
11. Sin errores de página.

La prueba usa el botón **«Vivir el siguiente año»**, no un autoavance. El helper `advanceUntilDecision` pulsa ese botón y se detiene al encontrar `#decision-title`; no hay ningún resumen modal que cerrar.

La prueba individual tolera una muerte temprana: si la vida termina antes de poder avanzar, comprueba el final en lugar de asumir que siempre se alcanza el año 1.

También comprueba que el panel de vida no genera scroll horizontal a 390 px.

### `e2e/life-duel.spec.ts` → duelo
1. Dos contextos de navegador aislados (sesiones distintas).
2. Anfitrión crea sala.
3. Invitado introduce código y alias.
4. Sala compartida y presencia.
5. Ambos listos y anfitrión comienza.
6. Ambos redirigidos al mismo `gameId`.
7. Comparación vía API real: mismo `world.birth`, misma huella y mismos `sharedEvents`.
8. Mismo prompt de decisión.
9. Anfitrión elige; invitado comprueba `opponent.hasSubmitted` y `ownChoice=null`.
10. Invitado elige una opción distinta.
11. Ambos alcanzan el siguiente estado coherente (año 1 o final si una vida murió antes).
12. Decisiones reveladas y diferentes.
13. Sin errores de página.

## 4. Mapa de criterios de aceptación

| Criterio | Verificación |
| --- | --- |
| Arranque correcto | `npm run dev`, health, e2e. |
| Interfaz en español | Revisión UI + e2e. |
| Vida individual | Vitest + e2e completo. |
| Dos navegadores en la misma sala | e2e con dos contextos. |
| Mismo nacimiento | Tests de motor, servicio, socket y e2e. |
| Mismos eventos compartidos | Tests comparan `sharedEvents`. |
| Decisiones diferentes | Servicio, sockets y e2e. |
| Consecuencias independientes | Test de stats y historial. |
| Estadísticas comparables | Vistas y comparador; tests de vistas. |
| Simulación coherente | Motor determinista + tests de límites. |
| Muertes en momentos distintos | Test de superviviente. |
| Final de partida | Motor + e2e de final. |
| Ganador/empate | Tests de scoring y comparación. |
| Historial persistente | JSON + servicio reconstruido + HTTP. |
| Desconexión no destruye | Socket test de reconexión. |
| Compilación sin errores | `npm run typecheck` y `npm run build`. |
| Pruebas principales pasan | `npm test` y `npm run e2e`. |
| Sin botones principales vacíos | Rutas y flujos e2e; acciones reales en UI. |
| Resumen anual y ritmo manual | `tests/story.test.ts` + e2e individual. |
| Variantes, cooldown, empresa y mascotas v5 | `tests/v5.test.ts` (10 pruebas). |
| Crónica determinista | `tests/story.test.ts`. |
| Sin errores críticos sin documentar | `docs/limitations.md`. |

## 5. Datos de prueba

- Las pruebas no tocan PostgreSQL ni servicios externos.
- `tests/helpers.ts` define `MemoryGameStore` y configuración fija (`ESP`, 60 años) para velocidad y reproducibilidad.
- Los tests de persistencia usan directorios temporales y los limpian.
- No se usan claves reales.
- Los puertos de Socket.IO se asignan dinámicamente (`listen(0)`).

## 6. Interpretación de resultados

- Un fallo de tipo `expected -0 to equal 0` es una diferencia de serialización JSON sin efecto de juego; los tests de persistencia comparan valores y estructura, no representaciones negativas de cero.
- Los tests de UI se ejecutan en un solo worker para evitar carreras de salas y comparten servidor de desarrollo.
- Si Playwright falla por no encontrar Chrome, usar `E2E_CHANNEL=chromium` tras instalar Chromium.

## 7. Añadir pruebas

- Reglas del motor: añadir a `tests/simulation.test.ts`.
- Nuevos endpoints: `tests/persistence-http.test.ts` con Supertest.
- Concurrencia: `tests/service.test.ts`.
- Tiempo real: `tests/socket.test.ts`.
- Flujos visuales: `e2e/`.

Ejecuta siempre `npm run typecheck` y `npm run build` además de las pruebas.


## Capa v5

`tests/v5.test.ts` verifica que las variantes narrativas conservan exactamente los mismos identificadores de opción, que la selección es determinista por semilla/turno, que `cooldownYears` bloquea una decisión de empresa reciente, que `parentsAlive` funciona con el registro de nacimiento cuando no hay historia familiar, que `hasPet` acepta mascotas reales y banderas heredadas, que el automático elige una apertura de negocio con liquidez, que una empresa genera ingresos y puede venderse, que las mascotas envejecen dentro de 0–100 y que las decisiones manuales son el valor por defecto (`autoDecisions=false`). `tests/pacing-v8.test.ts` añade variantes ligadas al suceso, cooldowns de evento, intervalo global, calendario de infancia/adolescencia y pool de empresa.

Los flujos Playwright cubren la vida individual completa, con registro de nacimiento, decisión, historial, comparador y final, y un duelo real entre dos contextos con nacimiento/eventos idénticos, decisiones privadas y sincronización. El flujo individual avanza con «Siguiente decisión» y elige sin diálogo de confirmación; el balance anual queda abierto bajo el diario. El avance final usa el contexto de peticiones de Playwright para no bloquear la pestaña con una vida larga. El duelo activa sus decisiones desde la interfaz y comprueba que solo el anfitrión controla el modo automático.
