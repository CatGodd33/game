import type { DecisionDefinition, DecisionVariant } from "./decision-types.js";
import { createRng, deriveSeed } from "./rng.js";
import { EVENT_DECISION_VARIANTS } from "./event-decision-variants.js";

/**
 * Banco de variantes narrativas.
 *
 * Una variante nunca cambia opciones, costes, probabilidades ni efectos. Solo
 * cambia el modo de contar la misma encrucijada. La elección es determinista a
 * partir de la semilla, el turno y el jugador, de modo que dos personas en un
 * duelo comparten la mecánica pero no leen exactamente el mismo texto.
 */
export const DECISION_VARIANTS: Record<string, DecisionVariant[]> = {
    infancia_vinculo: [
        {
            title: "La casa donde aprendiste a estar",
            description: "Antes de tener recuerdos claros, alguien decidía las rutinas, las voces y los silencios de tu casa. El modo en que te cuidaron dejó una huella que todavía no sabes nombrar.",
            contextNote: "El cuidado temprano no lo elegiste tú. Sí condiciona tu salud, tu seguridad y tu forma de pedir ayuda.",
        },
        {
            title: "Las primeras rutinas",
            description: "Tu primera infancia transcurrió entre horarios, manos y habitaciones que no elegías. Unos días había tiempo; otros, prisa. Lo que quedó fue una manera de estar en el mundo.",
            contextNote: "La familia no es un juicio moral: es el punto de partida de tus oportunidades.",
        },
    ],
    infancia_aprendizaje: [
        {
            title: "Las tardes que te formaron",
            description: "Hay libros, una pantalla y un patio. Nadie te pregunta qué quieres ser, pero cada tarde vas eligiendo en qué te conviertes.",
            contextNote: "Aprender en la infancia no es solo estudiar: también es descubrir qué te sostiene la atención.",
        },
        {
            title: "Jugar también es elegir",
            description: "Después del colegio queda un hueco de horas. Puedes llenarlo de historias, de movimiento o de estímulo rápido. Ninguna opción es gratuita.",
        },
    ],
    infancia_salud: [
        {
            title: "La cita que la familia aplazó",
            description: "Hay una revisión pendiente y una vacuna atrasada. En casa hay que decidir si se pierde una mañana y algo de dinero para prevenir un problema que aún no duele.",
            contextNote: "La salud infantil depende de decisiones adultas. La prevención suele ser invisible cuando funciona.",
        },
        {
            title: "Una molestia que nadie nombra",
            description: "Llevas semanas con una pequeña molestia. No impide jugar, pero está ahí. La familia puede llevarte al centro de salud o esperar a que pase.",
        },
    ],
    infancia_amistades: [
        {
            title: "El recreo se termina y empieza otra cosa",
            description: "Un grupo del colegio quiere quedar por la tarde. En casa hay tareas, una actividad que cuesta dinero y la sensación de que siempre falta tiempo.",
            contextNote: "Las primeras amistades enseñan a negociar pertenencia, tiempo y límites.",
        },
        {
            title: "Un sitio en la mesa",
            description: "Alguien te ha guardado un sitio. Para quedarte tendrás que compartir lo que tienes en casa y renunciar a una tarde de silencio.",
        },
    ],
    adolescencia_estudios: [
        {
            title: "El último curso antes de decidir",
            description: "Las notas cuentan una parte de ti. La otra es la energía que te queda después de ayudar en casa, dormir mal o sostener un grupo que no siempre te cuida.",
            contextNote: "Estudiar más no garantiza éxito; estudiar sin condiciones tampoco es una elección libre.",
        },
        {
            title: "Una mochila llena de expectativas",
            description: "En casa hablan de tu futuro como si ya estuviera escrito. Tú tienes que decidir cuánto esfuerzo pones en el siguiente curso y cuánto espacio dejas para lo demás.",
        },
    ],
    adolescencia_social: [
        {
            title: "El grupo que te invita",
            description: "Hay una fiesta, un equipo y una tarde de voluntariado. El fin de semana no alcanza para todo. Lo que elijas dirá algo de quién eres en este momento.",
            contextNote: "La pertenencia adolescente puede proteger o presionar. Ambas cosas ocurren a la vez.",
        },
        {
            title: "La hora de volver a casa",
            description: "Tus amistades alargan la tarde. En casa hay una norma y una preocupación real. Cumplirla te cuesta un plan; romperla te cuesta confianza.",
        },
    ],
    adolescencia_salud_mental: [
        {
            title: "Una cabeza que no descansa",
            description: "El cansancio ya no se va durmiendo. Puedes pedir ayuda, cambiar tus rutinas o seguir aparentando que todo está bien.",
            contextNote: "Pedir ayuda a tiempo es una decisión de salud, no una señal de debilidad.",
        },
        {
            title: "Lo que no cuentas en casa",
            description: "Hay algo que te pesa y no encuentras las palabras. Un adulto de confianza podría escucharte, pero primero tendrías que dejar de esconderlo.",
        },
    ],
    primer_trabajo: [
        {
            title: "Tu primera nómina",
            description: "Alguien te ofrece unas horas después de clase. El dinero resolvería cosas, pero también te quitaría tiempo de estudio y de descanso.",
            contextNote: "El primer empleo no solo enseña a trabajar: enseña cuánto valen tu tiempo y tus límites.",
        },
        {
            title: "Aprender fuera del aula",
            description: "Un negocio del barrio busca ayuda. No es el trabajo de tus sueños, pero es una puerta. La pregunta es qué puerta te abre y cuál te cierra.",
        },
    ],
    post_secundaria: [
        {
            title: "La carta que decides abrir",
            description: "Termina una etapa y empieza una elección que no se puede aplazar. Universidad, formación técnica, trabajo o una pausa: cada camino tiene un precio distinto.",
            contextNote: "El sistema educativo y el dinero familiar filtran las opciones, pero no deciden por ti.",
        },
        {
            title: "El día después del instituto",
            description: "Tus amigos ya han hablado de sus planes. Tú todavía no sabes si estudiar es una inversión, una deuda o una forma de ganar tiempo.",
        },
    ],
    independencia: [
        {
            title: "Una llave propia",
            description: "Tienes ingresos, pero el alquiler se lleva una parte enorme. Compartir, esperar o comprar cambia tu libertad y tu riesgo de una forma que no se ve en una foto.",
            contextNote: "La vivienda no es solo un gasto: es una red de seguridad o una obligación, según cómo la uses.",
        },
        {
            title: "La casa de tu infancia",
            description: "Seguir en casa te da margen económico y menos intimidad. Irte te da independencia y una factura que no perdona. No hay una salida limpia.",
        },
    ],
    primer_empleo: [
        {
            title: "La primera puerta profesional",
            description: "Hay una oferta estable, otra que paga más y un proyecto propio que aún no tiene clientes. Elegir no es solo elegir un sueldo: es elegir cómo quieres aprender.",
            contextNote: "El primer empleo pesa durante años en tu red, tu salario y tu salud.",
        },
        {
            title: "Firmar o seguir buscando",
            description: "Una empresa quiere contratarte ya. El contrato no es perfecto. Tu cuenta bancaria tiene prisa; tu futuro laboral, también.",
        },
    ],
    consolidar_carrera: [
        {
            title: "El ascenso que también es una trampa",
            description: "Te ofrecen más responsabilidad y más dinero. El equipo es pequeño, el horario se estira y nadie garantiza que el puesto exista dentro de dos años.",
            contextNote: "Subir no siempre es avanzar. La calidad del contrato y tu salud importan tanto como el salario.",
        },
        {
            title: "La conversación sobre tu futuro",
            description: "Tu jefe quiere saber dónde te ves. Puedes pedir un ascenso, especializarte o cambiar de sector. Las tres respuestas tienen consecuencias distintas.",
        },
    ],
    formacion_continua: [
        {
            title: "Volver a estudiar con la vida en marcha",
            description: "Un máster, un curso corto o aprender por tu cuenta. El conocimiento no se pierde, pero el tiempo y el dinero tampoco vuelven.",
            contextNote: "La formación continua compite con el trabajo, la familia y el descanso.",
        },
        {
            title: "La factura de aprender",
            description: "La formación que quieres cuesta dinero y noches. Puedes financiarla, elegir algo más barato o esperar a tener más margen.",
        },
    ],
    pareja_adulta: [
        {
            title: "Alguien que se queda",
            description: "Una relación empieza a ocupar un lugar real en tu semana. Puedes cuidarla, dejarla crecer o proteger tu independencia antes de comprometerte.",
            contextNote: "Las relaciones no se miden solo por su duración: también por el espacio que te dejan ser.",
        },
        {
            title: "La conversación que evitas",
            description: "Hay una persona con la que compartes más de lo que admites. Definir la relación puede dar tranquilidad o romper algo que aún no tenía nombre.",
        },
    ],
    convivencia: [
        {
            title: "Compartir una dirección",
            description: "Habéis hablado de vivir juntos. Hacerlo cambia el dinero, el espacio, las rutinas y la forma en que resolvéis los conflictos.",
            contextNote: "La convivencia es una decisión económica y afectiva al mismo tiempo.",
        },
        {
            title: "La casa de los dos",
            description: "Una llave compartida parece un paso natural. También es un contrato informal sobre tiempo, dinero y cuidado.",
        },
    ],
    hijos_decision: [
        {
            title: "La pregunta sobre tener hijos",
            description: "La vida en común ha llegado a un punto en el que el deseo, el miedo y las expectativas familiares se mezclan. Tener un hijo cambia el presente y el futuro.",
            contextNote: "La decisión no es solo biológica: también es económica, afectiva y de tiempo.",
        },
        {
            title: "Cuidar a alguien que aún no existe",
            description: "Puedes intentar tener un hijo, adoptar o decidir que tu vida no necesita ese capítulo. Ninguna respuesta te convierte en mejor o peor persona.",
        },
    ],
    comprar_vivienda: [
        {
            title: "La casa y la deuda",
            description: "Comprar al contado, firmar una hipoteca o seguir alquilando. El precio no es el único dato: también cuentan los intereses, la movilidad y el colchón que te queda.",
            contextNote: "Una vivienda puede ser patrimonio o una obligación que limita tus decisiones durante décadas.",
        },
        {
            title: "Las llaves y la letra pequeña",
            description: "El banco ha dicho que puedes pagar. El barrio ha dicho que te gusta. Tu cuenta bancaria aún no ha dicho nada.",
        },
    ],
    mudanza_ciudad: [
        {
            title: "Una ciudad que promete otra vida",
            description: "Puedes mudarte a una ciudad más grande, quedarte en una media o no moverte. El trabajo, el alquiler y tu red de apoyo cambian a la vez.",
            contextNote: "Moverse no borra los problemas, pero cambia las oportunidades que tienes delante.",
        },
        {
            title: "La distancia como inversión",
            description: "Hay una oportunidad a varias horas de tu casa. Aceptar implica dejar atrás parte de tu red y aprender a construir otra.",
        },
    ],
    emigrar: [
        {
            title: "Un billete con preguntas",
            description: "El país de destino tiene más oportunidades sobre el papel, pero también idioma, papeles y soledad. Puedes irte, prepararte mejor o quedarte.",
            contextNote: "Migrar no es una garantía de éxito: es una redistribución de riesgos y oportunidades.",
        },
        {
            title: "La maleta y los papeles",
            description: "Tienes una oportunidad fuera y una vida aquí. Ninguna cabe entera en una maleta. La decisión exige calcular costes que no siempre son dinero.",
        },
    ],
    seguro_salud: [
        {
            title: "El seguro que no sabes si necesitas",
            description: "Puedes pagar una cobertura privada, confiar en el sistema público o quedarte sin seguro. La salud no avisa antes de pedir factura.",
            contextNote: "El acceso a la atención médica depende del país, del empleo y de tu capacidad de pago.",
        },
        {
            title: "La letra pequeña de cuidarte",
            description: "La prima mensual es asequible hasta que deja de serlo. La sanidad pública es más lenta, pero no te pregunta por tu saldo.",
        },
    ],
    deuda_adulta: [
        {
            title: "El crédito que parece una solución",
            description: "Una formación, una mudanza o una emergencia pueden financiarse. La deuda compra tiempo, pero también compra tranquilidad a un precio que no siempre ves al firmar.",
            contextNote: "El coste real de una deuda incluye intereses, estrés y libertad futura.",
        },
        {
            title: "Firmar con la cuenta en rojo",
            description: "El banco ofrece dinero rápido y condiciones que no terminan de quedar claras. Puedes aceptar, negociar o buscar otra salida.",
        },
    ],
    salud_adulta: [
        {
            title: "El cuerpo empieza a avisar",
            description: "Una revisión, ejercicio o ignorar los síntomas. La salud adulta no se decide en un día, pero sí empieza a notarse en las rutinas.",
            contextNote: "La prevención y los hábitos tienen efectos acumulativos, no inmediatos.",
        },
        {
            title: "La revisión que llevas aplazando",
            description: "No hay urgencia visible. Precisamente por eso es fácil seguir aplazándola hasta que el cuerpo cambie el tono de la conversación.",
        },
    ],
    amistades_adultas: [
        {
            title: "Los amigos que quedan",
            description: "La agenda se llena y las amistades empiezan a requerir planificación. Puedes cultivar los vínculos, priorizar el trabajo o buscar una comunidad nueva.",
            contextNote: "El apoyo social es un activo de salud y de resiliencia, aunque no aparezca en la cuenta bancaria.",
        },
        {
            title: "Una llamada pendiente",
            description: "Alguien te escribió hace semanas. Responder no cuesta dinero, pero sí tiempo y una cierta valentía afectiva.",
        },
    ],
    cuidar_mayores: [
        {
            title: "Cuando un padre necesita ayuda",
            description: "La salud de tus padres cambia y con ella la organización de la familia. Cuidar en casa, pagar una residencia o mantener distancia son opciones con costes distintos.",
            contextNote: "El cuidado familiar recae a menudo en las mujeres y en quienes tienen menos margen laboral.",
        },
        {
            title: "La conversación sobre la vejez",
            description: "Nadie quiere hablar de la dependencia hasta que ya está en la mesa. Hoy puedes decidir cómo repartir tiempo, dinero y responsabilidad.",
        },
    ],
    crisis_media_vida: [
        {
            title: "La mitad del camino",
            description: "Tienes experiencia y menos tiempo por delante. Puedes reinventarte, sostener lo que hay o volver a poner a la familia en el centro.",
            contextNote: "Reinventarse no es empezar de cero: es reorganizar lo aprendido.",
        },
        {
            title: "Lo que ya no quieres repetir",
            description: "Durante años hiciste lo que se esperaba de ti. Ahora aparece una pregunta incómoda: ¿qué parte de esa vida eliges conservar?",
        },
    ],
    plan_pensiones: [
        {
            title: "El dinero que necesitarás después",
            description: "Ahorrar para la jubilación compite con el alquiler, los hijos y el presente. Puedes planificar, ahorrar lo básico o confiar en el sistema público.",
            contextNote: "La pensión futura depende del país, del historial laboral y de las decisiones de hoy.",
        },
        {
            title: "La vejez en una hoja de cálculo",
            description: "Un plan privado promete tranquilidad si puedes pagarlo. El sistema público promete una base que quizá no alcance. No hay una respuesta sin riesgo.",
        },
    ],
    educacion_hijos: [
        {
            title: "La escuela que puedes pagar",
            description: "Puedes elegir un colegio privado, invertir tiempo en la educación pública o delegar parte de la crianza en otros. El dinero no es la única forma de estar presente.",
            contextNote: "La educación de un hijo combina recursos, tiempo y vínculo. Ninguno se sustituye del todo con dinero.",
        },
        {
            title: "Una decisión por otra persona",
            description: "Tu hijo no elige el colegio. Tú sí. Esa responsabilidad pesa más cuando el presupuesto no alcanza para todas las opciones.",
        },
    ],
    salud_40: [
        {
            title: "La década de las revisiones",
            description: "A los cuarenta el cuerpo cambia sin pedir permiso. Una revisión profunda puede detectar algo a tiempo; cambiar hábitos puede hacerlo más lento.",
            contextNote: "La salud a esta edad condiciona la energía, el trabajo y los años siguientes.",
        },
        {
            title: "Un aviso que no puedes posponer",
            description: "El cansancio ya no se explica solo por el trabajo. Puedes invertir en una revisión, cambiar la rutina o seguir funcionando al límite.",
        },
    ],
    migracion_internacional: [
        {
            title: "La oportunidad que cruza una frontera",
            description: "Un país con más salarios, otro con menos trámites y una tercera opción que todavía es solo un plan. Migrar exige dinero, papeles y una red que aún no tienes.",
            contextNote: "Cada destino tiene costes, idioma y reglas de visado distintas. La información importa más que la ilusión.",
        },
        {
            title: "Una dirección extranjera",
            description: "Tienes una oferta o una idea, pero no una garantía. Puedes irte ya, preparar una migración más sólida o quedarte y construir desde aquí.",
        },
    ],
    trabajo_contrato: [
        {
            title: "La letra pequeña del sueldo",
            description: "Firmar la oferta resuelve el mes que viene, pero no dice nada de las horas, el seguro o la cláusula de salida. Puedes negociar antes de entrar.",
            contextNote: "Un buen salario no compensa automáticamente un contrato que erosiona tu salud o tus derechos.",
        },
        {
            title: "La oferta con prisa",
            description: "La empresa necesita una respuesta hoy. Leer el contrato con calma podría costarte el puesto; firmar sin leerlo podría costarte más.",
        },
    ],
    empresa_contratar: [
        {
            title: "El negocio que ya no cabe en una persona",
            description: "Tienes clientes y más trabajo del que puedes sostener. Contratar puede multiplicar el negocio o convertir una buena racha en una nómina imposible.",
            contextNote: "Cada empleado cambia tus costes fijos, tu reputación y tu responsabilidad.",
        },
        {
            title: "Crecer con otras manos",
            description: "La empresa tiene una lista de espera y tú una agenda rota. Puedes contratar, subir precios o rechazar clientes para proteger la calidad.",
        },
    ],
    empresa_crisis: [
        {
            title: "Dos meses sin margen",
            description: "Los proveedores llaman, la reputación se resiente y la caja no llega a todo. Puedes invertir, recortar o compartir el control antes de que la situación te supere.",
            contextNote: "Una crisis de empresa se resuelve con decisiones de caja, de equipo y de modelo de negocio, no solo con optimismo.",
        },
        {
            title: "La empresa que pide una decisión incómoda",
            description: "El negocio sigue abierto, pero pierde dinero. Cada semana sin decidir hace que la siguiente sea más cara.",
        },
    ],
    compra_vivienda: [
        {
            title: "Firmar una hipoteca o no",
            description: "El banco aprueba una cantidad que parece suficiente. La casa te gusta. El riesgo es que la vida cambie antes que la deuda.",
            contextNote: "La vivienda es patrimonio, pero también una obligación que puede limitar tu movilidad y tu colchón.",
        },
        {
            title: "La casa que no cabe en el sueldo",
            description: "El alquiler sube y la compra se presenta como solución. Antes de firmar, hay que mirar intereses, gastos y lo que ocurre si pierdes el empleo.",
        },
    ],
    mascota_compania: [
        {
            title: "Alguien que depende de ti",
            description: "Una mascota llena la casa y también la agenda. Adoptar significa comprometer tiempo, dinero y cuidado durante años.",
            contextNote: "El vínculo con un animal es real, pero no sustituye automáticamente otras relaciones.",
        },
        {
            title: "El animal del patio",
            description: "Un perro o un gato busca un lugar. Puedes adoptarlo, acogerlo un tiempo o reconocer que ahora no tienes margen.",
        },
    ],
    invertir_ahorros: [
        {
            title: "El dinero parado también se mueve",
            description: "Tienes ahorros y la inflación no espera. Puedes invertir, dejar el dinero disponible o construir un fondo de emergencia.",
            contextNote: "Mayor rentabilidad suele significar más riesgo. Mantener liquidez también es una decisión financiera.",
        },
        {
            title: "Qué hacer con un colchón",
            description: "Una parte de tu dinero podría crecer; otra podría necesitarse mañana. El equilibrio entre ambas dice mucho de tu situación real.",
        },
    ],

    story_first_encounter: [
        {
            title: "Una visita cambia la tarde",
            description: "Hay una bolsa junto a la puerta, zapatos que no son de casa y una voz que viene de la cocina. Alguien nuevo ocupa el espacio donde normalmente juegas. Tu primera reacción dirá algo de ti, aunque todavía no sepas explicarlo.",
        },
        {
            title: "Dos años y una habitación distinta",
            description: "La casa está más llena de lo normal. Un bebé llora en otra habitación y los adultos hablan en voz baja. Te acercas sin saber si debes quedarte o volver a tus juguetes.",
        },
    ],
    primer_negocio: [
        {
            title: "La idea que no deja de volver",
            description: "Tienes un cuaderno con números, un contacto y una idea que podría sostenerte. También tienes una nómina que no quieres perder. Emprender es cambiar una seguridad por una posibilidad.",
            contextNote: "El negocio puede crecer o fracasar. El coste inicial y la caja disponible importan tanto como la idea.",
        },
        {
            title: "Un local, una cuenta y una decisión",
            description: "El alquiler del local está a tu nombre en el borrador del contrato. Aún no lo has firmado. Si lo haces, tu vida cotidiana dejará de depender solo de una nómina.",
        },
    ],
    empresa_crecer: [
        {
            title: "La empresa se quedó pequeña",
            description: "Los pedidos ya no caben en el calendario. Crecer exige contratar, alquilar o decir que no. Las tres opciones tienen un coste que no aparece en la misma línea.",
        },
        {
            title: "Una segunda puerta",
            description: "El local de al lado está libre. Podrías ampliar, reforzar lo que ya funciona o esperar. La diferencia no es solo metros: es el riesgo que estás dispuesto a asumir.",
        },
    ],
    hijo_boda: [
        {
            title: "La boda y la factura",
            description: "Tu hijo ha decidido casarse. La familia espera una celebración y tú tienes que decidir cuánto puedes aportar sin poner en riesgo tu propia estabilidad.",
            contextNote: "El dinero familiar no es solo dinero: también expresa expectativas y límites.",
        },
        {
            title: "Un brindis que cuesta dinero",
            description: "Hay una fecha, una lista de invitados y una conversación pendiente sobre quién paga qué. Ayudar no siempre significa pagar todo.",
        },
    ],
    apoyo_padres: [
        {
            title: "Tus padres ya no pueden solos",
            description: "Una caída, una factura médica o una casa que se ha vuelto demasiado grande. Tus padres necesitan ayuda y la familia espera que tú decidas cómo darla.",
        },
        {
            title: "La mesa de siempre, con otra silla",
            description: "La salud de tus padres ha cambiado. Puedes aportar dinero, tiempo o una conversación difícil con tus hermanos. Ninguna opción devuelve las cosas a como eran.",
        },
    ],
    donacion_personal: [
        {
            title: "Una causa que te mira de cerca",
            description: "Alguien del barrio ha organizado una colecta. Puedes donar, ofrecer tiempo o decir que no. Tu situación económica también forma parte de la respuesta.",
        },
        {
            title: "Lo que puedes devolver",
            description: "Tuviste ayuda cuando la necesitabas. Ahora alguien pide la tuya. No tienes que salvar el mundo; solo decidir qué parte de tu margen estás dispuesto a compartir.",
        },
    ],
    visa_calificada: [
        {
            title: "La visa que depende de un expediente",
            description: "Un país abre un proceso para profesionales de tu sector. Puedes preparar los papeles, probar un destino distinto o quedarte y mejorar tu perfil.",
            contextNote: "La visa no solo depende de tu formación: también de idioma, oferta y capacidad de esperar.",
        },
        {
            title: "Una plaza en otro mercado",
            description: "La oferta existe, pero la burocracia también. Cada destino tiene un coste y una probabilidad distinta de terminar en una vida nueva.",
        },
    ],
    enfermedad_seria: [
        {
            title: "El cuerpo cambia las prioridades",
            description: "Un diagnóstico obliga a reorganizar el año. Puedes pagar la atención más rápida, aceptar el circuito público o reducir el ritmo antes de que el cuerpo lo imponga.",
        },
        {
            title: "Una factura que no esperabas",
            description: "La salud se rompe y con ella la agenda. El tratamiento tiene costes económicos y también de tiempo, trabajo y relaciones.",
        },
    ],
    company_food_margin: [
        {
            title: "El menú que deja poco margen",
            description: "Los platos más pedidos son también los que peor pagan el coste de los ingredientes. Cambiar precios puede alejar clientela; no cambiar nada puede vaciar la caja sin hacer ruido.",
            contextNote: "En un negocio pequeño, el margen se decide entre la compra, la merma y el precio que el barrio acepta pagar.",
        },
        {
            title: "Merma en la cocina",
            description: "Parte de la compra termina en la basura y el menú no refleja ese coste. Antes de tocar los precios, puedes medir qué se pierde y por qué.",
            contextNote: "Reducir desperdicio no garantiza rentabilidad, pero suele ser una palanca más rápida que subir precios.",
        },
    ],
    company_workshop_supplier: [
        {
            title: "El proveedor aprieta",
            description: "El material escasea y el proveedor pide pago anticipado. Comprar todo de golpe protege el pedido, pero deja la caja expuesta durante semanas.",
            contextNote: "En un taller, financiar el pedido del cliente puede ser tan arriesgado como rechazarlo.",
        },
        {
            title: "Materiales con fecha límite",
            description: "Un pedido importante depende de una entrega que no llega. Cambiar de proveedor puede resolver el plazo o introducir un acabado que el cliente no acepte.",
            contextNote: "La calidad y el flujo de caja compiten cuando el taller trabaja al límite.",
        },
    ],
    company_tech_contract: [
        {
            title: "Un contrato que crece por dentro",
            description: "El cliente firma un precio y sigue añadiendo funciones. Cada petición parece pequeña; juntas pueden convertir un proyecto rentable en meses de trabajo regalado.",
            contextNote: "El alcance no se controla con buena voluntad: necesita criterios de aceptación y cambios presupuestados.",
        },
        {
            title: "El alcance se escapa",
            description: "El equipo ya está al límite y el cliente promete que la próxima función será la última. Tienes que decidir si amplías capacidad, renegocias o renuncias al contrato.",
            contextNote: "Contratar para un pico de demanda crea una nómina que sigue existiendo cuando el pico termina.",
        },
    ],
    company_music_rights: [
        {
            title: "La productora y el catálogo",
            description: "Una productora ofrece promoción a cambio de una parte de tus futuros ingresos. El anticipo tienta, pero la duración y los derechos pueden valer más que el dinero inmediato.",
            contextNote: "En la música, ceder derechos es una decisión de largo plazo que sobrevive a la moda del momento.",
        },
        {
            title: "Derechos sobre lo que creaste",
            description: "El contrato habla de distribución, pero no aclara qué pasa si quieres recuperar el catálogo. Firmar sin revisar puede convertir tu obra en un activo ajeno.",
            contextNote: "La letra pequeña de un acuerdo creativo puede importar más que el anticipo anunciado.",
        },
    ],
    company_partner_review: [
        {
            title: "Un socio con prisa",
            description: "Alguien ofrece capital y contactos para entrar en tu empresa, pero quiere influir en las decisiones. La oportunidad es real; el reparto de control también.",
            contextNote: "Un socio puede aportar lo que falta o convertir una empresa pequeña en un conflicto permanente.",
        },
        {
            title: "Capital y control",
            description: "La propuesta promete crecimiento y exige una silla en la mesa. Antes de aceptar, hay que separar promesas, responsabilidades y capacidad de financiar un mal trimestre.",
            contextNote: "El capital no sustituye un modelo de negocio: cambia quién decide cuando llega la crisis.",
        },
    ],
    comercio_inventario: [
        {
            title: "El almacén inmóvil",
            description: "Comprar más stock protege las ventas de una buena racha, pero también inmoviliza dinero y ocupa espacio. La previsión de demanda nunca es una certeza.",
            contextNote: "En comercio, el inventario es a la vez una oportunidad y una deuda disfrazada de producto.",
        },
        {
            title: "Comprar antes de vender",
            description: "Un proveedor ofrece un descuento por volumen. El precio baja, pero el riesgo sube si la clientela cambia de hábito antes de vaciar el almacén.",
            contextNote: "El descuento solo es una ventaja si el producto se vende dentro del plazo previsto.",
        },
    ],
    clinica_cobros: [
        {
            title: "La clínica cobra tarde",
            description: "Las consultas se llenan, pero las aseguradoras y los pacientes tardan en pagar. La agenda parece sana mientras la caja acumula facturas pendientes.",
            contextNote: "Un negocio sanitario puede crecer y quedarse sin liquidez si confunde facturación con cobro.",
        },
        {
            title: "Caja y pacientes",
            description: "Las citas no se detienen y los recibos se acumulan. Pedir anticipos puede proteger la caja o expulsar a pacientes que necesitan flexibilidad.",
            contextNote: "La sostenibilidad de una clínica combina calidad asistencial, cobros y costes fijos.",
        },
    ],
    tiempo_propio: [
        {
            title: "Un hueco que no aparece",
            description: "El trabajo y las obligaciones ocupan la semana entera. Si quieres proteger algo que no sea urgente, tendrás que decidir qué margen cedes.",
            contextNote: "El tiempo libre no aparece espontáneamente: se negocia con las demás prioridades.",
        },
        {
            title: "La semana que se llena",
            description: "Tienes una hora suelta y tres cosas que podrían ocuparla. Aprender, cuidar a otros o descansar no son opciones equivalentes, aunque las tres parezcan razonables.",
            contextNote: "Priorizar no es elegir la opción perfecta; es aceptar qué queda fuera esta vez.",
        },
    ],
    cuidar_nietos: [
        {
            title: "Los nietos y la agenda",
            description: "Tu hijo necesita ayuda con los nietos. Cuidarlos te devuelve energía y también te la quita. La rutina de la familia vuelve a depender de ti.",
            contextNote: "El cuidado familiar es trabajo real, aunque no aparezca en una nómina.",
        },
        {
            title: "Cuidar sin desaparecer",
            description: "La casa se llena de horarios y voces pequeñas. Puedes asumir más días, pagar parte de la guardería o proteger el tiempo que necesitas para ti.",
            contextNote: "Poner límites al cuidado no equivale a abandonar a la familia.",
        },
    ],
    acuerdo_pareja: [
        {
            title: "La conversación con {partner}",
            description: "Hay una decisión con {partner} que ambos evitan. Hablarla puede dar tranquilidad o mostrar una diferencia que ya no se puede aplazar.",
            contextNote: "Las relaciones se sostienen con conversaciones que no siempre llegan en el mejor momento.",
        },
        {
            title: "Lo que no se reparte con {partner}",
            description: "El día a día con {partner} funciona, pero una parte de la carga no está nombrada. Ponerla sobre la mesa puede mejorar el vínculo o abrir un conflicto.",
            contextNote: "La logística doméstica también es una forma de poder dentro de la pareja.",
        },
    ],
    crianza_dialogo: [
        {
            title: "Hablar de la crianza",
            description: "Dos personas que quieren a un hijo no siempre coinciden en cómo cuidarlo. La conversación puede unir criterios o revelar que hace falta ayuda externa.",
            contextNote: "No existe una crianza sin errores; sí existen acuerdos que evitan que el cansancio decida por vosotros.",
        },
        {
            title: "Dos formas de cuidar",
            description: "La rutina del niño cambia y cada adulto tiene una idea distinta de lo que necesita. Tienes que decidir qué flexibilizas y qué límite mantienes.",
            contextNote: "La coordinación parental importa tanto como el tiempo dedicado.",
        },
    ],
    child_care_plan: [
        {
            title: "Las primeras noches",
            description: "El bebé duerme a ratos y la casa entera se reorganiza. Repartir turnos, pagar ayuda o recortar otros planes cambia el descanso de todos.",
            contextNote: "Los primeros meses no se resuelven con una sola decisión, pero las condiciones que creas ahora pesan.",
        },
        {
            title: "Turnos con un bebé",
            description: "La nevera está llena de notas y nadie ha dormido del todo. Cada solución alivia una parte del día y traslada el cansancio a otra.",
            contextNote: "El cuidado infantil exige tiempo, dinero y una red; elegir una sola pieza no cubre todo.",
        },
    ],
    child_school_plan: [
        {
            title: "La escuela de {child}",
            description: "{child} empieza una etapa escolar. La escuela pública, la privada y el apoyo comunitario ofrecen cosas distintas, y ninguna garantiza el futuro.",
            contextNote: "La educación combina recursos, presencia y expectativas; el precio no sustituye el acompañamiento.",
        },
        {
            title: "Elegir la escuela de {child}",
            description: "La cuota mensual compite con otras necesidades del hogar. Antes de decidir, hay que separar lo que quieres ofrecer de lo que puedes sostener durante años.",
            contextNote: "Una matrícula recurrente es un compromiso de largo plazo, no un gasto de un solo curso.",
        },
    ],
    child_adult_study: [
        {
            title: "El siguiente paso de tu hijo",
            description: "Tu hijo termina la secundaria y las opciones no cuestan lo mismo. Apoyar estudios, un oficio o una búsqueda de empleo cambia su margen y el tuyo.",
            contextNote: "La ayuda familiar puede abrir una puerta, pero también crear una obligación que no conviene ocultar.",
        },
        {
            title: "Estudiar o trabajar",
            description: "La decisión no es solo académica: también es económica y familiar. Sostener una formación larga exige prever alojamiento, materiales y meses sin ingresos.",
            contextNote: "El retorno de los estudios depende del país, el sector y el tiempo que se pueda esperar.",
        },
    ],
    child_family_company: [
        {
            title: "Trabajar en familia",
            description: "Tu hijo quiere entrar en la empresa. Darle una oportunidad puede fortalecer el vínculo o mezclar afecto, autoridad y salario en la misma mesa.",
            contextNote: "El parentesco no sustituye funciones, formación ni criterios de evaluación.",
        },
        {
            title: "Una nómina con apellido",
            description: "La empresa necesita manos y tu hijo necesita experiencia. Contratarlo resuelve dos cosas a la vez, pero también crea una obligación que la familia notará.",
            contextNote: "Un puesto real exige responsabilidades claras y un coste que la empresa pueda sostener.",
        },
    ],
};

export function chooseDecisionVariant(
    decision: DecisionDefinition,
    worldSeed?: string,
    turn?: number,
    countryCode?: string,
    eventId?: string,
): DecisionVariant | undefined {
    // Prioridad: variante ligada al suceso concreto > variantes declaradas en
    // la decisión > banco general. Las variantes nunca alteran opciones,
    // costes, probabilidades ni efectos: solo cambian el relato.
    const eventVariants = eventId ? EVENT_DECISION_VARIANTS[eventId] : undefined;
    const variants = (
        eventVariants?.length
            ? eventVariants
            : decision.variants?.length
                ? decision.variants
                : DECISION_VARIANTS[decision.id] ?? []
    ).filter((variant) => variant.title.length > 0 && variant.description.length > 0);
    if (variants.length === 0) return undefined;
    // La variante se elige por mundo, turno y situación, no por jugador: en un
    // duelo ambos deben leer la misma información antes de decidir.
    // El país no entra en la semilla de la variante: ya aparece en los tokens
    // del texto y no debe cambiar arbitrariamente el planteamiento del problema.
    const rng = createRng(
        deriveSeed(
            worldSeed ?? "local-variant",
            "variant",
            turn ?? 0,
            decision.id,
            eventId ?? decision.eventId ?? "",
        ),
    );
    return variants[rng.int(0, variants.length - 1)];
}
