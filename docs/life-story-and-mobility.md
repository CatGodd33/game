# Vida presente, relato y movilidad

Este documento describe la iteración que convierte la vida en una historia continua y añade proyectos internacionales. Todo lo que aparece aquí lo resuelve el servidor; el cliente solo presenta el estado.

## 1. Nacimiento siempre presente

Una vida nueva ya no configura época, año ni duración:

- `era` se normaliza a `present`.
- `fixedYear` se fija al año actual en el servidor.
- `maxAge` queda en `105` como límite técnico de seguridad, no como duración elegida.
- La muerte la decide el modelo de mortalidad del personaje. La partida no termina por alcanzar una edad pactada.

La normalización se aplica en `GameService.normalizeNewConfig` al crear una vida individual, crear una sala, actualizar su configuración y pedir revancha. Así se evita que un cliente antiguo envíe `fixedYear: undefined` y provoque un nacimiento en otro año.

## 2. Relato canónico: `LifeMoment`

`server/src/narrative/story-stream.ts` construye una sola corriente de momentos para cada observador:

| Tipo | Origen |
| --- | --- |
| `nacimiento` | Perfil de nacimiento. |
| `mundo` | Sucesos compartidos de cada turno. |
| `decision` | Decisión, opción, tirada, éxito y efectos del año. |
| `diario` | Crónica mensual y acciones manuales (estudios, movilidad, funerales…). |
| `hito` | Hitos vitales del personaje. |
| `salud` | Historial médico. |
| `migracion` | País de residencia actual distinto del de nacimiento. |
| `final` | Muerte registrada. |

Reglas:

- Los momentos se ordenan por año, mes e identificador.
- El cierre anual de cada jugador se coloca en diciembre (`month: 11`), después de las escenas mensuales de ese año.
- Se deduplican por tipo, jugador, año, mes, título y comienzo del texto.
- El observador ve sus propias acciones del año en curso. Las del rival se ocultan hasta que el mes avanza; en una partida terminada se revela todo.
- El diario de la portada muestra los **9 momentos más recientes**. La página de historial muestra la corriente completa y el archivo anual.

La respuesta de `GET /api/games/:id/history` incluye `moments` y `totalMoments` además de los turnos. El cliente no reconstruye la historia a partir de contadores ni de `manualActions`.

## 3. Arcos serializados

`server/src/narrative/arcs.ts` define ocho arcos de tres capítulos:

1. El sobre bajo la cama (deuda familiar).
2. Lo que queda de la abuela (herencia).
3. La grieta de la confianza (pareja).
4. El ascenso que no era tuyo (trabajo).
5. El préstamo de toda la vida (amistad y dinero).
6. Lo que se dice en la escalera (rumor de barrio).
7. El año en que todo se detuvo (cuidados familiares).
8. El país que dejaste atrás (retorno tras migrar).

Un arco:

- Se activa con una tirada mensual del 2,4 % cuando el personaje cumple edad, pareja, empleo o migración.
- Avanza como máximo **un capítulo por año**.
- Guarda su progreso en `flags`: `arco_<id>_inicio_<año>`, `arco_<id>_cap_<n>` y `arco_<id>_fin`.
- Tiene prioridad sobre la escena genérica del mes, pero no altera estadísticas ni dinero por sí mismo.
- Personaliza nombres con la pareja, un progenitor, la ciudad y el año.

Los arcos son narrativa; las decisiones siguen viniendo del catálogo y de los escenarios de relación (`relationship-scenarios.ts`), incluidas las crisis de pareja, la distancia internacional y los acuerdos de convivencia.

## 4. Escenas mensuales y variedad

`server/src/simulation/monthly-story.ts` elige una escena según etapa y contexto:

- Infancia (0–2 y 3–5 años), escuela y adolescencia.
- Estudios, empleo, desempleo, jubilación, negocio, pareja, hijos, salud, deuda, estrés, duelo y vejez.
- Drama cotidiano: vecindario, familia, trabajo, amistades y pasado.

El selector:

1. Descarta las escenas que ya aparecen en las últimas 24 entradas.
2. Si quedan candidatas, elige una con el RNG determinista.
3. Si todas se usaron, recupera la que lleva más tiempo sin aparecer.
4. Evita repetir exactamente la escena del mes anterior.

El texto se guarda en `manualActions` con `action: "chronicle"`, y de ahí pasa al relato canónico. No genera dinero, salud ni puntuación.

## 5. Dónde estás ahora

Cada personaje guarda:

```ts
residenceHistory: {
  country: string;
  city: string;
  fromYear: number;
  toYear?: number;
  reason?: string;
}[]
```

`migrate()` cierra la residencia anterior y abre la nueva cuando cambia el país. Un cambio de ciudad dentro del mismo país actualiza la entrada vigente. El panel `LocationPanel` muestra:

- Ciudad y país actuales.
- País de nacimiento y año de llegada.
- Moneda local y equivalente del saldo.
- Trayectoria de residencias.
- Aviso cuando todavía no ha habido migración.

## 6. Irte al extranjero

### Oferta

`server/src/simulation/mobility.ts` genera 42 proyectos: 14 países × 3 propósitos (`study`, `work`, `live`). Excluye el país actual. Cada oferta contiene:

- País, ciudad, propósito y moneda.
- Vuelo, visado/tasas, seguro, depósito, primer mes, instalación, matrícula (solo estudios) y colchón de tres meses.
- Manutención mensual estimada.
- Probabilidad orientativa de éxito (18–92 %).
- Requisitos, avisos y motivo de bloqueo.
- Tres modalidades familiares: `solo`, `partner` y `family`.

Los importes se expresan en USD PPP y en moneda local. Son **presupuestos de simulación** derivados del PIB per cápita, región y contexto de país; no son tarifas reales ni visados reales.

### Validación

El cliente envía `optionId`, `familyMode` e `idempotencyKey`. El servidor:

1. Recalcula la oferta; no confía en importes del navegador.
2. Comprueba modalidad, requisitos, edad y fondos.
3. Rechaza claves de idempotencia reutilizadas con otra operación.
4. Resuelve el éxito con un RNG derivado de semilla, personaje, oferta, modalidad, año, mes y número de intentos de movilidad.
5. Cobra en efectivo, sin permitir deuda automática.
6. Registra libro mayor, acción manual, hito y banderas.
7. Actualiza residencia, moneda y situación laboral.

Un intento fallido cobra visado y seguro, deja `visa_rechazada`, reduce felicidad y aumenta estrés. Un intento nuevo no repite el mismo sorteo, pero vuelve a pagar trámites.

### Resultados

- **Estudiar:** estado `student`, conocimiento +7, felicidad +3, flag `estudios_exterior`.
- **Trabajar:** empleo, `incomeModifier +0.08`, felicidad +2, flag `trabajo_exterior`.
- **Vivir:** desempleo inicial, felicidad +4, conocimiento +2, flag `residencia_exterior`.
- **Viajar solo con pareja:** la pareja queda en el país de origen y la relación entra en modo a distancia.

### API

```
GET  /api/games/:id/mobility
POST /api/games/:id/mobility
```

El `POST` valida con Zod (`optionId` 3–80, `familyMode` enum, `idempotencyKey` 8–120) y exige sesión y pertenencia a la partida.

## 7. Interfaz

- `LocationPanel`: «Dónde estás ahora», en la vida individual y en el duelo.
- `MobilityPanel`: modal «Irte al extranjero», pestañas Estudiar/Trabajar/Vivir, modalidad familiar, costes desglosados, moneda local, requisitos, probabilidad y bloqueos.
- Ambos paneles leen del servidor y vuelven a pedir la partida tras una acción.
- En móvil, el modal y las tarjetas se apilan; el botón de movilidad se desactiva hasta los 17 años y muestra el motivo.

## 8. Límites

- Los arcos no son decisiones con efecto mecánico; son capítulos narrativos.
- La corriente de momentos no tiene paginación.
- Los costes de movilidad son estimaciones provisionales.
- La política automática no usa IA para narrar ni para decidir; es determinista y reproducible.
- Las partidas creadas antes de esta iteración conservan su historial y sus flags, pero no generan arcos retroactivos.
