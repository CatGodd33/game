# Arquitectura de LIFE DUEL

## 1. Principio de autoridad

El servidor es la única fuente de verdad. El cliente:

- solicita sesión, configuraciones, partidas y decisiones;
- dibuja vistas ya calculadas;
- nunca envía estadísticas, resultados de tiradas, semilla, puntuaciones ni cambios del rival.

El servidor valida pertenencia, estado, turno, decisión, elegibilidad y clave de idempotencia antes de mutar un registro.

## 2. Capas

```
┌────────────────────────────────────────────────────────────┐
│ Cliente React                                              │
│ páginas · componentes · hooks · servicios HTTP/Socket.IO   │
└──────────────────────────┬─────────────────────────────────┘
                           │ JSON validado / eventos
┌──────────────────────────▼─────────────────────────────────┐
│ Express + Socket.IO                                        │
│ rutas · auth · rate limit · suscripción por partida         │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ GameService                                                │
│ autoridad, locks por partida, presencia, reloj, vistas     │
└──────────────┬────────────────────────────┬────────────────┘
               │                            │
┌──────────────▼─────────────┐  ┌───────────▼────────────────┐
│ Motor determinista          │  │ Persistencia               │
│ nacimiento · decisiones     │  │ JSON atómico / Prisma+pg   │
│ eventos · economía · salud  │  │ snapshot autoritativo      │
│ mortalidad · puntuación     │  └────────────────────────────┘
└──────────────┬─────────────┘
               │
┌──────────────▼─────────────┐
│ Datos versionados           │
│ demographics/economy/       │
│ mortality/realism/context   │
│ contratos shared           │
└────────────────────────────┘
```

### `shared/`
Contratos TypeScript (`types.ts`), constantes de juego (`constants.ts`), esquemas Zod (`schemas.ts`) y utilidades puras. Evita divergencias entre cliente y servidor.

### `server/src/routes/`
Traducción HTTP → servicio. No contiene reglas de simulación. Todos los cuerpos pasan por Zod; los errores se normalizan en `validation/http.ts`.

### `server/src/sockets/`
- Autentica el handshake con el token de sesión.
- Valida `gameId` y decisión con Zod.
- Exige pertenencia a la partida.
- Emite **vistas personalizadas por socket**, nunca un broadcast con el mismo payload.
- Aplica límite de acciones y `ack` explícito.
- Gestiona presencia, suscripción y desconexión.

### `server/src/services/`
- `GameService`: fachada autoritativa. Serializa operaciones por partida con una cadena de locks, guarda, emite cambios y programa el reloj automático.
- `SessionService`: token HMAC firmado, caducidad de 30 días, sin registro.
- `view.ts`: construye vistas saneadas. `getGameView` decide qué se revela y oculta elecciones pendientes.
- `NarrativeService`: epílogo opcional con DeepSeek y fallback local.

### `server/src/simulation/`
- `rng.ts`: xmur3/mulberry32 y flujos derivados.
- `birth.ts`: nacimiento reproducible.
- `decisions.ts` / `decision-expansion.ts` / `decision-selector.ts`: catálogo de 196 decisiones, requisitos por país/familia/sexo, costes contextuales, elegibilidad, cooldowns y prompts. `decision-variants.ts` cambia solo la redacción por semilla/turno/decisión/suceso; nunca las opciones ni los efectos, y no depende del jugador ni del país para mantener la equidad del duelo. `event-decision-variants.ts` describe el suceso concreto. El selector prioriza las decisiones `recovery` cuando detecta crisis de empleo, deuda, salud o ánimo y aplica un intervalo global entre decisiones de evento. `mobility-decisions.ts` y `wealth-decisions.ts` añaden migración temprana y presión patrimonial; `wealth-pressure.ts` calcula patrimonio, liquidez y mantenimiento sin modificar el resultado por sí solo.
- `monthly-story.ts`: hasta cuatro escenas anuales deterministas por personaje, con categoría e importancia, sin repetir frases recientes. Depende de semilla, nacimiento, estado y año; no altera estadísticas ni dinero.
- `story.ts`: combina crónica personal, familia, sucesos compartidos y narrativa del turno.
- `fallback-options.ts`: cinco repliegues contextuales por categoría (salida modesta, apoyo, alternativa modesta, negociar, estabilidad). Son opciones reales con efectos sociales/psicológicos, resueltas también por el servidor.
- `events.ts`: catálogo de sucesos compartidos y efectos del mundo.
- `economy.ts`: ingresos, gastos esenciales desglosados con ajuste a la capacidad de gasto, impuestos, deuda anclada a ingresos, libro mayor, migración y extracto mensual de doce meses (`MonthlyStatement`).
- `country-context.ts`: esquema Zod y carga de `data/country-context.json`; reparto de gasto, hipoteca, alquiler, visados, presión social y coste de migración.
- `mortality.ts`: riesgo anual, calibración y causas.
- `realism.ts` / `household.ts`: carga validada del modelo provisional, ocupaciones, contexto cultural y generación del hogar de nacimiento.
- `family.ts`: salud, enfermedad, muerte, duelo y herencia de padres, hermanos, hijos y pareja. La muerte encola una despedida sin cobro automático y condona la deuda contraída con el fallecido; nunca duplica el funeral ni la herencia.
- `funerals.ts`: precio y resolución idempotente de una despedida (saldo, deuda, felicidad, relaciones, duelo y estrés).
- `spending.ts`: acciones manuales, compras, inversiones y `repay-debt` dirigido a préstamo, hipoteca o deuda residual.
- `psychology.ts`: resiliencia, autoestima, estrés, duelo, desgaste y satisfacción; influencia limitada en salud/felicidad.
- `business.ts`: ciclo completo de empresa (apertura, crecimiento, talento, exportación, impuestos, venta, cierre y reconstrucción).
- `pets.ts`: mascotas persistentes que envejecen, enferman y mueren.
- `decision-variants.ts`: variantes narrativas deterministas (semilla, turno, jugador y país) sin cambiar la mecánica.
- `business.ts`: ingresos, costes, reputación, marketing, empleados y quiebra de empresas.
- `loans.ts`: préstamos, historial de crédito, impagos y quiebra personal con límite y espera.
- `scoring.ts`: categorías, puerta de bienestar y comparación.
- `auto-policy.ts`: utilidad esperada reproducible y elección ponderada entre las tres mejores opciones (90 % / 8 % / 2 %).
- `engine.ts`: máquina de estados del año, resolución simultánea, muerte, finalización y revancha.

### `client/src/`

- `components/game/BankStatement.tsx`: resumen y tabla de los doce meses del año; es una vista derivada, no una fuente de verdad.
- `components/game/DecisionPanel.tsx`: contexto de la decisión, hasta cinco caminos visibles, coste, probabilidad y etiquetas de impacto.
- `components/game/YearEcho.tsx`: eco anual inline con decisión, tirada, tres líneas de crónica, cambios de estadísticas, balance e hitos. No es un modal y no exige una acción para continuar. Se usa en vida individual y duelo manual.
- `pages/`: flujo de pantallas.
- `components/`: UI, arte SVG y componentes de juego.
- `components/game/BirthHousehold.tsx` y `LifeContextPanels.tsx`: visualización del hogar, la familia, la mente, la empresa y las banderas de decisiones previas.
- `components/game/LiveLedger.tsx`: extracto mensual derivado del cierre anual; muestra saldo disponible, deuda y movimientos sin simular un reloj mensual independiente.
- `components/game/DebtPanel.tsx`: vista conciliada de deudas con pago dirigido y validación de servidor.
- `components/game/FuneralPanel.tsx`: elección explícita de despedida y estimación de coste.
- `components/game/mobile/`: dashboard móvil 2.2. `MobileLife` compone cabecera, controles, familia, enfoque, vitales, Life Record, pasaporte y banco; `MobileFamilyStrip`, `MobileVitals`, `MobileFocusCard`, `MobileLifeRecord` y `PassportCard` son piezas reutilizables.
- `features/life/`: catálogo de enfoques, visibilidad del gasto por edad y construcción del Life Record (máximo cuatro escenas) compartidos por ambos layouts.
- El layout móvil se elige con `hooks/useMediaQuery.ts` (`matchMedia`, 700 px) y sustituye al de escritorio; no se renderizan dos árboles ocultos. El servidor sigue siendo la única autoridad sobre estadísticas, dinero y decisiones.
- `components/ui/MoneyText.tsx`: formato monetario sin desbordamiento.
- Las fichas del duelo (`CharacterPanel`) y el resultado final exponen también psicología, empresa y situación familiar.
- `features/`: sesión, preferencias, formato y tarjeta resumen.
- `hooks/`: socket con reconexión, datos demográficos y `useMediaQuery`.
- `services/`: fetch tipado y socket singleton.

## 3. Flujo de una decisión

```
Jugador A                       Servidor                         Jugador B
    │                               │                                 │
    │ POST /decision (turn, id,     │                                 │
    │ option, idempotencyKey)       │                                 │
    ├──────────────────────────────►│ lock(gameId)                    │
    │                               │ loadGame()                      │
    │                               │ requireMember()                 │
    │                               │ submitDecision()                │
    │                               │ save()                          │
    │                               │ emit game:changed               │
    │                               ├──────── vista privada A ────────►│
    │                               ├──────── vista privada B ────────►│
    │                               │                                 │
    │                               │◄──── POST/decision B ───────────┤
    │                               │ ambas → resolveTurn()           │
    │                               │ economía + salud + muerte       │
    │                               │ historial + puntuación          │
    │                               │ save()                          │
    │◄──── game:update revelado ────┼──── game:update revelado ──────►│
```

La clave de idempotencia se guarda con slot, turno, decisión y opción. Repetir la misma petición devuelve `duplicate: true`; reutilizar la clave con otra opción es un conflicto. Dos envíos simultáneos quedan serializados por el lock.

## 4. Reloj y automatización

- **Decisiones manuales por defecto.** `DEFAULT_GAME_CONFIG.autoDecisions=false`; `refreshDeadline` programa el avance del reloj y se detiene cuando hay una decisión pendiente. La estrategia automática se activa explícitamente. En duelo solo el anfitrión puede cambiarla.
- `GameService.schedule` es el único programador de avances automáticos y solo actúa con `autoDecisions` activo.
- El temporizador se deriva de `pending.deadlineAt` y de la velocidad.
- No hay `setInterval` de simulación en el cliente.
- `runAutoTurn` usa `autoSubmit` dentro del lock y guarda antes de emitir.
- Al reiniciar, `GameService.init` recupera partidas en curso y reprograma solo las automáticas.
- En manual, cada `POST /api/games/:id/advance` resuelve **exactamente un año**. En individual se bloquea si hay una decisión pendiente; en duelo se permite cuando el año no tiene prompts y, si los tiene, el avance ocurre al decidir ambos. El eco anual se muestra inline en el cliente con el `TurnRecord` ya resuelto.
- La pausa no destruye decisiones ya enviadas.

## 5. Datos públicos y privados

Durante un turno, la vista de cada jugador contiene:

- mundo, nacimiento, eventos compartidos y economía global;
- su propio prompt y su propia elección;
- del rival: alias, presencia, `hasSubmitted`, estadísticas y puntuación;
- **nunca** `opponent.ownChoice`, narrativa privada pendiente ni semilla completa.

Al resolver el turno se publican las opciones y consecuencias de ambos en `lastResolution` e historial.

## 6. Persistencia

`StoredGame` contiene configuración, semilla, nacimiento, estado del mundo, ambos personajes, prompts, decisiones, snapshots, puntuaciones, historial, libro mayor, final e idempotencia.

- `JsonGameStore`: archivo único, escritura temporal + `rename`, cola de escritura, copia de archivo corrupto.
- `PostgresGameStore`: Prisma 7 + `@prisma/adapter-pg`; tabla `GameRecord` con snapshot JSON y columnas indexables (`mode`, `code`, `status`).
- La semilla completa solo reside en el servidor y en el almacén.

## 7. Sesiones y seguridad

- Sesión anónima firmada con HMAC-SHA256; payload `pid`, `alias`, `iat`, `exp`.
- Comparación de firma en tiempo constante.
- Secreto obligatorio en producción; en desarrollo se persiste con modo `0600`.
- CORS restringido por `CLIENT_ORIGIN`.
- Helmet, CSP en producción, límite de cuerpo 64 kB, rate limiting HTTP y por socket.
- Códigos de sala generados con `crypto.randomInt` sobre alfabeto no ambiguo y comprobación de unicidad.
- Todas las operaciones comprueban pertenencia y estado.

## 8. Decisiones de tecnología

- **React 19 + Vite + Tailwind 3**: rapidez de iteración, tipado y control visual.
- **Express 5**: madurez, ecosistema y compatibilidad con Socket.IO.
- **Socket.IO**: reconexión, rooms, acknowledgements y presencia sin reinventar el protocolo.
- **Zod 4**: un único contrato de validación compartido.
- **Zustand**: estado local mínimo (sesión y preferencias); el estado de juego siempre viene del servidor.
- **Vitest**: rápido, compatible con ESM/TS y con pruebas de sockets.
- **Playwright**: flujos reales en dos contextos aislados.
- **JSON por defecto**: permite ejecutar el proyecto sin infraestructura; PostgreSQL es un adaptador real, no un mock.
