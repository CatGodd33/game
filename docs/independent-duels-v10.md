# Duelo independiente y contexto de vida · v10

## Dos vidas, una sala

Las salas nuevas conservan un único nacimiento y configuran dos simulaciones individuales persistidas en `independentRuns`. Cada una tiene personaje, calendario, economía, historial, pregunta pendiente, pausa, velocidad y automático propios. Salir de una vida la pausa sin detener a la otra; el participante puede volver y reanudarla. El servidor serializa las escrituras por sala para no perder cambios concurrentes, pero no existe una barrera de turno entre participantes.

La primera vida terminada conserva su resultado. Mientras la otra continúa, el cliente recibe una pantalla de espera; no hay ganador ni resultado compartido anticipado. Cuando ambas terminan se comparan los componentes de puntuación existentes. Los estados y las elecciones personales no se incluyen en la vista ni en la exportación del rival antes del final. La semilla privada tampoco se exporta durante la partida.

La infancia de ambos participantes añade una protección de mortalidad de juego: riesgo infantil anual máximo de 0,1 % y riesgo reducido hasta los 18 años. No cambia la demografía mostrada como referencia. No protege a familiares ni elimina los riesgos adultos.

Las salas creadas antes de este cambio y que ya estaban en marcha conservan el motor de turnos antiguo. No se reinician ni se reinterpretan decisiones o cobros ya aplicados. Las salas nuevas y las revanchas iniciadas con esta versión usan el duelo independiente.

## Situaciones que requieren una actividad real

Los encuentros en un curso de idiomas requieren una actividad vigente y caducan al terminar. Campus y biblioteca universitaria requieren matrícula activa. Los encuentros laborales requieren empleo. La viudez reciente deja un periodo sin nuevas propuestas románticas. A partir de los 65 no se ofrecen nuevas rutas académicas; un programa ya iniciado puede continuar.

A los 18 se ofrece una elección de universidad, oficio o empleo. La ruta académica pregunta después por campo e institución; las cuotas y la matrícula comienzan al elegir el programa. Italia incluye las referencias existentes de Bologna y Bocconi; España, las de UNED. Las rutas genéricas de otros países siguen siendo aproximaciones del modelo.

Los hitos de hijos y propiedades son decisiones mensuales con un destinatario explícito. No entran aleatoriamente en la selección anual sin un hijo, vivienda o expediente que los motive. Los misterios automáticos del antiguo banco de arcos quedan fuera de la historia mensual nueva.

## Tiempo y patrimonio

Se conservan varias empresas con capital, plantilla, dirección y resultados separados. Cada empresa adicional incorpora dirección remunerada por defecto. Gestionar personalmente una empresa es incompatible con empleo externo o matrícula activa: existe una decisión para delegar o reducir compromisos. La formación y empleo a tiempo parcial existentes conservan su progreso más lento. Las carteras grandes consumen más tiempo y reciben más revisiones de gestión.

El resultado empresarial se liquida anualmente. Cada vivienda puede tener contrato, inquilino, renta pactada, estado y rentas pendientes propios. Los cobros se incorporan al mes solo cuando se reciben. Al alquilar la única vivienda disponible reaparece el coste de residencia. Las preguntas de impago, reclamación, salida pactada y reforma actúan sobre el inmueble concreto. Un contrato nuevo conserva los saldos pendientes y el estado de conservación. Una pregunta de empresa pendiente debe resolverse antes de cambiar, abrir o vender el negocio para que sus efectos no se apliquen a otra empresa.

Los porcentajes de renta, impago, mantenimiento, costes de gestión y rendimientos son parámetros de simulación, no cotizaciones de mercado ni contratos reales.

## Relaciones y separación

La confianza de pareja incorpora atención y presión del hogar. Una crisis abre opciones para proteger tiempo, pedir apoyo o separar los hogares. La separación deja de sumar ingresos de la expareja y puede abrir acuerdos, documentación y revisión patrimonial. La simulación puede vender bienes compartidos, registrar compensación y mantener obligaciones hacia hijos menores o estudiantes dentro de sus límites de edad.

La compensación del juego usa parámetros simplificados: parte del patrimonio neto compartido y liquidez, costes de preparación y revisión. La revisión puede mejorar o empeorar el resultado; no existe una respuesta que garantice ganar una custodia o un procedimiento real. Vivienda, manutención y bienes no obedecen una fórmula legal universal.

Como referencia contextual se consultó el [Portal Europeo de e-Justicia sobre divorcio en Italia](https://e-justice.europa.eu/topics/family-matters-inheritance/divorce-and-legal-separation/it_en) y la información del [Ministero della Giustizia sobre responsabilidad parental](https://www.giustizia.it/giustizia/page/it/custodia_figli_minorenni_e_responsabilita_genitoriale). Estas referencias no convierten las reglas de juego en un asesoramiento jurídico ni en una reproducción de los tribunales de todos los países.
