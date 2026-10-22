# Reglas del juego

Este documento describe las reglas implementadas. Los parámetros numéricos concretos viven en `data/economy-model.json`, `data/mortality-model.json` y `shared/src/constants.ts`; están versionados y pueden auditarse.

## 1. Objetivo

- **Individual:** vivir una vida completa y obtener una puntuación final.
- **Duelo:** dos personas viven exactamente el mismo mundo. Al terminar ambas, gana la puntuación final más alta; si la diferencia es menor que el umbral de empate, hay empate.

## 2. Nacimiento compartido

Al crear la partida se genera `worldSeed` con `crypto.randomBytes(18)`. A partir de la semilla y la configuración se derivan:

- país (ponderado por nacimientos, uniforme o fijo);
- año (siempre el año actual; no se elige época ni duración);
- sexo;
- nombre, apellido y ciudad;
- familia (nivel socioeconómico, educación parental, tamaño del hogar);
- estadísticas iniciales, vivienda, salud, dinero y moneda;
- esperanza de vida de referencia y contexto económico.

El servidor envía solo una huella SHA-256 de 12 caracteres. Ni la semilla ni los flujos pseudoaleatorios se exponen.

## 3. Estadísticas

### Principales (0–100)

| Estadística | Aumenta por | Disminuye por |
| --- | --- | --- |
| **Salud** | hábitos, atención médica, decisiones de bienestar, descanso, condiciones favorables. | edad, enfermedades crónicas, accidentes/pobreza, estrés, decisiones de riesgo. |
| **Felicidad** | vínculos, logros, estabilidad, tiempo libre, salud, decisiones positivas. | duelo, deuda, desempleo, aislamiento, mala salud, sucesos graves. |
| **Conocimiento** | educación, formación, lectura, decisiones de aprendizaje y experiencia. | no existe un decaimiento arbitrario importante; la falta de estímulo limita su crecimiento. |
| **Relaciones** | pareja, familia, amistades, apoyo social, hijos y tiempo compartido. | aislamiento, conflictos, migración forzada, pérdidas y decisiones de ruptura. |

Las funciones de aplicación usan `clamp(0,100)` y redondeo a un decimal. Ninguna decisión puede producir valores imposibles.

### Complementarias

Edad, dinero, ingresos, gastos, deudas, educación, empleo, estado civil, hijos, estado de salud, nivel de vida, calidad de vivienda, historial médico, hitos, país de residencia y riesgo de mortalidad. Se recalculan cada año y se reflejan en la interfaz.

## 4. Ciclo anual

1. **Sucesos compartidos:** se seleccionan con RNG de mundo según edad, país, era, grupo de ingresos, probabilidad, cooldown y control de repetición.
2. **Crónica personal:** se generan 5–6 escenas deterministas de la vida cotidiana, sin efectos mecánicos.
3. **Decisiones:** cada personaje recibe un prompt elegible según edad, recursos, país, estado civil, empleo, salud y contenido.
4. **Envío privado:** la opción se valida contra el prompt y el estado; se registra con idempotencia.
5. **Resolución:** cuando todos los personajes vivos han respondido, se aplican decisiones y efectos compartidos.
6. **Economía:** ingresos, impuestos, gastos, deuda, ahorro y nivel de vida.
7. **Salud y mortalidad:** desgaste, condiciones, riesgo anual y posible muerte.
8. **Historial:** se guarda año, edad, eventos, decisión, tirada, efectos, cambios de stats, economía, hitos, crónica y muerte.
9. **Puntuación:** snapshot y puntuación del año.
10. **Eco y avance:** el resultado del año aparece inline en la página (`YearEcho`). El jugador lee el balance y pulsa «Vivir el siguiente año», o elige una decisión con un solo clic; no hay modales de confirmación ni avance automático salvo que se active.

Si un personaje murió, no bloquea al superviviente. En duelo, el primero en morir conserva su resultado y el otro continúa.

## 5. Decisiones

Hay **171 decisiones** en el catálogo actual, agrupadas por etapa. Cada pregunta muestra varios caminos visibles y las nuevas incorporan consecuencias presentes y futuras. Las opciones específicas se filtran por edad, dinero, educación, empleo, país, familia, religión, sexo, vivienda, migración y banderas de decisiones previas. Las decisiones de evento tienen cooldown propio y un intervalo global de tres años.

- **Infancia:** hábitos, juego, apoyo escolar, salud, recursos familiares, vivienda y primera oportunidad de aprendizaje.
- **Adolescencia:** continuar estudios, formación profesional, primer trabajo, habilidades, amistades y responsabilidades.
- **Adultez:** carrera, búsqueda/cambio de empleo, especialización, ahorro, deuda, mudanza, emigración, pareja, matrimonio, hijos, presupuesto y salud.
- **Vejez:** jubilación, ahorros, atención médica, familia, tiempo libre, adaptación física, apoyo social y vivienda.

Cada definición incluye id, título, descripción, categoría, edades, requisitos, coste, efectos de éxito/fracaso, probabilidad, efectos secundarios, hitos, narrativa y referencias.

Una opción solo aparece si es elegible. El servidor vuelve a comprobar la elegibilidad al recibirla; no confía en el cliente.

### 5.0 Coherencia por edad

El suceso compartido no cambia, pero la pregunta sí. `respuesta_epidemia` conserva las opciones de adultez con `requirements.minAge: 18` y añade opciones de infancia (6–12: quedarse en casa, ver amigos a escondidas, llevar recados) y adolescencia (13–17: clases a distancia, cuidar a un familiar, salir con amigos). Un personaje de 8 años nunca ve «mantener el trabajo» ni una nómina.

La decisión `primer_billete` aparece a los 17–19 años con cuatro caminos: estudiar fuera, trabajar fuera, preparar la salida o quedarse. El destino se sortea con la semilla y no se fija en el texto. Las escenas de relación también usan opciones propias; `encuentro_intercambio` sortea el país de la pareja y no promete Italia ni otro destino concreto.

### 5.1 Garantía de cinco caminos

Si una pregunta tiene menos de cinco opciones elegibles, `fallback-options.ts` añade hasta completar cinco repliegues contextuales: elegir una salida modesta, pedir consejo, tomar una alternativa más modesta, negociar antes de aceptar o proteger la estabilidad. No son botones decorativos ni regalan dinero: aplican efectos sociales o psicológicos, consumen el turno y quedan registrados en el historial. El servidor resuelve tanto las opciones base como los repliegues y rechaza cualquier identificador inventado por el cliente.

### 5.2 Decisiones, recuperación y crónica v4.1

El catálogo v4 añade ocho decisiones: descanso digital, mascota de compañía, inversión de ahorros, mejora del hogar, voluntariado, práctica artística, testamento y límites laborales. La v4.1 incorpora tres decisiones de recuperación (`reconstruir_empleo`, `renegociar_deudas`, `recuperar_salud`) que aparecen cuando el personaje adulto sufre desempleo, deuda desproporcionada, salud baja o una combinación de infelicidad y saldo negativo. `reconstruir_empleo` exige estar desempleado o incapacitado y es repetible; `recuperar_salud` solo aparece con salud inferior a 55 y es repetible; `renegociar_deudas` es única. Una crisis severa (salud < 32, deuda impagable o desempleo) se resuelve antes que la reacción opcional al suceso del año para que la racha no deje la partida sin salida. Ninguna opción de recuperación tiene un `moneyDelta` superior a 1.000 USD; la salida es un empleo temporal, formación pública, renegociación, apoyo familiar o reducción de ritmo, no un premio.

Cada año genera además una **crónica de 5–6 escenas** con `chronicleYear`. Combina la etapa vital, el contexto familiar, el trabajo, el dinero, la salud, la educación, la migración, el ocio, el lugar de residencia y la vida interior. La crónica:

- es determinista para la misma semilla, personaje y año;
- no modifica estadísticas ni dinero;
- evita repetir líneas recientes;
- es personal, no compartida entre rivales;
- se guarda en el historial del turno y alimenta el eco anual inline y el diario.

La decisión principal sigue siendo la única elección que altera el estado del personaje. La crónica da contexto, no efectos ocultos.

## 6. Sucesos compartidos

Hay **30 sucesos** iniciales en categorías como economía, salud, educación, empleo, sociedad, medio ambiente y familia. Ejemplos: crisis económica, recesión, auge, guerra regional, epidemia, desastre natural, oportunidad educativa, cambio del mercado laboral y coste de vida.

Propiedades:

- categoría, edad mínima/máxima, probabilidad y severidad;
- eras y grupos de ingresos compatibles;
- cooldown y `once` cuando corresponde;
- narrativa original y efectos de mundo;
- posible decisión asociada;
- referencias a datos.

Los efectos compartidos modifican el mundo (coste de vida, desempleo, fase económica, ánimo general). Las consecuencias de una decisión personal no reescriben el mundo ni el estado del rival.

## 7. Economía

- Unidad interna: dólares internacionales PPP. La interfaz muestra moneda local con factor aproximado.
- **Ingresos:** PIB per cápita del país, multiplicador educativo, experiencia, curva de edad, empleo, apoyo por desempleo, pensión y shocks.
- **Gastos esenciales:** pesos de alimentación, vivienda, transporte, salud, educación y otros; ajustados por coste de vida, calidad de vivienda, hijos, pareja y participación en el hogar.
- **Capacidad de gasto:** si la cesta supera lo que el hogar puede sostener (82 % de los ingresos, un suelo mínimo por país y parte del saldo disponible), se escala proporcionalmente. Evita una espiral de deuda infinita; es una aproximación de simulación, no una encuesta de pobreza.
- **Infancia:** no genera gastos ni deuda propios; la familia cubre el hogar.
- **Impuestos:** modelo progresivo simplificado con tramos y cotización.
- **Deuda:** interés anual, capacidad máxima anclada a los ingresos reales del personaje (el PIB del país solo actúa como suelo si no hay ingresos), reestructuración al superar el límite y alivio tras años de dificultad.
- **Ahorro:** el excedente amortiza deuda y luego incrementa saldo.
- **Nivel de vida (0–100):** ingresos, vivienda, meses de ahorro y penalización de deuda.

Toda mutación monetaria pasa por `spend`, `grant`, `borrow` o `repayDebt`, que registran una transacción con saldo y deuda posteriores. No existe una vía para cambiar el saldo sin ledger.

### 7.1 Patrimonio, liquidez y presión patrimonial

El servidor calcula cada año un **patrimonio neto** contable en dólares PPP: saldo + valor de activos − deuda agregada − saldo de préstamos. El patrimonio no es una puntuación ni cambia el resultado por sí solo; sirve para describir obligaciones reales de una estructura económica grande.

- **Escala de referencia:** máximo entre 1, los ingresos anuales, los gastos anuales y la mitad del PIB per cápita PPP del país de residencia.
- **Mantenimiento:** si el personaje es adulto y el patrimonio supera cuatro veces esa escala, paga un **1,2 % del exceso**, limitado por un techo ligado a ingresos y PIB. Es el coste de conservar viviendas, inversiones y obligaciones, no un impuesto oficial ni una multa por riqueza. Cada cobro pasa por el libro mayor como «Mantenimiento patrimonial».
- **Liquidez:** meses de gastos cubiertos por el saldo disponible, entre 0 y 36. Un patrimonio alto pero ilíquido puede seguir generando una factura impagable.
- **Presión (0–100):** combina apalancamiento, meses de liquidez, concentración en activos y tamaño del patrimonio. Es un indicador de riesgo, no una probabilidad de bancarrota.
- **Niveles:** `en-riesgo` (patrimonio negativo), `baja` (<1× escala), `media` (<4×), `alta` (<10×) y `muy-alta` (≥10×).

Las decisiones `presion_fiscal`, `socio_capital`, `seguridad_patrimonial` y `familia_pide_dinero` solo aparecen en contextos compatibles. Pueden aumentar gastos, reducir liquidez o crear deuda si la opción falla; no regalan dinero ni ejecutan una quiebra automática. La interfaz muestra patrimonio, liquidez, mantenimiento y una nota explicativa, y el rival nunca ve las decisiones privadas antes de tiempo.

## 8. Salud y mortalidad

El riesgo anual se calcula con:

- edad (Gompertz) y calibración por país/sexo hacia la esperanza de vida;
- mortalidad infantil una sola vez en el primer año;
- salud actual y condiciones crónicas;
- acceso sanitario del país y plan de salud;
- pobreza;
- fragilidad a partir de los 80;
- dificultad;
- decisiones y hábitos.

La probabilidad se expresa en porcentaje y se actualiza cada año. La muerte:

- elige una causa ponderada por grupo de edad;
- marca `alive=false`, `ageAtDeath` y `causeOfDeath`;
- añade registro médico;
- genera resultado final individual;
- no finaliza automáticamente el duelo si el rival sigue vivo.

El modelo es **provisional** y está documentado como tal; no es una tabla oficial de mortalidad.

## 9. Educación, empleo y familia

- Niveles: `none`, `primary`, `secondary`, `vocational`, `university`, `postgraduate`.
- La educación afecta ingresos, oportunidades y conocimiento.
- El empleo puede ser dependiente, autónomo, desempleado, estudiante o jubilado.
- El matrimonio y la pareja afectan gastos, felicidad y relaciones.
- Los hijos aumentan gastos y relaciones, con efectos de largo plazo.
- La jubilación cambia ingresos a pensión y modifica el tiempo libre.
- La migración registra países vividos y cambia moneda/contexto.
- La migración exige elegir destino, cumplir requisitos, pagar un coste calculado por origen/destino y superar una tirada de visado. Puede fallar, dejar estatus irregular o abrir una segunda oportunidad; no garantiza mejorar ingresos.

## 10. Reloj, pausa y decisiones automáticas

- El servidor controla el reloj.
- **Modo manual (predeterminado):** la vida no avanza sin una acción del jugador. Al terminar un año se muestra el eco inline y no se crea ningún deadline.
- Velocidades: 1×, 2×, 4×, 8×, 16×.
- `decisionTimerSeconds=0`: sin temporizador; el turno espera.
- Pausa: detiene el avance automático, conserva estado y decisiones ya enviadas.
- En modo manual, el eco anual no bloquea nada: se puede leer y seguir. Una decisión pendiente sí bloquea el avance hasta que se elige una opción (un clic).
- Reanudación: reprograma el reloj.
- Automático individual: el jugador lo activa.
- Automático en duelo: solo el anfitrión puede activarlo o desactivarlo; el invitado no puede cambiar esa regla. El servidor es quien programa el reloj.
- Si un jugador se desconecta, su estado y decisiones se conservan. Al volver, la suscripción se renueva.
- Si un personaje ha muerto, la partida no se bloquea esperando su decisión.

### Política automática

`chooseAutoOption` calcula una utilidad esperada por opción:

- pesos de bienestar para salud/felicidad/conocimiento/relaciones;
- dinero, deuda, ingresos y gastos;
- educación, empleo, pareja, hijos y salud;
- probabilidad de éxito y coste;
- selección ponderada entre las tres mejores utilidades (90 % / 8 % / 2 %);
- negocio (capital, reputación, empleados, costes), migración, psicología, banderas y efectos programados;
- contexto de la opción (coste visible, probabilidad y consecuencias conocidas).

El asesor automático **no ve el resultado de la tirada** ni el estado oculto del rival. Ordena las opciones por utilidad esperada y elige de forma ponderada entre las tres primeras: acierta a menudo, pero no siempre elige el máximo. El desempate y la elección proceden del flujo determinista `auto` de la semilla. Puede equivocarse: es un consejero competente y reproducible, no un solucionador óptimo.


## 11. Puntuación durante la vida

Cada año se guarda un snapshot y se recalcula la puntuación con el estado actual y el histórico. El comparador muestra la evolución y las categorías. Los pesos se fijan al crear la partida y no cambian durante ella.

## 12. Final de la partida

- **Individual:** termina por muerte o al alcanzar la edad máxima configurada.
- **Duelo:** termina cuando ambos han muerto o alcanzan el límite. El superviviente puede seguir jugando hasta su propio final.
- Se calculan resultados, causa, países vividos, educación, ocupación, economía, relaciones, hitos, dificultades, historial de puntuación y comparación.
- Se ofrece guardar/exportar el resultado, compartir tarjeta y revancha.

## 13. Contenido y tono

El contenido sensible puede configurarse como `full` o `moderate`. Las enfermedades, muertes y pérdidas se describen de forma contenida, sin crueldad gratuita. La IA opcional solo redacta un epílogo; no altera ninguna regla.

## 14. Modelo de vida realista v2

Esta capa amplía el núcleo sin cambiar las reglas de puntuación ni la autoridad del servidor. Sus parámetros están en `data/realism-model.json` y se marcan como **provisionales**.

### 14.1 Hogar de nacimiento

- Estructura: nuclear, monoparental, extendida o compuesta. La estructura compuesta solo se usa en el modelo narrativo cuando el país contempla poliginia y la religión simulada es compatible; en Sudáfrica se modela el contexto consuetudinario. No se infiere nada de los jugadores.
- Tenencia: propiedad, hipoteca, alquiler, compartida o informal.
- Cada progenitor recibe educación, ocupación, sector, formalidad, salud, relación y un ingreso anual derivado de su ocupación compatible, ajustado por edad, quintil, sexo y brecha salarial.
- El presupuesto del hogar incluye ingresos, gastos esenciales, vivienda, alimentación, educación, salud, impuestos, margen, ahorros, deuda y activos. Un progenitor ausente aparece como apoyo externo, no como salario dentro de casa.
- La red de apoyo tiene nivel 0–100, apoyo anual potencial y capacidad de préstamo. El coste funerario y la herencia potencial se estiman al nacer.

### 14.2 Familia durante la vida

Cada pariente tiene salud propia; no hereda la salud, las banderas, el empleo ni la psicología del jugador. La salud envejece y puede sufrir episodios. La mortalidad usa el modelo del país, sexo, edad y salud del pariente.

Un fallecimiento produce:

- registro de la causa y la edad;
- duelo y pérdida de felicidad;
- una **despedida pendiente** (`pendingFunerals`), sin cobro automático: el jugador elige después entre ceremonia íntima, a lo grande o sin ceremonia;
- un cobro explícito con el libro mayor o convertido en deuda cuando se confirma la ceremonia; en la infancia el coste lo asume el hogar y no genera deuda personal;
- una decisión idempotente, registrada en `actionKeys`, para que un reintento no cobre dos veces;
- la condonación de cualquier préstamo familiar cuyo acreedor sea el pariente fallecido;
- banderas específicas (`madre_fallecida`, `father_fallecida`, `hijo_fallecido`, tutela) y consecuencias narrativas.

La herencia solo se liquida una vez, después de que hayan fallecido ambos progenitores y el personaje sea mayor de edad. Si es menor, queda pendiente. El importe es una estimación del hogar de nacimiento, no una revalorización dinámica de activos.

La deuda familiar se identifica por `creditorRelativeId`. Si una partida antigua no lo tiene, un préstamo con `lender: "familia"` se vincula al primer progenitor vivo al concederse y se condona cuando este muere. La deuda bancaria no se ve afectada. La vista «Tus deudas» concilia cada préstamo e hipoteca con `finance.debt`; un remanente sin origen identificable se muestra como deuda residual y también puede pagarse.

El coste base de una despedida es un parámetro de simulación limitado entre 120 y dos veces la referencia de país. No se presenta como precio real de mercado: íntima ≈ 65 %, grande ≈ 180 % y sin ceremonia 0. Los efectos son deliberadamente modestos y explícitos (felicidad, relaciones, duelo y estrés), nunca aleatorios.

Los padres pueden jubilarse, perder o recuperar empleo. Estos cambios generan banderas de dificultad y pueden abrir decisiones como prestar dinero a la familia o cuidar a los padres mayores.

### 14.3 Psicología

Seis dimensiones persistentes, cada una en 0–100: resiliencia, autoestima, estrés, duelo, desgaste laboral y satisfacción vital. Se actualizan anualmente con deuda, desempleo, ahorro, salud, vínculos, edad y pérdidas. Solo modifican salud y felicidad de forma limitada; no sustituyen las estadísticas principales ni se presentan como diagnóstico médico.

### 14.4 Empresa, préstamos y crédito

- Un negocio registra capital, ingresos, costes, marketing, reputación, empleados y años de pérdidas. Cada resultado entra en el libro mayor. Tres años de pérdidas pueden cerrarlo y cambiar el empleo.
- Los préstamos pueden ser bancarios, familiares o de empresa. Se registran con principal, saldo, interés, año y estado, y el dinero recibido pasa por `borrow`.
- El historial de crédito baja con impagos y sube con estabilidad. Una quiebra personal condona parte de la deuda, desactiva préstamos y deja bandera e hito. Como máximo se permiten dos quiebras y se exige un periodo de espera de diez años; las banderas no se duplican.

### 14.5 Decisiones ramificadas

Las nuevas decisiones incluyen camino profesional (medicina, derecho, tecnología, música, oficio, empresa o trabajo), casos médicos, gira musical, creación y gestión de negocio, préstamo familiar, padre en apuros, préstamo bancario, oferta tentadora, cartera robada, conducción de riesgo, cuidado de padres mayores y enfermedad grave. Los requisitos por banderas, negocio, edad y recursos impiden mostrar opciones no elegibles.

### 14.6 Contexto de país y decisiones v3

`data/country-context.json` añade un perfil para cada uno de los 16 países con:

- reparto de gasto mensual (vivienda, comida, suministros, transporte, salud, educación, otros);
- tipo hipotecario, meses de depósito de alquiler y coste relativo de migración;
- dificultad de visado y presión social sobre estudios, matrimonio e hijos;
- número esperado de hijos y norma de herencia modelada.

Todos los campos están marcados como **provisionales**. El motor los usa para calcular el coste de una migración, el depósito de una mudanza, la presión cultural y el reparto del gasto; no son ofertas ni requisitos legales reales.

**Migración.** El coste combina visado, viaje, instalación y depósito de vivienda según origen y destino. La opción puede fracasar (visado rechazado), dejar estatus irregular, exigir preparación previa o permitir una segunda oportunidad. Cambia país, ciudad y moneda, pero no concede ciudadanía ni regulariza automáticamente la situación.

**Vivienda.** Alquilar exige depósito; comprar puede ser al contado o con hipoteca a 25 años. La hipoteca suma deuda sin aumentar el saldo disponible. No se modela escritura, valor de mercado ni amortización mensual separada.

**Empresa y contrato.** Contratar, despedir, recortar costes, buscar socio y negociar un contrato tienen consecuencias económicas y de reputación. Un despido deja bandera y coste humano. Las oportunidades posteriores leen las banderas y la trayectoria, de modo que un fracaso puede abrir una segunda oportunidad en lugar de bloquear la vida.

**Economía mensual.** Cada año genera doce extractos con ingresos, impuestos, vivienda, comida, suministros, transporte, salud, educación, otros, deuda y saldo. La suma es una **vista derivada** del cierre anual autoritativo; el último saldo coincide siempre con el saldo real. No sustituye las transacciones del libro mayor.

### 14.7 Límites de esta capa

- Los porcentajes de gasto, visados, hipotecas y presión social son parámetros de simulación, no datos oficiales.
- La hipoteca es deuda agregada, sin activo inmobiliario ni plusvalía.
- El banco mensual no crea doce transacciones contables independientes.
- Los costes de empresa no se reescalan completamente por PPP en todas las opciones.
- La presión cultural se ofrece como decisiones y probabilidades; ninguna persona queda obligada por su país, sexo o religión.

### 14.8 Límites declarados

- Los parámetros de ocupaciones, religión, estructura familiar, apoyo y cultura son un modelo de simulación, no frecuencias oficiales.
- El presupuesto familiar es contexto de nacimiento y no se renegocia cada año; los ingresos parentales sí cambian con jubilación o desempleo.
- La herencia no revaloriza activos ni incluye inmuebles reales.
- La carrera de hermanos, hijos y pareja no se simula con la profundidad del jugador.
- Las fuentes del JSON son referencias de calibración; el archivo incluye una advertencia de no presentar sus cifras como estadísticas oficiales.


## 15. Capa v5: empresa, familia, mascotas y variantes

### 15.1 Vida en vivo y ritmo

`DEFAULT_GAME_CONFIG.autoDecisions` es `false`: una vida nueva avanza con el reloj y **se detiene en cada decisión**. El jugador puede pausar, cambiar de 1× a 16× o activar la estrategia automática, que usa el temporizador de 60 s. En duelo esa opción la controla solo el anfitrión. El avance manual sigue resolviendo exactamente un año por petición.

### 15.2 Empresa

`primer_negocio` permite abrir un negocio de barrio, servicios o gastronomía según liquidez, educación y riesgo. Después aparecen decisiones de segunda sede, equipo, exportación, inspección fiscal, venta, cierre y reconstrucción. Cada empresa calcula ingresos y costes con país, reputación, marketing, empleados, fase económica y una tirada de mercado. Los beneficios o pérdidas y la venta pasan por `grant`/`spend`/`adjustDebt`, nunca por una asignación directa de saldo. `endBusiness` desactiva la empresa y deja un hito y una transacción si hay venta.

### 15.3 Familia y transferencias

Las nuevas decisiones permiten contribuir a una boda, ayudar a los padres, cuidar a un familiar enfermo, pagar estudios de nietos, cuidar nietos, donar, hacer testamento o afrontar una enfermedad seria. Los nietos se generan en `family.ts` cuando un hijo vivo tiene entre 24 y 44 años, con una probabilidad anual limitada. Las mascotas se crean con `createPet` y evolucionan con `advancePets`; al morir dejan una pérdida de felicidad, no una transacción inventada.

### 15.4 Variantes y cooldown

`decision-variants.ts` contiene variantes de título, descripción, nota de contexto y etiquetas de opción. `chooseDecisionVariant` usa una semilla derivada de `worldSeed`, turno, slot y decisión. Las variantes no pueden cambiar `options`, costes, probabilidades ni efectos; el servidor sigue validando la opción contra el catálogo. `cooldownYears` y `lastDecisionAges` impiden repetir oportunidades de empresa o familia demasiado pronto. `once` sigue impidiendo repetir decisiones únicas.

### 15.5 Migración

Las decisiones de visa cualificada, reagrupación, retorno y apelación calculan coste y destino con el contexto de país. `returnToBirthCountry` devuelve al país de nacimiento sin fijar un destino arbitrario. Una visa puede rechazarse; el dinero gastado y el estado irregular quedan registrados.

### 15.6 Cuenta corriente y extracto

El servidor genera doce meses derivados del cierre anual. `LiveLedger` los presenta como cuenta corriente y anima los meses cuando la vida está en vivo; en pausa o manual queda en el último cierre. **No hay doce transacciones contables independientes**: el último saldo coincide con el saldo autoritativo y el libro mayor conserva cada movimiento real.
