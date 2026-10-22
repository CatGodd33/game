# Reloj mensual, decisiones y libertad económica

## Tres controles distintos

- Play/Pause controla el reloj. En una vida individual con `monthlyMode`, cada intervalo liquida un mes en el servidor. Las velocidades dividen el tiempo del año y después se reparte entre doce meses. El reloj se detiene ante una decisión sin responder; elegir aplica sus consecuencias y reanuda los meses.
- «Siguiente decisión» liquida los meses y años intermedios, con sus facturas y acontecimientos, hasta la siguiente elección. Nunca responde por el jugador.
- «Estrategia automática» responde decisiones y usa las mismas acciones voluntarias que el jugador. Prioriza ingresos, deuda difícil, salud, vínculos, crianza y animales. No conoce resultados futuros ni obtiene dinero especial. Puede equivocarse.

Las vidas individuales guardadas se actualizan al abrirlas mediante una operación autenticada e idempotente. La actualización inicia el mes cero del año pendiente, conservando saldo, deuda e historia. El duelo conserva su reloj anterior.

## Contabilidad

`monthly.ts` calcula el presupuesto con las reglas económicas existentes y registra ingresos, impuestos, vivienda, comida, servicios, transporte, salud, educación y hogar. El saldo y la deuda que muestra la columna izquierda son los del servidor; no se reproducen saldos históricos como si fueran actuales. Cada transacción mensual deja rastro en el libro mayor.

Al cerrar diciembre, el motor reutiliza las cantidades ya liquidadas. No vuelve a cobrar un año entero. Mortalidad, envejecimiento, psicología, familia y sucesos siguen teniendo resolución anual. Los beneficios de empresa siguen liquidándose al cierre anual, y la interfaz lo indica. La renta de inversiones cambia mensualmente, con incertidumbre y posibles pérdidas.

Los menores mantienen su economía de infancia; el modelo no convierte las facturas de sus padres en deuda personal. El interés de deuda del modo mensual es un parámetro de simulación del 8 % anual, liquidado por meses, no una oferta bancaria ni un tipo nacional oficial.

## Gastar e invertir

Catálogo autoritativo del servidor: viajes, cuidados médicos, apoyo psicológico, formación, búsqueda de empleo, conocer gente, preparar la crianza, donaciones, ayudas familiares, adopción y cuidados de animales, bienes, vivienda, cartera de inversión, préstamos, amortización, reestructuración, comercio propio, publicidad y traspaso de empresa.

Los precios y el mantenimiento se escalan por el contexto económico del país. Los caballos requieren vivienda rural. No hay un límite global de dos mascotas: se pueden adquirir más si el presupuesto lo permite; el hogar tiene una capacidad de doce animales y el mantenimiento no desaparece cuando bajan los ingresos. Los beneficios de compañía se saturan y la sobrecarga aumenta estrés y deteriora cuidados. Todas aparecen en el estado familiar y la escena se adapta al tamaño del hogar.

La preparación de un hijo puede no salir adelante. Si lo hace, se registra una llegada prevista nueve meses después; el hijo aparece entonces en la familia, la escena y el presupuesto. La estrategia aspira a dos hijos y dos animales cuando las condiciones lo permiten. Otras decisiones del catálogo pueden construir familias diferentes.

Las ayudas requieren un familiar vivo. Las ventas exigen propiedad del bien y eliminan el activo. Bienes ordinarios se revenden con depreciación; las carteras se venden al valor actual menos una comisión del 0,5 %. Las inversiones pueden perder valor. Los gastos voluntarios requieren efectivo; pedir financiación es una acción separada y limitada por la capacidad de crédito.

Cada petición tiene una clave idempotente ligada a su contenido. Reintentar la misma operación no vuelve a cobrar; reutilizar la clave para otra acción se rechaza. Las operaciones se serializan con el reloj por partida.

## Recuperación y equilibrio

Buscar empleo no requiere saldo. Hay formación, cuidados, apoyo psicológico, venta de activos, devolución de deuda y reestructuración. El acuerdo de recuperación reduce parte de la deuda, limita gastos y perjudica el historial crediticio; no crea efectivo y tiene un periodo de espera de tres años. No se promete recuperación inmediata, inmortalidad ni éxito garantizado. El mercado, las decisiones y los recursos siguen afectando al resultado.

Pruebas cubren reloj, pausa, bloqueo de decisiones, costes sin duplicación, idempotencia, ventas, caminos sin saldo, objetivos automáticos, llegada diferida de hijos y actualización de partidas guardadas.


## Reglas v6 de continuidad y estrategia

- Las actividades opcionales comparten horas personales por mes. Estudiar y cuidar dependientes reducen esa disponibilidad. Se muestra el tiempo necesario y el que queda; las acciones no disponibles indican el motivo.
- Abrir «Gastar e invertir» pausa el reloj en el servidor; cerrar devuelve el estado anterior. Una vida que ya estaba pausada sigue pausada.
- Viajar sin convivientes se presenta como viaje personal. Los viajes internacionales desglosan billetes, documentación y estancia como **presupuesto de juego**, no como tarifas oficiales ni autorización migratoria. Visitar un país no cambia la residencia.
- El noviazgo no suma el sueldo de otra persona. Convivir o casarse une las contribuciones al presupuesto. Separarse incluye un acuerdo económico simplificado y contribuciones por menores; estas bajan al cumplir cada hijo 18 años. No se simulan todos los regímenes de custodia ni todas las leyes nacionales.
- Los hijos independientes dejan de generar costes de crianza infantil. Las nuevas llegadas tienen nueve meses de preparación; las nuevas oportunidades de crianza usan un límite de etapa de 18–49 años del modelo, no una regla médica universal.
- Las cuotas hipotecarias se amortizan cada mes con su tipo y calendario; el tipo procede del perfil provisional del país. Vender una casa cancela primero su préstamo asociado. Los préstamos identificados conservan su tipo, incluidos los familiares sin intereses; la deuda residual sin contrato identificado usa el 8 % anual del juego.
- Las propiedades nuevas conservan país y ciudad. Una casa en otro lugar no elimina el alquiler del destino; cada propiedad añade mantenimiento. Los registros antiguos sin localización conservan la suposición de residencia actual para compatibilidad.
- Los impagos persisten al pasar de año y se regularizan pagando. Las cuotas hipotecarias incompletas no se suman otra vez como si fuesen deuda nueva: el principal ya existe.
- La pensión se fija al jubilarse y no vuelve a multiplicarse por la tasa de sustitución cada mes. Los beneficios empresariales se distribuyen y tributan al cierre anual, sin sumarse además al capital de reventa. La fase de apertura y las pérdidas de clientes añaden riesgo; los costes del negocio siguen liquidándose anualmente y no constituyen una contabilidad mercantil completa.

Ver `docs/life-model-v6.md` para formación, diversidad, fuentes y límites.
