# LIFE DUEL

**La misma vida. Dos formas de vivirla.** Un simulador de vidas determinista para un jugador y un duelo online en tiempo real para dos, donde ambos reciben exactamente el mismo nacimiento y los mismos acontecimientos, pero deciden por separado.

> Proyecto funcional en español, ejecutable en local. No es una maqueta: el motor, la economía, la mortalidad, las salas, la sincronización, la persistencia y la puntuación están implementados y cubiertos por pruebas.

---

## 1. Puesta en marcha rápida

Requisitos: **Node.js 20 o superior** (probado con Node 25) y npm. PostgreSQL y DeepSeek son opcionales.

```bash
cd /Users/angel/Desktop/Juego

# 1. Dependencias
npm install

# 2. Configuración opcional (sin .env funciona en desarrollo)
cp .env.example .env

# 3. Arrancar servidor (4000) y cliente (5173)
npm run dev
```

Abre **http://localhost:5173**. La API queda en **http://localhost:4000** y Vite hace proxy de `/api` y `/socket.io`.

Sin `SESSION_SECRET`, el servidor de desarrollo crea una clave local en `server/.data/.session-secret` con permisos restringidos. En producción `SESSION_SECRET` es obligatorio.

### Comandos exactos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor + cliente en desarrollo. |
| `npm run dev:server` / `npm run dev:client` | Arrancar solo una parte. |
| `npm run typecheck` | TypeScript de shared, servidor y cliente. |
| `npm test` | Pruebas Vitest (motor, servicio, HTTP, sockets, persistencia). |
| `npm run build` | Compila shared/servidor y genera el cliente. |
| `npm start` | Sirve la compilación desde el servidor (producción) y aplica migraciones si `PERSISTENCE=postgres`. |
| `npm run e2e` | Playwright sobre los flujos reales. |
| `npm run sim:demo` | Simula una vida completa por consola. |
| `npm run prisma:validate` | Valida el esquema Prisma. |
| `npm run prisma:generate` | Genera el cliente Prisma. |
| `npm run prisma:migrate` | Crea/aplica migraciones de desarrollo. |
| `npm run prisma:deploy` | Aplica migraciones existentes (producción/Neon). |

Para usar Playwright con el Chrome instalado no hace falta descargar navegadores; `playwright.config.ts` usa `channel: "chrome"`. En CI: `npx playwright install chromium` y define `E2E_CHANNEL=chromium`.

---

## 2. Cómo jugar un duelo entre dos navegadores

1. Arranca `npm run dev`.
2. Abre **http://localhost:5173** en tu navegador habitual.
3. Pulsa **Duelo para dos**, escribe un alias y crea la sala.
4. Copia el **código de seis caracteres** o la invitación.
5. Abre una **ventana de incógnito**, otro navegador o otro dispositivo en la misma red/Vite accesible.
6. Entra en **Unirse a una partida**, introduce el código y un alias distinto.
7. Ambos pulsan **Estoy listo**. El anfitrión pulsa **Comenzar duelo**.
8. Cada jugador elige en privado. La interfaz muestra si el rival ya respondió, pero **no su opción**.
9. Al confirmar ambos, el servidor resuelve el año y revela las consecuencias.
10. Puedes pausar, cambiar velocidad, abandonar o pedir revancha al final. Solo el anfitrión puede activar o desactivar las decisiones automáticas del duelo.

> Cada jugador necesita su propia sesión anónima (`localStorage`). No compartas la misma ventana para probar ambos lados.

---

## 3. Funcionalidades implementadas

### Iteración actual: coherencia, variedad y patrimonio

- **Decisiones coherentes con la edad.** La epidemia ya no ofrece «mantener el trabajo» a un niño: hay opciones de infancia (6–12), adolescencia (13–17) y adultez (18+). El evento sigue siendo compartido; lo que cambia es la pregunta que puede responder cada edad.
- **Relaciones reescritas.** Cada escena tiene opciones propias y breves. La amistad internacional ya no está fijada en Italia: el país de la pareja se sortea con la semilla y se comprueba que sea distinto del actual.
- **Arcos con mazo limitado.** Se corrigió el avance de capítulos (antes podía repetir el mismo) y se limita la vida a un máximo de tres arcos, sin iniciar otro mientras haya uno activo. Cada capítulo avanza como máximo una vez por año. La deuda familiar exige un hogar de nivel bajo/medio-bajo y empieza a los 10 años.
- **Diario breve.** El panel muestra cinco escenas relevantes, oculta las líneas de continuidad y resume el texto a dos líneas con «Leer completo». En móvil desaparece el scroll interno.
- **Migración visible.** La decisión `primer_billete` aparece a los 17–19 años con estudiar fuera, trabajar fuera, prepararlo o quedarse; el destino se sortea con la semilla. El panel manual sigue disponible como ejecución posterior.
- **Presión patrimonial.** El servidor calcula patrimonio neto, liquidez, obligaciones y mantenimiento. Un patrimonio superior a cuatro veces la capacidad económica anual paga un mantenimiento registrado en el libro mayor. Cuatro decisiones de alto patrimonio (fiscalidad, socio, seguridad y familia) pueden aumentar costes o crear deuda. No se castiga solo por tener dinero: se modelan las obligaciones que aparecen con él.
- **Inicio más directo.** La portada prioriza dos acciones —Nueva vida y Duelo para dos— y deja «Tengo un código» y «Continuar» como accesos secundarios.

### Base anterior: vida presente, relato y movilidad

- **Nacimiento siempre hoy.** Se eliminaron la época, el año y la duración configurable. La vida empieza en el año actual y termina cuando lo determina el modelo de mortalidad; `maxAge` queda como límite técnico de seguridad.
- **Decisiones manuales por defecto.** El reloj avanza y se detiene en cada encrucijada. En un duelo, solo el anfitrión puede activar o desactivar la estrategia automática; el invitado no puede cambiar esa regla.
- **Dónde estás ahora.** Panel de residencia con ciudad, país, moneda local, equivalencia del saldo y trayectoria de migraciones.
- **Irte al extranjero.** 48 proyectos (16 países × estudiar, trabajar o vivir), con presupuesto de vuelo, visado, seguro, depósito, instalación, matrícula y manutención; modalidades solo, pareja o familia; moneda local y probabilidad orientativa. Se ejecuta en el servidor, con idempotencia y sin permitir saldos negativos.
- **Relato canónico.** El diario y el historial se construyen desde `LifeMoment`: nacimiento, sucesos del mundo, decisiones, crónica mensual, hitos, salud y migración. El diario se actualiza con cada mes y no revela acciones privadas del rival antes de tiempo.
- **Arcos y variedad.** Once arcos de tres capítulos (deuda familiar, herencia, confianza, trabajo, retorno, primer empleo, cuidados, vivienda, amistad, vocación tardía y negocio). Una vida activa como máximo tres; cada capítulo avanza una vez por año. El selector evita repetir la última escena y, si se agotan, recupera la menos reciente.

### Modo individual
- Nacimiento aleatorio reproducible con semilla.
- Familia de origen generada con ocupaciones, ingresos, presupuesto, vivienda, religión y contexto cultural; visible en el registro de nacimiento.
- Evolución propia de padres, hermanos, hijos y pareja: enfermedad, muerte, duelo, funeral, jubilación, pérdida de empleo y herencia.
- Nacimiento siempre en el año actual; no se eligen época, año ni duración.
- País ponderado por nacimientos, uniforme o fijo.
- Dificultad y contenido sensible configurables antes de nacer.
- Decisiones anuales, sucesos compartidos, economía, salud, mortalidad, familia, vejez y muerte.
- Historial completo, comparador, gráficos, resultado final, tarjeta resumen y exportación JSON.
- Repetición mediante una nueva semilla.

### Duelo online
- Salas privadas con código único de 6 caracteres (alfabeto sin caracteres ambiguos).
- Estados `waiting`, `ready`, `playing`, `paused`, `finished`.
- Alias, presencia, conexión/reconexión, pausa, velocidad y abandono.
- Nacimiento y sucesos compartidos idénticos; decisiones y consecuencias privadas.
- Resolución simultánea, idempotencia y validación en servidor.
- El duelo continúa si muere un personaje; termina cuando ambos terminan o se alcanza el límite.
- Revancha con la misma configuración o una nueva.
- Persistencia y recuperación; el rival no puede alterar el estado ajeno.

### Interfaz
- Diseño responsive en español, con paleta propia, tipografías locales, SVG originales y animaciones suaves.
- Pantallas: inicio, nueva vida, duelo, sala, partida, comparador, historial, final, mis vidas, historial global y ajustes.
- Controles de reloj 1×/2×/4×/8×/16×, pausa, reanudación, modo manual y automático.
- Accesibilidad: navegación por teclado, foco visible, modal con focus trap, roles/etiquetas ARIA, `prefers-reduced-motion`.
- Ilustraciones procedurales deterministas por semilla, sin recursos propietarios.
- Cada pregunta muestra **hasta cinco caminos reales**; si las opciones específicas no son elegibles, el servidor añade alternativas de repliegue con coste social o psicológico.
- Extracto bancario de doce meses con vivienda, comida, suministros, transporte, salud, educación, deuda y saldo final, dentro de «Economía».

### Modelo de vida realista v2
- Hogar de nacimiento con estructura (nuclear, monoparental, extendida o compuesta), tenencia, presupuesto anual, ahorros, deuda, activos y red de apoyo.
- Ocupaciones parentales derivadas de educación, quintil, sexo, entorno rural y salario compatible; ingresos calibrados al país y al hogar.
- Contexto cultural modelado por país: participación laboral femenina, brecha salarial, sistema matrimonial y religiosidad. La poliginia solo puede aparecer en contextos legales y religiosos compatibles, y se etiqueta como modelo provisional.
- Salud y mortalidad propias de cada pariente, sin reutilizar las banderas, el empleo o la salud del jugador. Un fallecimiento abre una **despedida pendiente**: no se cobra nada hasta elegir ceremonia íntima, a lo grande o sin ceremonia. La deuda contraída con el familiar acreedor se condona al morir este. La herencia se liquida una sola vez al morir ambos progenitores.
- Psicología persistente: resiliencia, autoestima, estrés, duelo, desgaste laboral y satisfacción vital. Influye de forma limitada en salud y felicidad.
- Empresas con ingresos, costes, marketing, reputación, empleados y quiebra; préstamos con libro mayor, historial de crédito y quiebra personal limitada.
- Decisiones ramificadas por pasado: medicina, derecho, tecnología, música, oficios, negocio propio, préstamos familiares y bancarios, ofertas dudosas, robos, amistades, conducción de riesgo, cuidado de padres mayores y enfermedad grave.
- La interfaz muestra el hogar, la mente, la empresa, los préstamos y los rasgos acumulados tanto en la vida individual como en las fichas del duelo y el resultado final.

### Modelo de vida realista v3
- **Contexto de país** (`data/country-context.json`): reparto del gasto mensual, tipo hipotecario, depósito de alquiler, dificultad de visado, coste relativo de migración y presión social sobre estudios, matrimonio e hijos. Son parámetros provisionales.
- **Caminos visibles por pregunta:** las opciones específicas se filtran por dinero, edad, país, familia, religión, sexo, vivienda y decisiones previas. Desde v4 el servidor completa hasta cinco con repliegues contextuales que también dejan huella.
- **Migración realista:** destino elegido, requisitos, coste calculado por origen/destino (visado, viaje, instalación y depósito), posibilidad de rechazo y estatus irregular. No garantiza mejorar de vida.
- **Presión cultural:** estudiar, casarse o tener hijos deja de ser un único camino; las expectativas familiares se pueden negociar, aplazar o rechazar, con consecuencias distintas.
- **Economía cotidiana:** nómina, impuestos, alquiler o hipoteca, comida, agua/luz/internet, transporte, salud, educación y deuda se resumen en un banco de doce meses. La vivienda puede comprarse al contado o con hipoteca a 25 años.
- **Empresa y contrato:** contratar, despedir, recortar, buscar socio, negociar un contrato o firmarlo sin leer; las decisiones previas abren o cierran oportunidades posteriores, incluidas segundas oportunidades tras un fracaso.
- El **duelo usa el mismo modelo familiar y contextual** que la vida individual. La pregunta anual puede ser compartida, pero las oportunidades personales desbloqueadas por decisiones previas pueden diferir.

### Modelo de vida realista v4

- **Decisiones manuales por defecto.** El reloj avanza solo y se detiene en cada decisión; el jugador elige y la vida continúa. La estrategia automática es una opción explícita, no el comportamiento inicial.
- **Crónica anual densa.** Cada año añade una crónica de 5–6 escenas cotidianas (etapa vital, familia, trabajo, dinero, salud, escuela, lugar y vida interior), además de los sucesos compartidos y la decisión principal. La crónica es determinista y personal; no altera estadísticas ni dinero.
- **Elegir y seguir.** Una decisión se toma con un solo clic: no hay diálogo de confirmación ni resumen modal que cerrar. El resultado del año aparece integrado en la página (`YearEcho`), con la opción elegida, la tirada, los cambios de estadísticas, el balance económico y los hitos.
- **Cinco caminos visibles.** El servidor completa cada pregunta hasta cinco alternativas cuando faltan opciones elegibles: una salida modesta, pedir consejo, tomar una alternativa, negociar garantías o proteger la estabilidad. Son decisiones reales, no botones decorativos.
- **Salidas ante la crisis.** Cuando el empleo, las deudas o la salud se rompen, el selector prioriza tres decisiones de recuperación (`reconstruir_empleo`, `renegociar_deudas`, `recuperar_salud`). Ofrecen caminos modestos y verificables —empleo temporal, formación pública, renegociación, apoyo familiar— sin regalar grandes sumas de dinero. Después se puede volver a las decisiones mayores.
- **Economía sostenible.** La infancia no genera gastos ni deuda personal; la cesta esencial se ajusta a la capacidad real de gasto y el crédito se ancla a los ingresos del personaje. Una mala racha puede doler, pero no se convierte en una espiral infinita.
- **Automático competente.** La política automática ordena por utilidad esperada y elige de forma ponderada entre las tres mejores opciones (90 % / 8 % / 2 %), con más peso para salud, empleo y liquidez cuando están en riesgo. Juega bien sin ser infalible.
- **Catálogo ampliado:** **171 decisiones** y **30 sucesos compartidos**, con decisiones de infancia, adolescencia, empresa, familia, migración, salud, vivienda, patrimonio y recuperación.
- La interfaz del diario usa un lenguaje más editorial y muestra la crónica como una vida que se lee, no como un panel de métricas.



### Modelo de vida realista v5

- **Decisiones manuales por defecto.** Al crear una vida, el servidor avanza el reloj y pausa en cada decisión; la persona puede pausar, cambiar de 1× a 16× o activar la estrategia automática. El reloj sigue siendo autoritativo.
- **Objetivo declarado: salud, patrimonio y empresa.** La política automática valora ingresos recurrentes, reserva de liquidez, creación de negocio, crecimiento, reputación, empleados y venta, sin descuidar salud, felicidad ni vínculos. Sigue siendo reproducible y no conoce las tiradas futuras; elige el 90 % de las veces la mejor lectura, el 8 % la segunda y el 2 % la tercera.
- **Ciclo de empresa completo.** Nuevas decisiones para abrir el primer negocio (`primer_negocio`), abrir una segunda sede, retener talento, exportar, regularizar impuestos, vender o cerrar, y reconstruir tras un fracaso. Los beneficios, costes, deuda y venta pasan por el libro mayor.
- **Familia con transferencias reales.** Decisiones para contribuir a la boda de un hijo, ayudar a los padres, cuidar a un familiar enfermo, pagar estudios de los nietos, cuidar nietos, donar, testamentaría y asumir una enfermedad grave. Los nietos y las mascotas aparecen en la escena familiar.
- **Mascotas persistentes.** Se adoptan, envejecen, enferman, mueren y pueden requerir veterinario. No son decoración: afectan a la felicidad y al presupuesto.
- **Variantes narrativas por mundo.** La misma decisión puede leerse con dos redacciones distintas según la semilla, el turno y la situación. Las opciones, costes, probabilidades y efectos son idénticos; solo cambia el relato. La variante no depende del jugador ni del país para que dos personas en duelo reciban la misma información.
- **Decisiones con memoria y enfriamiento.** `cooldownYears` evita repetir la misma oportunidad de empresa o familia cada año. Cada personaje registra la edad de su última aparición.
- **Migración y retorno.** Visas cualificadas, reagrupación, retorno al país de nacimiento y apelación de una denegación; el coste y el resultado dependen de origen, destino y perfil.
- **Banco en tiempo real.** La tarjeta compacta muestra saldo y deuda, nómina con el oficio, ingresos de empresa y los **5 movimientos más recientes** con signos verdes/rojos. El cierre se reproduce durante la barra mensual: nómina al inicio, vivienda y suministros escalonados y deuda al final. Las compras manuales aparecen al instante. Es una capa visual sobre los movimientos autoritativos del servidor; no inventa saldos ni cambia la economía.
- **Vista completa de deudas.** «Tus deudas» desglosa préstamos, hipotecas y deuda residual, con acreedor, interés y cuota. Permite pagar un importe parcial o total contra una deuda concreta; el servidor valida saldo, saldo pendiente e idempotencia y registra cada pago en el libro mayor. También está disponible en duelo para deudas personales.
- **Despedidas con consecuencias.** La muerte de un pariente encola una decisión de funeral. Una ceremonia íntima cuesta menos y sostiene los vínculos; una despedida grande mejora el apoyo pero puede generar deuda; renunciar a la ceremonia ahorra dinero y pesa en felicidad, relaciones y estrés. En la infancia el coste lo asume el hogar.
- **Diario narrativo, no contable.** El diario mensual cuenta escenas de escuela, trabajo, pareja, salud, duelo, deuda o vejez, con variedad determinista y sin resúmenes automáticos de ingresos/gastos. Las cifras viven en el banco y en la vista de deudas.
- **Catálogo de 171 decisiones.** Incluye infancia, adolescencia, empresa, familia, migración, salud, vivienda, patrimonio y recuperación. La cobertura incluye varios caminos visibles cuando faltan opciones específicas.

### Modelo de vida y ritmo v8 (Fase 0)

- **Banco narrativo conectado.** 58 situaciones tienen 116 variantes generales, y 14 sucesos compartidos tienen 28 variantes específicas. Antes el banco existía pero el motor no lo consultaba. Ahora una crisis económica y una recesión pueden describirse de forma distinta aunque compartan opciones y efectos.
- **La misma información para ambos duelistas.** La variante se elige con `worldSeed`, turno, identificador de decisión y suceso; no con el jugador ni el país. El país sigue apareciendo en los textos mediante tokens, pero no cambia arbitrariamente el planteamiento.
- **Cooldowns de evento.** Las siete decisiones de suceso tienen enfriamientos de 9–14 años y, además, un intervalo global de tres años entre decisiones de evento. El suceso del mundo puede ocurrir sin convertir cada año en la misma pregunta.
- **Calendario más denso en infancia y adolescencia.** Los hitos fijos pasan de `2, 6, 12, 16` a `2, 4, 6, 8, 10, 12, 14, 16, 18`. Se conservan las oportunidades contextuales y las crisis urgentes.
- **Menos repetición familiar y empresarial.** Las conversaciones de pareja/crianza comparten un intervalo de cinco años; el negocio ofrece una oportunidad cada cuatro años como máximo y su pool incluye crecimiento, contratación y crisis. `acuerdo_pareja` es un hito único y `cuidar_padres_mayores` ya no está garantizado en todas las vidas.
- **Hitos familiares con probabilidad.** La ayuda familiar a los 22 años aparece en el 38 % de las vidas elegibles y el cuidado de padres a los 45 en el 45 %. Siguen disponibles en el catálogo general, pero dejan de ser un guion idéntico para todos.
- **Medición de ritmo (20 vidas, España, 85 años, automático):** 57,1 decisiones totales, 40,8 situaciones distintas, 47,5 años con pregunta, 44,0 títulos distintos, 12,5 decisiones de evento, 8,4 de empresa y 3,4 familiares; máximo de repeticiones de una misma decisión: 6. La medición anterior daba 56,8 totales y 28,4 distintas. El total apenas cambia; la mejora está en la variedad. `child_school_plan` puede repetirse legítimamente cuando hay varios hijos. No es una muestra estadística formal.
- **Pruebas nuevas:** `tests/pacing-v8.test.ts` verifica variantes ligadas al suceso, determinismo sin depender del jugador, cooldowns, intervalo global, calendario de infancia/adolescencia y pool de empresa.


### Servidor y seguridad
- Express + Socket.IO como autoridad del estado.
- Zod en todas las entradas HTTP; validación y límites de frecuencia; CORS restringido.
- Sesiones anónimas HMAC firmadas, sin datos personales.
- Semilla completa nunca enviada al cliente; solo huella pública de 12 caracteres.
- Vistas personalizadas por socket para impedir filtraciones de decisiones.
- Bloqueo por partida para evitar condiciones de carrera y registro idempotente de decisiones.
- Persistencia JSON atómica por defecto y adaptador PostgreSQL/Prisma opcional.

---

## 4. Arquitectura

```
client/                     React + Vite + Tailwind
  src/
    components/             UI reutilizable, arte SVG, juego, layout
    pages/                  Inicio, configuración, sala, partida, historial, final…
    features/               sesión, preferencias, formato, tarjeta resumen
    hooks/                  socket, datos demográficos
    services/               cliente HTTP y Socket.IO
    styles/                 tokens y estilos globales
server/                     Node + Express + Socket.IO
  src/
    routes/                 API REST
    sockets/                eventos en tiempo real y vistas privadas
    services/               sesión, partidas, narrativa, vistas
    narrative/              relato canónico, arcos serializados y escenas
    simulation/             motor, RNG, nacimiento, economía, decisiones, eventos,
                            movilidad, mortalidad, puntuación y política automática
    demographics/           carga y validación del dataset
    persistence/            JSON atómico y PostgreSQL/Prisma
    validation/             Zod, auth y manejo de errores
    types/                  registros internos autoritativos
shared/                     contratos TypeScript, constantes y esquemas Zod
prisma/                     esquema y migración
data/                       demográficos, economía, mortalidad y modelo de hogar v2
tests/                      Vitest: motor, servicio, HTTP, sockets, persistencia
e2e/                        Playwright: flujo individual y duelo real
docs/                       arquitectura, reglas, puntuación, API, datos, pruebas
scripts/demo-life.ts        simulación por consola
```

Principio central: **el cliente dibuja, el servidor decide**. El navegador puede enviar intención (`optionId`, `turn`, clave de idempotencia), pero nunca estadísticas, tiradas, semilla, resultados ni puntuaciones.

Más detalle: [`docs/architecture.md`](docs/architecture.md).

---

## 5. Motor de simulación y determinismo

- `worldSeed`: 18 bytes aleatorios en base64url generados una sola vez en el servidor.
- RNG determinista `xmur3 + mulberry32`, con flujos derivados por etiqueta (`mortality`, `event`, `choice`, `auto`…). No se usa `Math.random()` para decidir una partida.
- El nacimiento (país, año, sexo, familia, ciudad, nombre, estadísticas y moneda) se deriva de la semilla y la configuración.
- El dataset y los modelos están versionados; la partida guarda `seedFingerprint`, versión del motor y del dataset.
- **Sucesos compartidos:** clima económico, crisis, guerra, epidemia, desastres, oportunidades educativas y laborales. Afectan al mundo de ambos.
- **Consecuencias individuales:** empleo, estudios, deuda, relaciones, salud, hijos, migración. Solo modifican el personaje que decidió.
- La secuencia de decisiones disponibles es reproducible; la elección introduce la divergencia.
- La muerte se calcula cada año con un modelo de Gompertz calibrado por país/sexo, esperanza de vida al nacer, mortalidad infantil, salud, enfermedades crónicas, acceso sanitario, pobreza y dificultad. No es un temporizador fijo.
- La simulación individual y el duelo comparten exactamente el mismo motor.

Reglas completas: [`docs/game-rules.md`](docs/game-rules.md).

---

## 6. Turnos, reloj y automatización

Las decisiones son **manuales por defecto**: el servidor avanza la vida y pausa el reloj cuando hay una decisión. El jugador puede cambiar la velocidad, pausar o activar la estrategia automática; en duelo solo el anfitrión controla esa opción. El resultado de cada año aparece como un eco inline. Cada año:

1. Se generan los sucesos compartidos.
2. Se construye un prompt de decisión elegible por personaje.
3. Cada jugador elige una opción de forma privada con un solo clic.
4. El servidor registra con clave de idempotencia.
5. Si falta alguien vivo, se espera; si un personaje murió, no bloquea.
6. Cuando ambos vivos han respondido, se resuelven simultáneamente.
7. Se aplican efectos, economía, salud, mortalidad, historial y puntuación.
8. Se genera el siguiente año o se finaliza.

- El valor por defecto es `autoDecisions=false`: el reloj se detiene en cada decisión. La estrategia automática puede activarse en cualquier momento.
- El reloj vive en el servidor. Vite/cliente no simula años por su cuenta.
- Velocidades 1×–16× modifican el temporizador de decisión/avance automático.
- `decisionTimerSeconds=0` desactiva el temporizador.
- El modo automático usa una política de utilidad documentada: elige de forma ponderada entre las tres mejores opciones (90 % / 8 % / 2 %), no conoce la tirada futura y no siempre acierta.
- En duelo solo el anfitrión puede activarla o desactivarla; en individual la controla el jugador.
- Pausa y reanudación se guardan en el estado autoritativo.
- Las desconexiones conservan el estado; la suscripción Socket.IO se renueva al reconectar.

---

## 7. Estadísticas y economía

Principales (0–100): **Salud, Felicidad, Conocimiento, Relaciones**.

Complementarias: edad, dinero, ingresos, gastos, deudas, educación, empleo, estado civil, hijos, estado de salud, nivel de vida, calidad de vivienda, historial médico, hitos, país de residencia y riesgo de mortalidad.
- **Familia y hogar:** el presupuesto familiar se fija al nacer como contexto; los parientes tienen salud, ingresos y relación propios. Los ingresos del jugador y su economía personal empiezan a separarse al crecer.

- Los cambios se aplican con límites 0–100 y redondeo controlado.
- Toda variación monetaria queda registrada en el libro mayor (`ledger`) con tipo, etiqueta, año, edad, importe, saldo y deuda.
- La infancia no genera gastos propios: se comparte el hogar familiar.
- Ingresos dependen de PIB per cápita, educación, experiencia, edad, empleo y shocks del mundo.
- Gastos esenciales: alimentación, vivienda, transporte, salud, educación y otros, ajustados por hogar, hijos, pareja y coste de vida.
- Impuestos progresivos simplificados y cotizaciones.
- Deuda con interés anual, capacidad máxima, reestructuración y alivio; no puede crecer sin control.
- Moneda local mostrada mediante factores PPP aproximados; el motor calcula en dólares internacionales.
- **Banco mensual:** cada año genera doce extractos con nómina neta, impuestos, vivienda, comida, suministros (agua, luz, internet), transporte, salud, educación, otros y deuda. El último saldo coincide exactamente con el saldo autoritativo.
- **Vivienda:** alquiler con depósito, compra al contado o hipoteca a 25 años. La hipoteca se registra como deuda y el dinero no se suma al saldo disponible.
- **Migración:** el coste depende de origen, destino, visado, viaje, instalación y depósito de vivienda; puede fracasar y dejar estatus irregular o una segunda oportunidad.

---

## 8. Puntuación transparente

Pesos iniciales configurables antes de empezar (deben sumar 100 %):

| Categoría | Peso |
| --- | ---: |
| Salud | 20 % |
| Felicidad | 20 % |
| Conocimiento | 15 % |
| Relaciones | 15 % |
| Estabilidad económica | 15 % |
| Educación y logros | 10 % |
| Longevidad | 5 % |

Cada categoría se normaliza a 0–100. La economía usa ingresos, cobertura de gastos, ahorro, deuda e insolvencia con rendimientos decrecientes. La longevidad se compara con la esperanza de vida del país/sexo, no con una cifra absoluta.

Además se aplica una **puerta de bienestar** (0,75–1,00) según salud y felicidad, para que el dinero no compense indefinidamente un mal estado vital. Empate si la diferencia es inferior a **0,25 puntos**.

Fórmula y ejemplos: [`docs/scoring.md`](docs/scoring.md).

---

## 9. Persistencia y recuperación

### JSON (por defecto)
- Archivo `server/.data/games.json`.
- Escritura atómica mediante archivo temporal + `rename`.
- Serializa la cola de escritura para evitar corrupciones.
- Si el archivo está corrupto, conserva una copia `.corrupt-*` y arranca vacío.
- Una recarga del navegador no borra la sesión ni la partida.
- Reiniciar el servidor conserva partidas y sesiones (el secreto local se guarda). Verificado con un arranque real en el puerto 4101: misma huella de semilla, nacimiento y turno antes y después del reinicio.

### PostgreSQL + Prisma (opcional)
El adaptador usa Prisma 7, el driver `@prisma/adapter-pg` y una tabla `GameRecord` con el snapshot JSON autoritativo. Para activarlo:

```bash
# Opción A: PostgreSQL local
export DATABASE_URL="postgresql://usuario:clave@localhost:5432/life_duel?schema=public"
export SESSION_SECRET="$(openssl rand -hex 48)"

npm run prisma:generate
npm run prisma:deploy      # aplica las migraciones existentes
PERSISTENCE=postgres npm run dev:server

# Opción B: Docker Compose (incluye PostgreSQL y app)
SESSION_SECRET="$(openssl rand -hex 48)" docker compose up --build
```

La migración inicial está en `prisma/migrations/0001_init`. El esquema se valida y el cliente se genera correctamente; **la conexión contra un PostgreSQL real no se pudo verificar en este entorno porque no hay servidor de base de datos instalado**. Está documentado en [`docs/limitations.md`](docs/limitations.md).

En producción, `npm start` aplica `prisma migrate deploy` automáticamente si `PERSISTENCE=postgres`; también se puede ejecutar a mano con `npm run prisma:deploy`.

La exportación completa de una vida está disponible en JSON desde el historial y el resultado final.

---

## 10. Variables de entorno

Copia `.env.example` a `.env`. Nunca se incluyen secretos en el cliente.

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, `production`. |
| `PORT` | `4000` | Puerto del servidor. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Orígenes permitidos por CORS, separados por comas. |
| `SESSION_SECRET` | generado en desarrollo | Firma HMAC de sesiones. **Obligatorio en producción.** |
| `PERSISTENCE` | `json` | `json` o `postgres`. |
| `DATABASE_URL` | — | Obligatoria si `PERSISTENCE=postgres`. |
| `DATA_DIR` | `./data` | Dataset demográfico y modelos. |
| `PERSIST_DIR` | `./server/.data` | Almacén JSON y secreto local. |
| `DEEPSEEK_API_KEY` | — | Opcional, solo backend. |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | Endpoint compatible. |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Modelo. |
| `DEEPSEEK_TIMEOUT_MS` | `9000` | Timeout de la llamada. |
| `LOG_LEVEL` | `info` | Nivel de logs. |
| `TRUST_PROXY` | `0` | Configuración de proxy inverso. |

Cliente Vite (opcional): `VITE_API_URL`, `VITE_SOCKET_URL`. En desarrollo no se necesitan.

### DeepSeek (opcional)
El juego funciona sin IA. Si `DEEPSEEK_API_KEY` está definida, el **backend** solicita un epílogo breve al terminar una vida. La respuesta se valida, se limita el tamaño/tiempo y, ante error o ausencia de clave, se usa un texto local determinista. La IA **nunca** modifica estadísticas, tiradas ni puntuaciones. No se consume IA en cada año.

---

## 11. Datos demográficos

`data/demographics.json` es un subconjunto de demostración de 16 países (España, México, Argentina, Brasil, Estados Unidos, Nigeria, India, Japón, Alemania, Francia, Sudáfrica, Indonesia, Egipto, Suecia, China e Italia).

Incluye país/región, población, nacimientos, esperanza de vida por sexo, mortalidad infantil, PIB per cápita PPP, Gini, desempleo, escolarización, fecundidad, urbanización, moneda, ciudades y listas de nombres. Cada indicador registra fuente, año, unidades y licencia (UN WPP 2024, Banco Mundial WDI, UN IGME, OMS, UNESCO UIS, PNUD).

Los parámetros de coste de vida, acceso sanitario, calidad educativa, riesgo ambiental y protección social son **derivados provisionales**, no indicadores oficiales. Los modelos económico y de mortalidad también están marcados `provisional` en `data/`.
`data/realism-model.json` añade parámetros provisionales de hogar, ocupaciones, contexto cultural y apoyo familiar, con fuentes declaradas (WDI, ILOSTAT, WPP, Women Business and the Law, Pew, OCDE). El modelo incluye una advertencia explícita: no son tablas oficiales ni una distribución validada de familias, ingresos o religión. La poliginia modelada se limita a países donde el contexto la contempla y a la religión simulada; no se infiere de los jugadores.
`data/country-context.json` (16 países) añade otra capa declarada como provisional: porcentajes mensuales de vivienda, comida, suministros, transporte, salud, educación y otros; tipo hipotecario; meses de depósito; dificultad de visado; coste relativo de migración; presión social sobre educación, matrimonio e hijos; y norma de herencia. Sus fuentes declaradas son WDI, WPP, Women Business and the Law, OCDE y UN DESA, pero **no son ofertas ni requisitos legales vigentes**.

Para ampliar países: añade una entrada validada por el esquema de `server/src/demographics/dataset.ts`, revisa fuentes/licencias y ejecuta las pruebas. No hay scraping en tiempo de ejecución ni APIs de pago.

Más detalle: [`docs/demographics.md`](docs/demographics.md).

---

## 12. Pruebas y verificación

```bash
npm test
npm run typecheck
npm run build
npm run e2e
npm run sim:demo
npm run audit:pacing   # métricas de repetición y ritmo narrativo
```

Cobertura actual:
- **174 pruebas Vitest** distribuidas en 21 archivos, incluidas coherencia de edad, arcos y presión patrimonial (`tests/coherence-v9.test.ts`), la experiencia de vida (`tests/new-life-experience.test.ts`), ritmo narrativo v8 (`tests/pacing-v8.test.ts`), presentación del banco (`tests/bank-presentation.test.ts`), deudas, funerales y diario (`tests/debts-funerals-diary.test.ts`), determinismo, economía mensual, empresa, familia y recuperación. Todas pasan.
- Determinismo por semilla, igualdad de nacimiento, igualdad de sucesos compartidos, independencia de decisiones.
- Límites 0–100, libro mayor, economía, probabilidades, muerte y continuación del superviviente.
- Puntuación, empate, idempotencia, historial, vistas privadas.
- Variantes narrativas sin cambiar opciones, cooldown de empresa, elegibilidad de mascotas y padres, ciclo económico de empresa, mascotas y valores por defecto en vivo (`tests/v5.test.ts`).
- Persistencia JSON tras reiniciar el almacén, recuperación de corrupción, validación HTTP, acceso ajeno, epílogo local.
- Servicio de salas, presencia, abandono y revancha; reconstrucción del servicio con el mismo almacén.
- Socket.IO real con dos clientes: privacidad, resolución, rechazo de entrada inválida, desconexión y reconexión.
- **4 pruebas Playwright**: vida individual completa (incluye final y hitos de 4/6 años), duelo entre dos contextos de navegador con nacimiento/eventos idénticos y decisiones privadas, acciones económicas manuales y pago dirigido de deudas con comprobación del saldo del servidor y layout móvil.

Detalle y mapeo a criterios de aceptación: [`docs/testing.md`](docs/testing.md).

---

## 13. Estado y limitaciones conocidas

Completo: simulación individual, duelo, decisiones, eventos, economía, mortalidad, puntuación, UI, persistencia JSON, reconexión, exportación, documentos y pruebas.
Completo también: hogar familiar, psicología, empresas, préstamos, quiebra personal, vista de deudas con pago dirigido, funerales interactivos, condonación de deuda familiar, herencia y diario narrativo, con cobertura automatizada.

Limitaciones honestas:
- PostgreSQL/Prisma está implementado y compila, pero no se probó contra una instancia real en este entorno.
- DeepSeek está integrado y con fallback, pero no se ejecutó sin API key.
- El dataset es una muestra de 16 países, suficiente para el núcleo y ampliable.
- Los modelos económico y de mortalidad son paramétricos provisionales; no son tablas oficiales.
- Docker está preparado, pero no se ejecutó aquí (Docker no está instalado).
- El bundle del cliente genera un aviso de tamaño (~877 kB, 265 kB gzip); no bloquea el build.
- El presupuesto del hogar y la herencia estimada se fijan al nacer; no simulan cada factura familiar ni la revalorización de activos. Está documentado como aproximación.
- La salud y mortandad de hermanos, hijos y pareja se modelan con su edad, sexo y país; sus carreras y decisiones personales no tienen la misma profundidad que las del jugador.
- La distribución de religiones, ocupaciones y familias es un modelo de simulación, no una estadística oficial.
- El contexto de país (alquileres, hipotecas, visados y presión social) es provisional y no representa una oferta real ni asesoramiento legal.
- La hipoteca se modela como deuda agregada; no hay escritura, valor de propiedad ni amortización mensual independiente.
- El extracto bancario se liquida en el servidor y la tarjeta lo reproduce visualmente durante el ciclo mensual; el navegador no crea transacciones ni modifica el saldo autoritativo.
- La «vida en vivo» programa un avance por año: a 1× el plazo por defecto es 60 s. Las velocidades 2×–16× acortan ese plazo; no es un reloj continuo segundo a segundo.
- El modo automático es un asesor reproducible basado en utilidad, no un planificador óptimo ni una IA. Prioriza dinero, empresa y salud, pero puede fracasar.
- La interfaz está preparada para i18n, pero de momento solo existe español.
- La crónica usa plantillas deterministas y datos estructurados, no generación de texto libre. Los bancos se ampliaron por etapa y se añadieron arcos serializados, pero en vidas muy largas todavía puede repetirse alguna escena. Está diseñada para seguir creciendo.
- Los presupuestos de movilidad (vuelos, visados, seguros, depósitos, matrículas y manutención) son estimaciones de simulación derivadas del PIB/PPP y del contexto de país; no son tarifas reales ni asesoramiento migratorio. La probabilidad de éxito es orientativa y la resuelve el servidor.
- El diario muestra las 5 escenas relevantes más recientes y resume las largas con «Leer completo»; el historial completo no tiene paginación y puede crecer mucho en vidas largas.
- La vista de deudas concilia las filas con el saldo autoritativo; una partida antigua sin préstamo asociado puede mostrar una fila de «otros cargos pendientes». El pago se limita a la parte visible para no prometer una amortización que el agregado no pueda desglosar.
- Los funerales pendientes no bloquean el reloj ni la simulación. Si se aplazan, siguen visibles en la ficha y en el aviso central hasta que se resuelven. El modo automático no inventa una ceremonia por el jugador.
- Las cinco opciones incluyen repliegues cuando no existen cinco alternativas específicas elegibles. El historial identifica la opción real, pero no todas las vidas ofrecen cinco caminos exclusivos.

Lista completa: [`docs/limitations.md`](docs/limitations.md).

---

## 14. Documentación

- [`docs/architecture.md`](docs/architecture.md): capas, autoridad, flujos, concurrencia y persistencia.
- [`docs/game-rules.md`](docs/game-rules.md): stats, decisiones, eventos, economía, salud, reloj y política automática.
- [`docs/scoring.md`](docs/scoring.md): fórmula, normalización, puerta de bienestar, empates y configuración.
- [`docs/demographics.md`](docs/demographics.md): fuentes, campos, parámetros provisionales y ampliación.
- [`docs/api.md`](docs/api.md): endpoints, sockets, validación, errores y ejemplos.
- [`docs/testing.md`](docs/testing.md): suites, comandos y criterios de aceptación.
- [`docs/limitations.md`](docs/limitations.md): estado real, riesgos y siguientes pasos.
- [`docs/narrative-life.md`](docs/narrative-life.md): experiencia narrativa individual, familia, hogar y límites del modelo.
- [`docs/life-story-and-mobility.md`](docs/life-story-and-mobility.md): nacimiento presente, relato canónico, arcos, escenas y movilidad internacional.
- [`docs/pacing-v8.md`](docs/pacing-v8.md): variantes, cooldowns, calendario, pool de empresa y medición de repetición.
- [`docs/bank-experience.md`](docs/bank-experience.md): reproducción visual del cierre, límite de cinco movimientos y límites del cliente.
- [`docs/deployment.md`](docs/deployment.md): publicación gratuita en Render + Neon, dominio opcional, migraciones y solución de problemas.

---

## 15. Despliegue

### Guía completa de publicación gratuita

La guía paso a paso está en **[`docs/deployment.md`](docs/deployment.md)**: Render Free + Neon PostgreSQL + GitHub, con variables, migraciones, dominio opcional, límites y solución de problemas.

**[Publicar en Render](https://render.com/deploy?repo=https://github.com/CatGodd33/game)** (necesitas cuenta gratuita de Render y una `DATABASE_URL` de Neon).

Resumen:

1. Sube el proyecto a GitHub.
2. Crea un PostgreSQL gratuito en Neon y copia la conexión **directa**.
3. En Render, **New + → Blueprint**, selecciona el repo y pega `DATABASE_URL`.
4. Render lee `render.yaml`, compila y publica en `https://<servicio>.onrender.com`.

### Servidor único local (producción)

```bash
npm run build
NODE_ENV=production PORT=4000 SESSION_SECRET="$(openssl rand -hex 48)" npm start
```

El servidor sirve el cliente compilado en `client/dist`, la API y Socket.IO. Abre `http://localhost:4000`.

Si usas PostgreSQL, define `PERSISTENCE=postgres` y `DATABASE_URL`; el arranque aplica las migraciones. También puedes ejecutarlas a mano con `npm run prisma:deploy`.

### Docker

```bash
SESSION_SECRET="$(openssl rand -hex 48)" docker compose up --build
```

Servicio en `http://localhost:4000`; PostgreSQL 16 con volumen persistente. El comando del contenedor ejecuta `prisma migrate deploy` al arrancar.

---

## 16. Solución de problemas

- **La sala no avanza**: comprueba que ambos navegadores usan sesiones distintas y que ambos han pulsado «listo».
- **El segundo jugador no puede unirse**: el código es de 6 caracteres, la sala admite un solo invitado y puede haber caducado.
- **Se pierde la conexión**: el estado permanece en el servidor; espera a «Reconectando» o recarga. No abras la misma sesión en dos pestañas.
- **API 401**: sesión caducada o `SESSION_SECRET` cambió. Crea una nueva sesión o mantén el secreto estable.
- **`P1001` / base de datos no disponible**: revisa `DATABASE_URL`, que PostgreSQL esté arrancado y que hayas aplicado migraciones.
- **Playwright no encuentra Chrome**: usa `npx playwright install chromium` y `E2E_CHANNEL=chromium npm run e2e`.
- **Datos antiguos con deuda enorme**: son partidas de versiones previas; crea una vida nueva. La economía actual reestructura deuda.

---

## 17. Aviso

LIFE DUEL es un juego de simulación con fines de entretenimiento y experimentación. No ofrece asesoramiento médico, financiero ni legal. Los datos demográficos son aproximaciones documentadas; los parámetros de simulación están marcados como provisionales.
