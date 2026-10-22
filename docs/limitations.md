# Estado del proyecto y limitaciones

## 1. Resumen honesto

El núcleo del juego está implementado y verificado en local: simulación determinista, vida individual, duelo online, decisiones privadas, economía, mortalidad, puntuación, historial, persistencia JSON, reconexión, UI responsive y pruebas automatizadas.

No se afirma que estén verificadas las integraciones que requieren infraestructura ausente en este entorno: PostgreSQL real, clave de DeepSeek y Docker. Su código existe y compila, pero no se ejecutaron contra servicios reales.

## 2. Matriz de estado

| Área | Estado | Verificación |
| --- | --- | --- |
| Motor determinista | Completo | Vitest, demo. |
| Nacimiento compartido | Completo | Vitest, sockets, e2e. |
| Decisiones y elegibilidad | Completo (196 decisiones y 624 opciones, filtros por edad y contexto, variantes narrativas y cooldowns) | Vitest, servicio, e2e. |
| Atlas espacial de decisiones | Completo | Vitest del catálogo y e2e de ramas, constelación y 390 px. |
| Salidas ante crisis | Completo | 10 pruebas de recuperación, infancia y selector; 3 decisiones `recovery`. |
| Eventos compartidos | Completo (30) | Vitest, e2e. |
| Economía y ledger | Completo | Vitest, auditoría manual. |
| Hogar, familia y psicología v2 | Completo provisional | 9 pruebas Vitest, simulación y UI. |
| Contexto de país y economía v3 | Completo provisional | 5 pruebas Vitest, UI y revisión de datos. |
| Vida en vivo y eco anual inline | Completo | 7 pruebas de flujo narrativo + e2e. |
| Variantes, empresa, familia y mascotas v5 | Completo provisional | `tests/v5.test.ts`, e2e y revisión visual. |
| Crónica anual v4 | Completo provisional | Test de determinismo, UI y revisión manual. |
| Empresas, préstamos y quiebra | Completo | Vitest y libro mayor. |
| Vista de deudas y pago dirigido | Completo | Vitest y e2e (`debts.spec.ts`). |
| Funerales interactivos y condonación familiar | Completo provisional | 8 pruebas Vitest, UI y revisión visual. |
| Diario narrativo sin resumen financiero | Completo provisional | Tests de escenas anuales, unicidad y revisión de textos. |
| Coherencia de decisiones por edad | Completo | `tests/coherence-v9.test.ts`: epidemia a los 8, 15 y 25 años. |
| Variedad de arcos | Completo provisional | 5 semillas, máximo 3 arcos y capítulos sin repetición. |
| Presión patrimonial | Completo provisional | Patrimonio, mantenimiento, decisiones y vista para ambos jugadores. |
| Relaciones y país aleatorio | Completo | Escenas reescritas; `intercambio` sin Italia fija. |
| Dashboard móvil 2.2 | Completo | e2e de orden y 390 px, Life Record de cuatro escenas, pasaporte y catálogo infantil filtrado. |
| Salud y mortalidad | Completo provisional | Vitest, demo. |
| Puntuación configurable | Completo | Vitest, UI. |
| Vida individual | Completo | e2e. |
| Salas y duelo | Completo | Servicio, sockets, e2e. |
| Privacidad de decisiones | Completo | Vistas, sockets, e2e. |
| Reconexión | Completo | Socket test, UI. |
| Persistencia JSON | Completo | Test de reinicio + corrupción. |
| PostgreSQL/Prisma | Implementado, no probado con servidor real | `prisma validate/generate`; prueba pendiente en entorno con PostgreSQL. |
| DeepSeek | Integrado con fallback, no ejecutado sin clave | Fallback local probado. |
| Historial/exportación | Completo | HTTP, UI. |
| Tarjeta resumen | Completo | Canvas en navegador. |
| Docker | Preparado, no ejecutado | Docker no instalado. |
| Internacionalización | Español; arquitectura preparada | Textos centralizados por pantalla, sin framework i18n. |
| Accesibilidad | Base sólida | Teclado, ARIA, foco, reducción de movimiento; sin auditoría WCAG formal. |

## 3. Limitaciones de datos

- El dataset contiene 16 países y valores redondeados. No es exhaustivo.
- Los índices derivados (coste de vida, acceso sanitario, calidad educativa, riesgo ambiental, protección social) son parámetros de simulación.
- La conversión PPP es aproximada y no es un tipo de cambio de mercado.
- Las listas de nombres son ejemplos culturales.
- Las tablas de mortalidad completas no están disponibles: se usa Gompertz calibrado, marcado `provisional`.
- Las causas de muerte son pesos de juego, no estadísticas epidemiológicas.
- `data/realism-model.json` contiene pesos de ocupación, estructura familiar, religión, apoyo y contexto cultural. Son parámetros de simulación, no distribuciones oficiales.
- La poliginia solo se activa en contextos legales modelados y religión compatible; no describe a las personas jugadoras.
- Los ingresos parentales se calibran al quintil y al país, pero no sustituyen encuestas de hogares reales.
- `data/country-context.json` es una capa provisional de simulación: tipos hipotecarios, alquileres, visados y presión social no son ofertas ni frecuencias oficiales.
- La dificultad de visado es un parámetro 0–100, no una probabilidad legal de concesión.
- Los perfiles de gasto mensual son proporciones aproximadas para generar variedad, no encuestas de presupuestos familiares.

## 4. Limitaciones de simulación

- Es un juego, no un modelo sociológico ni una predicción.
- La economía simplifica impuestos, pensiones y deuda.
- Las decisiones se resuelven en pasos anuales.
- La política automática es un asesor por utilidad, reproducible pero no óptimo; elige de forma ponderada entre las tres mejores opciones y no prevé la tirada futura.
- Algunos efectos de largo plazo se representan con modificadores y efectos programados, no con un mercado laboral detallado.
- La migración modela destino, coste, visado aproximado, rechazo y estatus irregular; no reproduce trámites legales ni concede ciudadanía.
- La hipoteca es deuda agregada: no hay valor de propiedad, escritura, plusvalía ni amortización mensual independiente.
- La vista de deudas concilia por resta cuando una partida antigua o una factura no tiene un préstamo individual asociado; esa fila se ofrece como deuda residual. No reconstruye la contabilidad histórica de versiones anteriores.
- El coste de un funeral es un parámetro de juego acotado, no una tabla de precios funerarios oficial. Las ceremonias pendientes no bloquean el reloj y el modo automático no las resuelve por su cuenta.
- Los encuentros a distancia (`encuentro_red`, `encuentro_intercambio`) tienen peso reducido y requieren educación secundaria; pueden no aparecer en una vida concreta, que es el comportamiento buscado.
- El extracto bancario de doce meses es una vista derivada del cierre anual, no doce transacciones contables separadas.
- Los costes de empresa no se reescalan por completo con el nivel de precios de cada país.
- La cesta esencial se escala a la capacidad de gasto del hogar para evitar deuda infinita. Es una aproximación de simulación: no modela hambre, déficit calórico ni calidad efectiva de la vivienda resultante.
- Las salidas de empleo y salud son repetibles para que una crisis larga no deje la vida sin opciones; la deuda solo se renegocia una vez. No son una garantía de recuperación.
- No hay eventos aleatorios basados en texto generativo; el texto es estructurado y reproducible.
- La crónica usa bancos de plantillas deterministas y arcos de tres capítulos. Da variedad y contexto, pero no es un modelo generativo ni una novela infinita: vidas muy largas pueden reconocer estructuras repetidas.
- Los presupuestos de movilidad (vuelos, visados, seguros, depósitos, matrículas y manutención) son estimaciones de simulación derivadas del PIB/PPP y del contexto de país; no son tarifas reales ni asesoramiento migratorio. La probabilidad de éxito es orientativa y la decide el servidor.
- Las opciones de una decisión pueden tener requisitos de edad. La epidemia comparte el mismo suceso de mundo, pero un personaje de 8 años no recibe opciones de empleo o nómina.
- El país de una pareja internacional y el destino de `primer_billete` se sortean con la semilla. La escena no promete que la relación funcione ni que migrar mejore la vida.
- El mantenimiento patrimonial es un parámetro de simulación (1,2 % del exceso sobre cuatro veces la capacidad económica anual, con techo). No es un impuesto real ni una comisión bancaria.
- La presión patrimonial mide complejidad y fragilidad (deuda, liquidez, concentración en activos), no una probabilidad exacta de quiebra.
- Los cuatro arcos nuevos y el mazo de tres por vida reducen la repetición, pero no hacen que cada biografía sea única. Las estructuras narrativas siguen siendo reconocibles.
- Las cinco opciones incluyen repliegues cuando no hay cinco alternativas específicas elegibles. El jugador ve cinco caminos reales, pero no todos son exclusivos de esa decisión.
- El eco anual es informativo y aparece inline después de resolver el año; no es una pausa interactiva dentro del año. La vida sigue siendo una decisión principal por año, acompañada de crónica.
- El presupuesto familiar es un contexto de nacimiento; no se simulan cada factura, la revalorización de activos ni la economía interna de todos los parientes.
- La herencia se estima al nacer y no incorpora cambios patrimoniales posteriores.
- La salud y mortalidad de parientes son propias, pero sus carreras y decisiones no tienen la profundidad del jugador.
- La psicología es un modelo de estado, no una evaluación clínica.
- Las decisiones de empresa y préstamos usan parámetros provisionales de mercado.
- La condonación de deuda familiar se dispara con la muerte del acreedor registrado; un préstamo antiguo sin vínculo individual solo se asocia al progenitor vivo al concederse.

## 5. Limitaciones técnicas

- **PostgreSQL:** el adaptador usa Prisma 7 + `@prisma/adapter-pg`; el esquema valida, el cliente se genera y la migración existe. `npm start` aplica `prisma migrate deploy` automáticamente si `PERSISTENCE=postgres`. Sigue faltando una prueba end-to-end contra una instancia real de Neon/PostgreSQL: el primer despliegue debe comprobar `/api/health`, crear un duelo y recargar.
- **DeepSeek:** no hay clave configurada. El flujo de error/fallback está probado; la llamada real no. La IA solo redacta el epílogo y nunca altera estado.
- **Docker:** `Dockerfile` y `docker-compose.yml` están preparados, pero Docker no está disponible en el entorno de desarrollo. No se ejecutó el compose.
- **Escala:** JSON es un único archivo y está pensado para desarrollo/pruebas. Para carga real, usar PostgreSQL y un despliegue con múltiples instancias compartiendo la misma base.
- **Render + Neon:** desplegado en `https://life-duel.onrender.com` con servicio free de Render y PostgreSQL de Neon. **Verificado el 22/10/2026: `/api/health` devuelve `version: 2.3.0` con `persistence: postgres` y la portada muestra «versión 2.3».** El plan gratuito duerme el servicio tras inactividad y Neon puede suspenderse; el primer acceso puede tardar 30–60 s. El autoDeploy puede no lanzar el build aunque el push llegue a `main`: en la 2.2 no se disparó y el primer build manual falló por el lockfile desalineado (`@life-duel/shared@1.0.0`); corregido en `3b76eba`, el deploy manual quedó Live. Si vuelve a pasar, **Manual Deploy → Deploy latest commit** y comprobar que cambia el `assets/index-*.js`. Ver [`docs/deployment.md`](deployment.md).
- **Atlas de decisiones:** `client/public/mapa-decisiones.html` es una página estática generada en el build. No consulta partidas ni sustituye al servidor: sirve para explorar el catálogo y el algoritmo. Las estadísticas que muestra al abrir una rama son aproximadas y no se guardan. Si cambia una decisión, hay que ejecutar `npm run map:build`; las pruebas detectan enlaces de guía muertos y datos desincronizados.
- **Sesiones:** no hay recuperación de cuenta; si se borra `localStorage` o cambia el secreto, se pierde el acceso a las partidas asociadas.
- **Bundle:** el cliente genera un aviso de ~910 kB (274 kB gzip). Se puede dividir con lazy routes y manual chunks.
- **i18n:** todos los textos están en español; no hay selector de idioma ni extracción a catálogos.
- **Accesibilidad:** hay base (skip link, focus trap, roles, teclado, contraste y movimiento reducido), pero falta una auditoría con lector de pantalla y axe.
- **Móvil:** dashboard 2.2 verificado a 390×844 con Playwright; bloques en orden, sin overflow, Life Record de cuatro escenas, pasaporte y acordeones. No se probó en dispositivos físicos ni con lector de pantalla.
- **Gasto infantil:** antes de los 18 años solo se ofrecen acciones de salud, aprendizaje, familia y ocio. El dinero sale del presupuesto familiar modelado; no representa autonomía legal ni cuentas bancarias reales de un menor.
- **Tiempo real:** una sola instancia de servidor. Para varias instancias haría falta un adaptador Redis de Socket.IO y coordinación del reloj.
- **Rate limiting:** en memoria; para varias instancias, usar almacén compartido.
- **Arranque con muchas partidas:** al iniciar se cargan solo las partidas activas que necesitan reloj o temporizador, no las terminadas. Aun así, un almacén JSON grande (el usado en pruebas llegó a 78 MB) tarda decenas de segundos en arrancar. Para producción, usar PostgreSQL y no acumular partidas de prueba.

## 6. Riesgos conocidos

- La partida puede quedar esperando si un jugador abandona sin usar «Abandonar» y no hay temporizador. En duelo, solo el anfitrión puede activar el modo automático. Se puede añadir una expulsión por inactividad.
- Si el anfitrión no vuelve, el invitado no puede activar por su cuenta las decisiones automáticas; el temporizador configurable mitiga la espera, pero no sustituye una política de abandono.
- Los datos antiguos de versiones previas pueden contener deudas irreales; las partidas nuevas usan el modelo corregido.
- La tarjeta resumen usa `canvas`; en navegadores muy antiguos puede fallar la descarga, aunque hay manejo de errores.
- La esperanza de vida y la mortalidad se tratan como escenario de simulación, no como proyección demográfica. Toda vida nueva nace en el año actual.
- En manual, el duelo espera a que ambos resuelvan el año. Si un jugador desaparece sin abandonar, el otro puede pausar; el anfitrión puede activar el modo automático. No hay expulsión automática.

## 7. Siguientes pasos recomendados

1. Ejecutar una prueba real con PostgreSQL y Docker en CI.
2. Probar DeepSeek con una clave de pruebas y verificar timeout/límites.
3. Ampliar el dataset a más países con un proceso de importación reproducible.
4. Añadir expulsión/auto-pausa tras inactividad prolongada y notificaciones.
5. Dividir el bundle del cliente para cargar el catálogo chino bajo demanda.
6. Auditoría de accesibilidad y pruebas en móvil real, incluida la tipografía china.
7. Añadir espectadores, torneos o historial social si se desea crecer.
8. Ampliar los bancos de crónica y las decisiones específicas por país; ajustar balance con telemetría de partidas.
9. Firmar/verificar exportaciones y añadir una vista de replay.
10. Mover rate limiting y reloj a almacenes compartidos para escalar horizontalmente.

## 8. Qué no está simulado

- Economía macroeconómica completa.
- Sistema político o impuestos detallados por país.
- Genética, discapacidades específicas y tratamientos médicos reales.
- Mercado laboral completo por ocupaciones, regiones y vacantes; solo se modelan ocupaciones compatibles y cambios anuales.
- Tramitación legal detallada, concesión real de visados y ciudadanía. La migración modelada usa coste, dificultad y banderas, no un expediente administrativo.
- Interacción en tiempo real entre los jugadores más allá de la competición asíncrona por turnos.

Estas ausencias son decisiones de alcance, no fallos ocultos. La arquitectura modular permite añadirlas sin reescribir el núcleo.


## 9. Limitaciones de la versión china

- La traducción automática se revisó en la interfaz principal, pero la narrativa muy específica puede sonar literal. Los términos visibles se corrigen en `data/i18n/zh-overrides.json`.
- La cobertura no es total: `data/i18n/missing.json` enumera lo pendiente. No se presenta como «todo traducido».
- Los topónimos menores y los nombres de personas pueden conservarse en alfabeto latino.
- El catálogo chino se incluye en el bundle compartido (unos 600 kB de texto, mucho menos comprimido). Se puede separar por idioma en una próxima iteración.
- Las respuestas de Socket.IO no se localizan en el servidor; el cliente traduce los nodos visibles y la narrativa HTTP usa plantillas.
- La calidad del texto chino no sustituye una revisión editorial profesional; la arquitectura permite corregir cadenas sin tocar el motor.
