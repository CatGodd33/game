import {EDUCATION_PATH} from "./education-path.js";
import {RELATIONSHIP_CRISES} from "./relationship-crises.js";
import {PROPERTY_DECISIONS} from "./property-decisions.js";
import { COMPANY_DECISIONS } from "./company-decisions.js";
import { WEALTH_DECISIONS } from "./wealth-decisions.js";
import { MOBILITY_DECISIONS } from "./mobility-decisions.js";
import { HOUSEHOLD_DECISIONS } from "./household-decisions.js";
import { COUNTRY_PATHS } from "./country-paths.js";
import { FAMILY_SCENARIOS } from "./family-scenarios.js";
import { CAREER_OPENINGS, CAREER_SCENARIOS } from "./career-scenarios.js";
import { RELATIONSHIP_SCENARIOS } from "./relationship-scenarios.js";
import { OPENING_DECISIONS } from "./openings.js";
import { CHILDHOOD_PATHS, LIFE_PATHS } from "./life-paths.js";
import type { DecisionDefinition } from "./decision-types.js";
import { EXPANDED_DECISIONS } from "./decision-expansion.js";

/**
 * Catálogo de decisiones de LIFE DUEL.
 *
 * Reglas de diseño:
 * - `once: true` implica que la decisión principal solo puede aparecer una vez.
 * - Las decisiones `focus` son repetibles y sostienen el ritmo anual.
 * - Los costes se expresan en reglas relativas (PIB, ingresos o gastos),
 *   nunca como cantidades fijas atadas a un país concreto.
 * - Los porcentajes de éxito son orientativos: el motor añade modificadores
 *   por conocimiento, salud, relaciones y nivel educativo.
 * - Ninguna opción concede dinero sin una transacción registrada.
 */
const BASE_DECISIONS: DecisionDefinition[] = [
    {
        id: "story_first_encounter", title: "Dos años y un mundo por descubrir",
        description: "Una visita ha dejado su bolso junto a la puerta. Hay zapatos nuevos, una voz desconocida y otros niños en la habitación. ¿Qué llama primero tu atención? Estas pequeñas elecciones van dando forma a tu temperamento.",
        category: "familia", priority: "major", minAge: 2, maxAge: 2, once: true,
        options: [
            { id: "observe", label: "Examinar con calma el bolso y los zapatos", description: "Te quedas observando los detalles, con curiosidad.", outcomes: { success: { narrative: "La curiosidad pudo más que la timidez. Estudiaste cada hebilla y cada color hasta que la visita se marchó.", temperament: "Curioso", flags: ["infancia_curioso"], stats: { knowledge: 2 } } } },
            { id: "explore", label: "Salir corriendo a descubrir qué hay fuera", description: "El mundo parece demasiado grande para quedarse quieto.", outcomes: { success: { narrative: "Te lanzaste a explorar el patio, sin apartar la mirada de todo lo nuevo.", temperament: "Aventurero", flags: ["infancia_aventurero"], stats: { health: 1, happiness: 2 } } } },
            { id: "comfort", label: "Acercarte a un niño que está llorando", description: "Algo en su tristeza te hace querer acompañarlo.", outcomes: { success: { narrative: "Te sentaste junto al niño que lloraba y le acercaste uno de tus juguetes.", temperament: "Empático", flags: ["infancia_empatico"], stats: { relationships: 3 } } } },
            { id: "persist", label: "Intentar construir la misma torre una y otra vez", description: "Cada caída es una razón para volver a empezar.", outcomes: { success: { narrative: "La torre se cayó muchas veces. Al final conseguiste colocar la última pieza y sonreíste.", temperament: "Persistente", flags: ["infancia_persistente"], stats: { knowledge: 1, happiness: 1 } } } },
        ],
    },
    {
        id: "infancia_vinculo",
        title: "Los primeros años",
        description:
            "Aún no recuerdas este momento, pero las personas que te cuidan están decidiendo cómo será tu primera infancia. El entorno familiar marca el punto de partida.",
        category: "familia",
        priority: "major",
        minAge: 0,
        maxAge: 3,
        once: true,
        options: [
            {
                id: "cuidado_cercano",
                label: "Cuidado cercano y juego",
                description: "Tiempo compartido, rutinas flexibles y mucho juego. Menos dinero, más vínculo.",
                outcomes: {
                    success: {
                        narrative:
                            "Creciste entre manos conocidas y habitaciones pequeñas llenas de voces. Aprendiste pronto que pedir ayuda no era un problema.",
                        stats: { health: 2, happiness: 5, relationships: 7, knowledge: 2 },
                        milestone: "Una infancia con vínculos estables",
                    },
                },
            },
            {
                id: "guarderia",
                label: "Guardería y estímulo temprano",
                description: "Un entorno estructurado con otros niños y actividades. Tiene un coste para la familia.",
                cost: { shareOfGdp: 0.05 },
                outcomes: {
                    success: {
                        narrative:
                            "Las tardes de guardería te enseñaron a compartir antes que a leer. Llegaste a la escuela con menos miedo a los grupos.",
                        stats: { health: 1, happiness: 2, relationships: 3, knowledge: 6 },
                        milestone: "Primeros aprendizajes en grupo",
                    },
                },
            },
            {
                id: "rutinas_estrictas",
                label: "Rutinas estrictas",
                description: "Horarios firmes y poca improvisación. La disciplina se instala antes que la ternura.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a esperar tu turno y a no hacer ruido. También aprendiste a leer el humor de los demás antes que el tuyo.",
                        stats: { happiness: -4, relationships: -2, knowledge: 4, health: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "infancia_aprendizaje",
        title: "Aprender jugando",
        description:
            "Tienes entre tres y ocho años. En casa hay libros, una pantalla y poco tiempo libre. ¿Qué ocupa tus tardes?",
        category: "educacion",
        priority: "major",
        minAge: 3,
        maxAge: 8,
        once: true,
        options: [
            {
                id: "leer_casa",
                label: "Leer en casa",
                description: "La biblioteca del barrio y un adulto que te escucha leer en voz alta.",
                outcomes: {
                    success: {
                        narrative:
                            "Los libros se convirtieron en una puerta. Descubriste que las historias podían llevarte a lugares donde nadie te decía qué hacer.",
                        stats: { knowledge: 7, happiness: 2, relationships: 1 },
                        milestone: "El primer libro que terminaste",
                    },
                },
            },
            {
                id: "deporte_infantil",
                label: "Apuntarte a un deporte",
                description: "Entrenamientos, equipo y barro. Hay una cuota que la familia debe asumir.",
                cost: { shareOfGdp: 0.02 },
                outcomes: {
                    success: {
                        narrative:
                            "El deporte te dio un cuerpo cansado y feliz. Aprendiste a perder delante de otros y a volver al día siguiente.",
                        stats: { health: 6, relationships: 4, happiness: 2, knowledge: 1 },
                    },
                },
            },
            {
                id: "pantallas",
                label: "Pantallas y patio",
                description: "Dibujos, videojuegos y amigos del edificio. Poco esfuerzo, mucha estimulación.",
                outcomes: {
                    success: {
                        narrative:
                            "Las tardes pasaban entre capítulos y partidas. Sabías mucho de mundos inventados y menos de cómo esperar sin estímulo.",
                        stats: { happiness: 3, health: -3, knowledge: -1, relationships: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "infancia_salud",
        title: "Una revisión pendiente",
        description:
            "El centro de salud llama a tu familia. Hay una vacuna atrasada y una revisión de la vista que nunca se hizo.",
        category: "salud",
        priority: "major",
        minAge: 2,
        maxAge: 10,
        once: true,
        options: [
            {
                id: "revision_completa",
                label: "Ir a la revisión",
                description: "Vacunas, vista y audición. La familia pierde una mañana y algo de dinero.",
                cost: { shareOfGdp: 0.015 },
                outcomes: {
                    success: {
                        narrative:
                            "La revisión detectó un problema pequeño a tiempo. Saliste con una tirita en el brazo y una gafas que al principio te daban vergüenza.",
                        stats: { health: 6, happiness: 1 },
                        milestone: "Primera revisión preventiva",
                    },
                },
            },
            {
                id: "habitos_casa",
                label: "Cuidarse en casa",
                description: "Comer mejor, dormir a horas y jugar fuera. Sin médicos, con constancia.",
                outcomes: {
                    success: {
                        narrative:
                            "Tu familia cambió las cenas por fruta y las mañanas por paseos. No fue emocionante, pero te sentías con más energía.",
                        stats: { health: 4, happiness: 2 },
                    },
                },
            },
            {
                id: "sin_revision",
                label: "No ir por ahora",
                description: "Hay otras urgencias. La revisión puede esperar.",
                outcomes: {
                    success: {
                        narrative:
                            "Nadie volvió a mencionarlo. Durante años conviviste con pequeñas molestias que aprendiste a ignorar.",
                        stats: { health: -3, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "infancia_amistades",
        title: "El patio después de clase",
        description:
            "Tienes entre seis y doce años. Un grupo del colegio quiere quedar por la tarde, pero en casa hay tareas y una actividad que cuesta dinero.",
        category: "relaciones",
        priority: "major",
        minAge: 6,
        maxAge: 12,
        once: true,
        options: [
            {
                id: "amigos_casa",
                label: "Invitar a casa",
                description: "Merendar, jugar y hacer deberes juntos. Sin coste adicional.",
                outcomes: {
                    success: {
                        narrative:
                            "Tu casa se llenó de zapatos en la entrada. Aprendiste que una amistad también se construye compartiendo lo poco que hay.",
                        stats: { relationships: 7, happiness: 4, knowledge: 1 },
                        milestone: "Una amistad de la infancia",
                    },
                },
            },
            {
                id: "actividad_extra",
                label: "Actividad extraescolar",
                description: "Música o idiomas después de clase. La familia paga la matrícula.",
                cost: { shareOfGdp: 0.04 },
                outcomes: {
                    success: {
                        narrative:
                            "Descubriste una habilidad que no sabías que tenías. Los martes dejaron de ser un día cualquiera.",
                        stats: { relationships: 3, knowledge: 4, health: 2, happiness: 2 },
                    },
                },
            },
            {
                id: "tiempo_solo",
                label: "Tiempo a solas",
                description: "Leer, dibujar o simplemente no quedar. La calma también tiene su precio.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a estar sin compañía. Disfrutabas de tus propios mundos, aunque a veces el recreo se hacía largo.",
                        stats: { knowledge: 3, relationships: -4, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "infancia_responsabilidades",
        title: "Una tarea de mayores",
        description:
            "En casa hace falta una mano. Puedes ayudar en el negocio familiar, cuidar de un hermano o concentrarte en la escuela.",
        category: "familia",
        priority: "major",
        minAge: 9,
        maxAge: 14,
        once: true,
        options: [
            {
                id: "ayudar_familia",
                label: "Ayudar en casa o en el negocio",
                description: "Menos tiempo de estudio, más responsabilidad. La familia lo nota.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a contar cambio y a tratar con clientes antes que a resolver ecuaciones. Te sentiste útil, y también cansado.",
                        stats: { relationships: 4, knowledge: 1, happiness: -1 },
                        milestone: "Tu primera responsabilidad real",
                    },
                },
            },
            {
                id: "ahorrar_paga",
                label: "Ahorrar la paga",
                description: "Guardar una parte cada semana en una caja escondida.",
                outcomes: {
                    success: {
                        narrative:
                            "La caja se convirtió en un pequeño secreto. Aprendiste que renunciar a algo hoy podía darte tranquilidad mañana.",
                        stats: { knowledge: 2, happiness: 1 },
                        moneyDelta: 60,
                    },
                },
            },
            {
                id: "priorizar_escuela",
                label: "Priorizar la escuela",
                description: "Deberes y biblioteca. Otros asumen tus tareas en casa.",
                outcomes: {
                    success: {
                        narrative:
                            "Tu familia te protegió del ruido para que estudiaras. No siempre lo agradeciste; ahora sabes lo que costó.",
                        stats: { knowledge: 4, relationships: 1, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "adolescencia_estudios",
        title: "El rumbo del instituto",
        description:
            "Tienes quince años y las notas del trimestre están sobre la mesa. La decisión no solo afecta al curso: también al tipo de vida que imaginas.",
        category: "educacion",
        priority: "major",
        minAge: 12,
        maxAge: 16,
        once: true,
        options: [
            {
                id: "esfuerzo_academico",
                label: "Esforzarte en los estudios",
                description: "Clases, deberes y un objetivo claro. Menos ocio durante unos años.",
                check: { type: "educacion", base: 72 },
                outcomes: {
                    success: {
                        narrative:
                            "Las notas subieron y con ellas las opciones. Descubriste que la constancia era una forma de libertad.",
                        stats: { knowledge: 9, happiness: -1, relationships: 1 },
                        education: "secondary",
                        milestone: "Terminar la secundaria con buen expediente",
                    },
                    failure: {
                        narrative:
                            "Lo intentaste, pero las asignaturas se acumularon. Aprendiste que no todos los esfuerzos se ven recompensados de inmediato.",
                        stats: { knowledge: 3, happiness: -4 },
                        education: "secondary",
                    },
                },
            },
            {
                id: "formacion_tecnica",
                label: "Empezar una formación técnica",
                description: "Taller, práctica y un oficio. Hay que elegir pronto.",
                cost: { shareOfGdp: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "Las manos aprendieron antes que la teoría. Descubriste que había un lugar donde tu habilidad se notaba al final del día.",
                        stats: { knowledge: 5, health: 1, happiness: 2 },
                        education: "vocational",
                        milestone: "Primer oficio aprendido",
                    },
                },
            },
            {
                id: "dejar_estudios",
                label: "Dejar los estudios y buscar trabajo",
                description: "Un salario temprano y menos formación reglada. La calle también enseña.",
                outcomes: {
                    success: {
                        narrative:
                            "Cambiaste el aula por un turno. Ganaste tu primer dinero real y perdiste algunas tardes que no volverán.",
                        stats: { knowledge: -2, happiness: 2, relationships: 2 },
                        employment: "employed",
                        occupation: "Aprendiz en un oficio",
                        sector: "Servicios",
                        contractQuality: 38,
                        milestone: "Tu primer sueldo",
                    },
                },
            },
        ],
    },
    {
        id: "adolescencia_social",
        title: "El grupo correcto",
        description:
            "Las amistades del barrio empiezan a pesar más que las normas de casa. Hay tres formas de pasar el verano.",
        category: "relaciones",
        priority: "major",
        minAge: 13,
        maxAge: 18,
        once: true,
        options: [
            {
                id: "deporte_equipo",
                label: "Entrar en un equipo",
                description: "Entrenar, competir y pertenecer a un grupo con un objetivo común.",
                cost: { shareOfGdp: 0.02 },
                outcomes: {
                    success: {
                        narrative:
                            "El equipo te dio un sitio. Aprendiste a discutir y a reconciliarte en el mismo vestuario.",
                        stats: { health: 5, relationships: 6, happiness: 4, knowledge: 1 },
                    },
                },
            },
            {
                id: "pandilla",
                label: "Salir con la pandilla",
                description: "Plazas, noches largas y amistades intensas. Algunas decisiones serán difíciles de explicar.",
                check: { type: "social", base: 55 },
                outcomes: {
                    success: {
                        narrative:
                            "Ese verano tuvo una banda sonora. Conociste a gente que te aceptó sin preguntas y aprendiste a cuidar de ellos.",
                        stats: { relationships: 8, happiness: 6, health: -1 },
                        milestone: "Una amistad que duró décadas",
                    },
                    failure: {
                        narrative:
                            "El grupo se rompió por una discusión que nadie recuerda bien. Te quedaste con la sensación de haber mostrado demasiado.",
                        stats: { relationships: 2, happiness: -4 },
                    },
                },
            },
            {
                id: "voluntariado_joven",
                label: "Voluntariado",
                description: "Ayudar en una biblioteca, un refugio o una asociación del barrio.",
                outcomes: {
                    success: {
                        narrative:
                            "Descubriste que podías ser útil. Las personas con las que trabajaste te trataron como a un igual.",
                        stats: { relationships: 5, knowledge: 3, happiness: 4 },
                        milestone: "Primer voluntariado",
                    },
                },
            },
        ],
    },
    {
        id: "adolescencia_salud_mental",
        title: "Un ruido que no se apaga",
        description:
            "Últimamente duermes mal y todo te irrita. Podrías hablarlo, moverte un poco o esperar a que pase.",
        category: "salud",
        priority: "major",
        minAge: 13,
        maxAge: 19,
        once: true,
        options: [
            {
                id: "pedir_ayuda",
                label: "Pedir ayuda",
                description: "Hablar con un profesional o con un adulto de confianza. Cuesta dinero y orgullo.",
                cost: { shareOfGdp: 0.02 },
                check: { type: "social", base: 65 },
                outcomes: {
                    success: {
                        narrative:
                            "Ponerle palabras al ruido lo hizo más pequeño. No desapareció, pero dejaste de cargarlo a solas.",
                        stats: { health: 4, happiness: 8, relationships: 3 },
                        milestone: "Aprender a pedir ayuda",
                    },
                    failure: {
                        narrative:
                            "La primera conversación no fue la que necesitabas. Aun así, descubriste que podías intentarlo otra vez.",
                        stats: { happiness: 2, relationships: 1 },
                    },
                },
            },
            {
                id: "deporte_mental",
                label: "Moverse y dormir mejor",
                description: "Salir a correr, ordenar el sueño y reducir las pantallas de noche.",
                outcomes: {
                    success: {
                        narrative:
                            "No era una cura, pero el cuerpo empezó a pedir otras horas. Las mañanas dejaron de doler tanto.",
                        stats: { health: 5, happiness: 4, knowledge: 1 },
                    },
                },
            },
            {
                id: "ocultarlo",
                label: "Esperar a que pase",
                description: "No contar nada y seguir. Quizá sea una etapa.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a funcionar con el ruido de fondo. Nadie lo notó, y eso a veces también pesaba.",
                        stats: { happiness: -6, health: -3, relationships: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "primer_trabajo",
        title: "El primer trabajo",
        description:
            "Tienes dieciséis años y una oferta para trabajar unas horas después de clase. También podría ser un voluntariado o seguir solo con los estudios.",
        category: "trabajo",
        priority: "major",
        minAge: 16,
        maxAge: 20,
        once: true,
        requirements: { employment: ["student", "child", "unemployed"] },
        options: [
            {
                id: "media_jornada",
                label: "Aceptar media jornada",
                description: "Un sueldo pequeño, experiencia real y menos tiempo libre.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a fichar, a contar hasta diez y a volver a casa con las manos sucias. El primer sueldo lo recuerdas entero.",
                        stats: { knowledge: 1, health: -1, happiness: 2, relationships: 2 },
                        employment: "employed",
                        occupation: "Dependiente a media jornada",
                        sector: "Comercio",
                        contractQuality: 45,
                        milestone: "Primer contrato",
                    },
                },
            },
            {
                id: "voluntariado_trabajo",
                label: "Voluntariado y estudios",
                description: "Sin sueldo, pero con experiencia y contactos.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a trabajar con gente muy distinta sin cobrar. Algunas de esas personas te recomendaron años después.",
                        stats: { knowledge: 3, relationships: 5, happiness: 2 },
                        milestone: "Primera experiencia profesional",
                    },
                },
            },
            {
                id: "solo_estudiar",
                label: "Concentrarte en estudiar",
                description: "Sin ingresos propios, pero con más tiempo para el instituto.",
                outcomes: {
                    success: {
                        narrative:
                            "Tu habitación se llenó de apuntes. No tenías dinero propio, pero llegaste a los exámenes con las ideas ordenadas.",
                        stats: { knowledge: 4, happiness: 1, relationships: -1 },
                    },
                },
            },
        ],
    },
    {
        id: "post_secundaria",
        title: "Después del instituto",
        description:
            "El último curso termina y hay que elegir. La universidad, una formación profesional o un empleo inmediato cambiarán tu economía y tu tiempo.",
        category: "educacion",
        priority: "major",
        minAge: 17,
        maxAge: 21,
        once: true,
        requirements: { maxEducation: "secondary" },
        options: [
            {
                id: "universidad",
                label: "Estudiar en la universidad",
                description: "Cuatro años de estudio y una deuda o un gran esfuerzo familiar.",
                cost: { shareOfGdp: 0.22, shareOfAnnualIncome: 0.1 },
                check: { type: "educacion", base: 66 },
                outcomes: {
                    success: {
                        narrative:
                            "La biblioteca se convirtió en tu segunda casa. No fue fácil pagar cada curso, pero aprendiste a pensar con más paciencia.",
                        stats: { knowledge: 12, happiness: 2, relationships: 2, health: -1 },
                        education: "university",
                        employment: "student",
                        milestone: "Entrar en la universidad",
                        schedule: [
                            {
                                inYears: 4,
                                narrative:
                                    "Terminaste la carrera. El título abrió puertas que antes ni veías, aunque no todas estaban donde esperabas.",
                                incomeModifierDelta: 0.24,
                                education: "university",
                                milestone: "Graduación universitaria",
                            },
                        ],
                    },
                    failure: {
                        narrative:
                            "El primer año se te hizo cuesta arriba. Cambiaste de rumbo con la sensación de haber dejado algo a medias.",
                        stats: { knowledge: 4, happiness: -5 },
                        education: "secondary",
                        employment: "unemployed",
                    },
                },
            },
            {
                id: "fp",
                label: "Formación profesional",
                description: "Dos años de práctica con salida laboral directa.",
                cost: { shareOfGdp: 0.09 },
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste un oficio con las manos y con la cabeza. Al terminar, ya había empresas preguntando por tu promoción.",
                        stats: { knowledge: 7, relationships: 3, happiness: 3, health: 1 },
                        education: "vocational",
                        employment: "unemployed",
                        milestone: "Título de formación profesional",
                        schedule: [
                            {
                                inYears: 2,
                                narrative:
                                    "La formación terminó y encontraste un empleo relacionado con lo que habías practicado.",
                                employment: "employed",
                                incomeModifierDelta: 0.12,
                                milestone: "Primer empleo cualificado",
                            },
                        ],
                    },
                },
            },
            {
                id: "trabajar_ya",
                label: "Entrar al mercado laboral",
                description: "Empezar a ganar dinero cuanto antes y aprender sobre la marcha.",
                check: { type: "trabajo", base: 58 },
                outcomes: {
                    success: {
                        narrative:
                            "Tu primer empleo formal llegó antes que muchos títulos. Aprendiste a negociar horarios y a defender tu tiempo.",
                        stats: { knowledge: 2, relationships: 2, happiness: 2 },
                        employment: "employed",
                        occupation: "Auxiliar administrativo",
                        sector: "Servicios",
                        contractQuality: 55,
                        milestone: "Primer empleo a jornada completa",
                    },
                    failure: {
                        narrative:
                            "Repartiste currículos durante meses. El primer empleo tardó más de lo previsto y la espera desgastó tu confianza.",
                        stats: { happiness: -4, knowledge: 1 },
                        employment: "unemployed",
                    },
                },
            },
        ],
    },
    {
        id: "independencia",
        title: "Irse de casa",
        description:
            "Tienes ingresos o ahorros suficientes para plantearte vivir fuera. La libertad tiene gastos que no aparecen en los anuncios.",
        category: "vivienda",
        priority: "major",
        minAge: 18,
        maxAge: 36,
        once: true,
        options: [
            {
                id: "alquilar_solo",
                label: "Alquilar un piso para ti",
                description: "Privacidad y responsabilidad total. La fianza y el alquiler pesan.",
                cost: { shareOfAnnualIncome: 0.35, shareOfGdp: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "La primera noche hubo demasiado silencio. Al mes ya sabías cuánto costaba cada cosa y lo agradecías de otra manera.",
                        stats: { happiness: 5, relationships: 1, knowledge: 1 },
                        expenseModifierDelta: 0.07,
                        housingDelta: 14,
                        milestone: "Independencia: tu primera casa",
                    },
                },
            },
            {
                id: "compartir_piso",
                label: "Compartir piso",
                description: "Menos gastos y más vida social, con menos intimidad.",
                cost: { shareOfAnnualIncome: 0.18 },
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a negociar la limpieza y a respetar horarios ajenos. Algunos compañeros se volvieron amigos.",
                        stats: { happiness: 3, relationships: 5, knowledge: 1 },
                        expenseModifierDelta: 0.03,
                        housingDelta: 5,
                        milestone: "Tu primer piso compartido",
                    },
                },
            },
            {
                id: "quedarse_familia",
                label: "Seguir en casa de la familia",
                description: "Ahorras dinero, pero la independencia llega más tarde.",
                outcomes: {
                    success: {
                        narrative:
                            "Ahorraste durante un tiempo que otros no tuvieron. También aprendiste a negociar espacios y silencios con quienes te criaron.",
                        stats: { happiness: 1, relationships: 2 },
                        incomeModifierDelta: 0.03,
                    },
                },
            },
        ],
    },
    {
        id: "primer_empleo",
        title: "Buscando un lugar en el mundo laboral",
        description:
            "Terminaste la etapa formativa o llevas meses sin trabajo. Hay tres caminos, y ninguno garantiza estabilidad.",
        category: "trabajo",
        priority: "major",
        minAge: 18,
        maxAge: 34,
        once: true,
        requirements: { employment: ["student", "unemployed"] },
        options: [
            {
                id: "buscar_estable",
                label: "Buscar un empleo estable",
                description: "Preparar el currículum y apostar por un contrato con derechos.",
                check: { type: "trabajo", base: 62 },
                outcomes: {
                    success: {
                        narrative:
                            "Después de varias entrevistas, una empresa decidió apostar por ti. El contrato no era perfecto, pero tenía futuro.",
                        stats: { happiness: 4, knowledge: 2, relationships: 2 },
                        employment: "employed",
                        occupation: "Especialista junior",
                        sector: "Servicios profesionales",
                        contractQuality: 70,
                        milestone: "Contrato estable",
                    },
                    failure: {
                        narrative:
                            "Recibiste más silencios que respuestas. Seguiste formándote mientras la búsqueda se alargaba.",
                        stats: { happiness: -4, knowledge: 2 },
                        employment: "unemployed",
                    },
                },
            },
            {
                id: "empleo_precario",
                label: "Aceptar lo primero que salga",
                description: "Ingresos inmediatos y condiciones frágiles.",
                outcomes: {
                    success: {
                        narrative:
                            "Empezaste pronto, sin manual ni contrato claro. Aprendiste a trabajar en la incertidumbre.",
                        stats: { happiness: 1, health: -1, knowledge: 1 },
                        employment: "employed",
                        occupation: "Ayudante polivalente",
                        sector: "Servicios",
                        contractQuality: 38,
                        incomeModifierDelta: -0.05,
                    },
                },
            },
            {
                id: "autoempleo_joven",
                label: "Montar tu propio negocio",
                description: "Una idea pequeña y un riesgo grande. Hace falta algo de capital.",
                cost: { shareOfAnnualIncome: 0.2, shareOfGdp: 0.1 },
                check: { type: "trabajo", base: 46 },
                outcomes: {
                    success: {
                        narrative:
                            "Tu pequeño negocio encontró clientes antes de lo previsto. Trabajabas más horas que nunca, pero las decisiones eran tuyas.",
                        stats: { happiness: 4, knowledge: 4, health: -2, relationships: 4 },
                        employment: "self-employed",
                        occupation: "Fundador de un pequeño negocio",
                        sector: "Comercio",
                        contractQuality: 62,
                        incomeModifierDelta: 0.1,
                        milestone: "Tu primer negocio",
                    },
                    failure: {
                        narrative:
                            "El negocio cerró antes de cumplir un año. Aprendiste cuánto cuesta cada decisión cuando nadie te cubre la espalda.",
                        stats: { happiness: -6, knowledge: 3 },
                        employment: "unemployed",
                    },
                },
            },
        ],
    },
    {
        id: "consolidar_carrera",
        title: "Un paso profesional",
        description:
            "Llevas tiempo en tu puesto. Podrías pedir más responsabilidad, especializarte o cambiar de aires.",
        category: "trabajo",
        priority: "major",
        minAge: 26,
        maxAge: 52,
        once: true,
        requirements: { employment: ["employed", "self-employed"] },
        options: [
            {
                id: "pedir_ascenso",
                label: "Pedir un ascenso",
                description: "Preparar el caso, negociar y exponerte a un no.",
                check: { type: "trabajo", base: 56 },
                outcomes: {
                    success: {
                        narrative:
                            "La reunión salió mejor de lo que esperabas. Conseguiste un puesto con más margen y más gente mirándote.",
                        stats: { happiness: 4, knowledge: 3, relationships: 2 },
                        incomeModifierDelta: 0.18,
                        contractQuality: 82,
                        milestone: "Tu primer ascenso",
                    },
                    failure: {
                        narrative:
                            "Te dijeron que no era el momento. La respuesta fue educada y el golpe, real.",
                        stats: { happiness: -5 },
                    },
                },
            },
            {
                id: "especializacion",
                label: "Especializarte",
                description: "Un curso intensivo para dejar de ser reemplazable.",
                cost: { shareOfAnnualIncome: 0.14 },
                outcomes: {
                    success: {
                        narrative:
                            "La formación te dio un lenguaje nuevo. Con el tiempo, fuiste la persona a la que consultaban cuando algo no encajaba.",
                        stats: { knowledge: 6, happiness: 2 },
                        incomeModifierDelta: 0.1,
                        milestone: "Especialización profesional",
                    },
                },
            },
            {
                id: "cambiar_sector",
                label: "Cambiar de sector",
                description: "Empezar de nuevo en otra industria, con el sueldo y la seguridad en juego.",
                check: { type: "trabajo", base: 48 },
                outcomes: {
                    success: {
                        narrative:
                            "El cambio fue incómodo y liberador. Descubriste que aprender de cero también era una forma de avanzar.",
                        stats: { knowledge: 5, happiness: 4, relationships: 3 },
                        employment: "employed",
                        occupation: "Profesional en un nuevo sector",
                        sector: "Tecnología",
                        contractQuality: 64,
                        milestone: "Reinventarse profesionalmente",
                    },
                    failure: {
                        narrative:
                            "El nuevo sector no te recibió como esperabas. Volviste a un empleo parecido al anterior, con menos confianza.",
                        stats: { happiness: -5, knowledge: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "formacion_continua",
        title: "Volver a estudiar",
        description:
            "Nunca es tarde para aprender algo nuevo, pero el tiempo y el dinero no son infinitos.",
        category: "educacion",
        priority: "major",
        minAge: 22,
        maxAge: 56,
        once: true,
        requirements: { minEducation: "secondary" },
        options: [
            {
                id: "master",
                label: "Hacer un posgrado",
                description: "Dos años de esfuerzo y una inversión importante.",
                cost: { shareOfAnnualIncome: 0.4, shareOfGdp: 0.12 },
                outcomes: {
                    success: {
                        narrative:
                            "Combinaste trabajo y estudio. El título no lo resolvió todo, pero te abrió conversaciones que antes no existían.",
                        stats: { knowledge: 11, happiness: 3, health: -2 },
                        education: "postgraduate",
                        schedule: [
                            {
                                inYears: 2,
                                narrative: "Terminaste el posgrado y tu perfil profesional ganó peso.",
                                incomeModifierDelta: 0.18,
                                milestone: "Posgrado completado",
                            },
                        ],
                    },
                },
            },
            {
                id: "curso_corto",
                label: "Un curso corto",
                description: "Una habilidad concreta en pocas semanas.",
                cost: { shareOfAnnualIncome: 0.06 },
                outcomes: {
                    success: {
                        narrative:
                            "El curso era pequeño, pero te devolvió la costumbre de aprender. Aplicaste una idea al mes siguiente.",
                        stats: { knowledge: 4, happiness: 1 },
                        incomeModifierDelta: 0.04,
                    },
                },
            },
            {
                id: "autodidacta",
                label: "Aprender por tu cuenta",
                description: "Bibliotecas, internet y mucha constancia. Sin título, sin coste.",
                outcomes: {
                    success: {
                        narrative:
                            "Construiste tu propio plan de estudios. Nadie te dio un diploma, pero sabías más que ayer.",
                        stats: { knowledge: 5, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "pareja_adulta",
        title: "Abrir la puerta",
        description:
            "Hay alguien con quien compartes más tiempo del habitual. También está la opción de mantener la distancia.",
        category: "relaciones",
        priority: "major",
        minAge: 23,
        maxAge: 46,
        once: true,
        requirements: { hasPartner: false },
        options: [
            {
                id: "iniciar_relacion",
                label: "Intentar una relación",
                description: "Decir lo que sientes y ver qué ocurre.",
                check: { type: "social", base: 62 },
                outcomes: {
                    success: {
                        narrative:
                            "La conversación terminó con una cena improvisada. No sabías adónde iría, pero por primera vez no querías saberlo todo.",
                        stats: { happiness: 7, relationships: 8, health: 1 },
                        setPartner: true,
                        maritalStatus: "dating",
                        milestone: "Una relación importante",
                    },
                    failure: {
                        narrative:
                            "La respuesta fue amable y clara. Tardaste un tiempo en dejar de repasar la conversación.",
                        stats: { happiness: -3, relationships: 1 },
                    },
                },
            },
            {
                id: "citas",
                label: "Abrirte a conocer gente",
                description: "Aplicaciones, cafés y personas nuevas. Cuesta tiempo y algo de dinero.",
                cost: { shareOfGdp: 0.01 },
                check: { type: "social", base: 52 },
                outcomes: {
                    success: {
                        narrative:
                            "Conociste a alguien en un bar ruidoso. La conversación fue mejor que la música.",
                        stats: { happiness: 5, relationships: 6 },
                        setPartner: true,
                        maritalStatus: "dating",
                    },
                    failure: {
                        narrative:
                            "Hubo citas olvidables y mensajes sin respuesta. Aprendiste a distinguir soledad de desesperación.",
                        stats: { happiness: -2, knowledge: 1 },
                    },
                },
            },
            {
                id: "independencia_afectiva",
                label: "Elegir tu propia compañía",
                description: "Priorizar amistades, proyectos y tiempo propio.",
                outcomes: {
                    success: {
                        narrative:
                            "No confundiste estar solo con estar incompleto. Construiste una vida con otros vínculos y espacios que eran tuyos.",
                        stats: { happiness: 3, relationships: 1, knowledge: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "convivencia",
        title: "Compartir un techo",
        description:
            "La relación ha llegado a un punto en el que las llaves importan. ¿Qué paso quieres dar?",
        category: "familia",
        priority: "major",
        minAge: 25,
        maxAge: 55,
        once: true,
        requirements: { hasPartner: true },
        options: [
            {
                id: "mudarse_juntos",
                label: "Mudaros juntos",
                description: "Un piso nuevo, gastos compartidos y menos espacio para esconderse.",
                cost: { shareOfAnnualIncome: 0.22 },
                outcomes: {
                    success: {
                        narrative:
                            "Discutisteis por un armario y por quién lavaba los platos. También descubristeis que la casa podía ser un refugio.",
                        stats: { happiness: 6, relationships: 5 },
                        expenseModifierDelta: 0.08,
                        housingDelta: 8,
                        maritalStatus: "dating",
                        milestone: "Primera convivencia",
                    },
                },
            },
            {
                id: "casarse",
                label: "Casaros",
                description: "Una celebración y un compromiso con papeles. La fiesta cuesta dinero.",
                cost: { shareOfAnnualIncome: 0.5, shareOfGdp: 0.1 },
                outcomes: {
                    success: {
                        narrative:
                            "Hubo una mesa larga y personas de etapas distintas. No todo fue perfecto, pero decidisteis seguir construyendo juntos.",
                        stats: { happiness: 8, relationships: 6 },
                        maritalStatus: "married",
                        milestone: "Matrimonio",
                    },
                },
            },
            {
                id: "seguir_igual",
                label: "Seguir como estáis",
                description: "Sin prisa y sin papeles. La relación se mantiene en sus propios términos.",
                outcomes: {
                    success: {
                        narrative:
                            "Elegisteis no convertir el cariño en una lista de tareas. La relación siguió teniendo sus propios ritmos.",
                        stats: { happiness: 2, relationships: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "hijos_decision",
        title: "La pregunta de los hijos",
        description:
            "La idea de tener hijos aparece con más frecuencia. También aparece el miedo a todo lo que podría cambiar.",
        category: "familia",
        priority: "major",
        minAge: 25,
        maxAge: 44,
        once: true,
        requirements: { hasPartner: true, childrenMax: 2 },
        options: [
            {
                id: "tener_hijo",
                label: "Tener un hijo",
                description: "Una vida nueva, menos tiempo y más gastos durante años.",
                check: { type: "salud", base: 82 },
                outcomes: {
                    success: {
                        narrative:
                            "Nació una persona pequeña que cambió el tamaño de todo. Aprendiste a dormir por turnos y a querer sin condiciones.",
                        stats: { happiness: 7, relationships: 4, health: -2 },
                        childrenDelta: 1,
                        expenseModifierDelta: 0.12,
                        milestone: "Convertirte en madre o padre",
                    },
                    failure: {
                        narrative:
                            "El camino no fue el esperado. Hubo pruebas, esperas y una tristeza que compartisteis de formas distintas.",
                        stats: { happiness: -5, relationships: 2, health: -2 },
                    },
                },
            },
            {
                id: "adoptar",
                label: "Adoptar",
                description: "Un proceso largo y burocrático que cambia una infancia y la tuya.",
                cost: { shareOfAnnualIncome: 0.2 },
                outcomes: {
                    success: {
                        narrative:
                            "La adopción llegó después de montañas de papeles. El primer día en casa no fue una película: fue real, torpe y vuestro.",
                        stats: { happiness: 6, relationships: 5 },
                        childrenDelta: 1,
                        expenseModifierDelta: 0.12,
                        milestone: "Una adopción",
                    },
                },
            },
            {
                id: "no_tener",
                label: "No tener hijos",
                description: "Elegir otros proyectos y cuidar de otras personas de otra forma.",
                outcomes: {
                    success: {
                        narrative:
                            "Defendiste una decisión que no todo el mundo entendía. Tu vida se llenó de otras formas de cuidado y de tiempo.",
                        stats: { happiness: 2, relationships: 1 },
                        incomeModifierDelta: 0.03,
                        milestone: "Elegir un camino propio",
                    },
                },
            },
        ],
    },
    {
        id: "comprar_vivienda",
        title: "Una casa con tu nombre",
        description:
            "Los precios de la vivienda están en todas las conversaciones. Tienes cierta capacidad de ahorro o de endeudarte.",
        category: "vivienda",
        priority: "major",
        minAge: 28,
        maxAge: 55,
        once: true,
        requirements: { minIncome: 1 },
        options: [
            {
                id: "comprar_piso",
                label: "Comprar una vivienda",
                description: "Una hipoteca larga y una vida más estable, si las cuotas caben.",
                cost: { shareOfAnnualIncome: 0.9 },
                outcomes: {
                    success: {
                        narrative:
                            "Firmaste más papeles de los que imaginabas. La casa no era perfecta, pero era un lugar que podías transformar.",
                        stats: { happiness: 4, relationships: 2 },
                        housingDelta: 22,
                        expenseModifierDelta: 0.05,
                        milestone: "Tu primera vivienda",
                    },
                },
            },
            {
                id: "segir_alquilando",
                label: "Seguir alquilando",
                description: "Más flexibilidad y menos deuda. El alquiler subirá o bajará sin avisar.",
                outcomes: {
                    success: {
                        narrative:
                            "Mantuviste la libertad de moverte. A cambio, cada renovación de contrato trajo una conversación incómoda.",
                        stats: { happiness: 1, knowledge: 1 },
                    },
                },
            },
            {
                id: "reformar",
                label: "Mejorar tu casa actual",
                description: "Obra pequeña, menos coste y un espacio que se siente tuyo.",
                cost: { shareOfAnnualIncome: 0.22 },
                outcomes: {
                    success: {
                        narrative:
                            "Pintaste, arreglaste y cambiaste una ventana. La casa no cambió de dueño, pero sí de sensación.",
                        stats: { happiness: 3, health: 1 },
                        housingDelta: 12,
                    },
                },
            },
        ],
    },
    {
        id: "mudanza_ciudad",
        title: "Otra ciudad",
        description:
            "Una oportunidad de trabajo y una vida distinta al otro lado del mapa. También existe la posibilidad de quedarte.",
        category: "migracion",
        priority: "major",
        minAge: 22,
        maxAge: 50,
        once: true,
        options: [
            {
                id: "gran_ciudad",
                label: "Mudarte a una gran ciudad",
                description: "Más salario y más competencia. El alquiler sube.",
                cost: { shareOfAnnualIncome: 0.25 },
                outcomes: {
                    success: {
                        narrative:
                            "La ciudad te recibió con ruido y prisas. Aprendiste a dormir con sirenas y a valorar los parques pequeños.",
                        stats: { happiness: 2, knowledge: 3, relationships: -1 },
                        incomeModifierDelta: 0.12,
                        expenseModifierDelta: 0.08,
                        housingDelta: -4,
                        milestone: "Mudanza a una gran ciudad",
                    },
                },
            },
            {
                id: "ciudad_media",
                label: "Mudarte a una ciudad media",
                description: "Menos ruido y un equilibrio más amable.",
                cost: { shareOfAnnualIncome: 0.12 },
                outcomes: {
                    success: {
                        narrative:
                            "Encontraste una ciudad donde podías llegar andando a casi todo. La vida se volvió más lenta sin dejar de avanzar.",
                        stats: { happiness: 4, health: 2, relationships: 2 },
                        expenseModifierDelta: -0.03,
                        housingDelta: 6,
                    },
                },
            },
            {
                id: "quedarte",
                label: "Quedarte donde estás",
                description: "Mantener tu red de apoyo y tu rutina.",
                outcomes: {
                    success: {
                        narrative:
                            "Decidiste que lo que ya tenías valía más que la promesa de otra parte. La rutina también puede ser una elección.",
                        stats: { happiness: 2, relationships: 3 },
                    },
                },
            },
        ],
    },
    {
        id: "emigrar",
        title: "Un billete de ida",
        description:
            "Hay una oferta fuera del país. Emigrar puede mejorar tus ingresos, pero también romper redes que tardaste años en construir.",
        category: "migracion",
        priority: "major",
        minAge: 22,
        maxAge: 45,
        once: true,
        options: [
            {
                id: "emigrar_destino",
                label: "Emigrar a un país de ingresos altos",
                description: "Un salario mayor y una vida desde cero. Necesitas ahorros y valentía.",
                cost: { shareOfAnnualIncome: 0.35, shareOfGdp: 0.12 },
                check: { type: "trabajo", base: 54 },
                outcomes: {
                    success: {
                        narrative:
                            "Tu primer invierno lejos de casa fue duro. También aprendiste a pedir direcciones en otro idioma y a construir una rutina nueva.",
                        stats: { happiness: 3, knowledge: 5, relationships: -3, health: -1 },
                        incomeModifierDelta: 0.3,
                        expenseModifierDelta: 0.12,
                        migrateTo: { countryCode: "USA", location: "Nueva York" },
                        milestone: "Emigrar y empezar de nuevo",
                    },
                    failure: {
                        narrative:
                            "El contrato no era lo que prometía. Volviste con menos dinero y una historia que no sabías cómo contar.",
                        stats: { happiness: -6, knowledge: 2 },
                    },
                },
            },
            {
                id: "emigrar_europa",
                label: "Probar suerte en Europa",
                description: "Un destino con buena sanidad y un mercado laboral exigente.",
                cost: { shareOfAnnualIncome: 0.22, shareOfGdp: 0.08 },
                check: { type: "trabajo", base: 52 },
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a moverte entre idiomas y papeles. La vida era más ordenada y, a veces, más solitaria.",
                        stats: { happiness: 2, knowledge: 4, relationships: -2 },
                        incomeModifierDelta: 0.18,
                        expenseModifierDelta: 0.08,
                        migrateTo: { countryCode: "DEU", location: "Berlín" },
                        milestone: "Vivir en el extranjero",
                    },
                    failure: {
                        narrative:
                            "Los ahorros se agotaron antes que las oportunidades. Regresaste con la sensación de haber dejado algo pendiente.",
                        stats: { happiness: -5, knowledge: 2 },
                    },
                },
            },
            {
                id: "quedarte_pais",
                label: "Quedarte",
                description: "Apostar por tu país y por la red que ya conoces.",
                outcomes: {
                    success: {
                        narrative:
                            "Elegiste seguir cerca de los tuyos. A veces imaginas otra vida, pero no cambiaste la que estabas construyendo.",
                        stats: { relationships: 4, happiness: 2 },
                        milestone: "Echar raíces",
                    },
                },
            },
        ],
    },
    {
        id: "seguro_salud",
        title: "Cubrirse las espaldas",
        description:
            "El sistema sanitario de tu país tiene huecos. Puedes contratar un seguro, usar lo público o confiar en la suerte.",
        category: "salud",
        priority: "major",
        minAge: 20,
        maxAge: 64,
        once: true,
        options: [
            {
                id: "premium",
                label: "Contratar un seguro premium",
                description: "Menos esperas y más acceso. La prima mensual se nota.",
                cost: { shareOfAnnualIncome: 0.05 },
                outcomes: {
                    success: {
                        narrative:
                            "La prima pesaba en el presupuesto, pero cuando llegó la primera urgencia, la respuesta fue rápida.",
                        stats: { health: 3, happiness: 1 },
                        healthPlan: "premium",
                        milestone: "Cobertura sanitaria privada",
                    },
                },
            },
            {
                id: "publico",
                label: "Usar el sistema público",
                description: "Cobertura básica, listas de espera y menos gasto directo.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a pedir cita con paciencia. El sistema tenía grietas, pero también personas que sostenían lo público.",
                        stats: { happiness: 1, health: 1 },
                        healthPlan: "basico",
                    },
                },
            },
            {
                id: "sin_seguro",
                label: "Vivir sin seguro",
                description: "Ahorras la prima y asumes el riesgo.",
                outcomes: {
                    success: {
                        narrative:
                            "Durante años no necesitaste nada grave. Cada resfriado era una pequeña lotería que preferías no mirar.",
                        stats: { happiness: 1, health: -2 },
                        healthPlan: "ninguno",
                    },
                },
            },
        ],
    },
    {
        id: "deuda_adulta",
        title: "Pedir prestado",
        description:
            "Una inversión o un imprevisto te obliga a mirar el crédito. La deuda puede ser una herramienta o una trampa.",
        category: "dinero",
        priority: "major",
        minAge: 22,
        maxAge: 56,
        once: true,
        options: [
            {
                id: "prestamo_formacion",
                label: "Financiar formación con un préstamo",
                description: "Inviertes en tu futuro y pagas intereses durante años.",
                outcomes: {
                    success: {
                        narrative:
                            "Firmaste un préstamo pensando en el largo plazo. La formación llegó, y con ella una cuota mensual que no desaparecía.",
                        stats: { knowledge: 4, happiness: 1 },
                        debtDelta: 900,
                        incomeModifierDelta: 0.06,
                    },
                },
            },
            {
                id: "sin_deuda",
                label: "No endeudarte",
                description: "Adaptas tus planes a lo que puedes pagar hoy.",
                outcomes: {
                    success: {
                        narrative:
                            "Renunciaste a algo para no firmar papeles que te quitaran el sueño. No fue glamuroso, pero dormiste mejor.",
                        stats: { happiness: 1, knowledge: 1 },
                        expenseModifierDelta: -0.02,
                    },
                },
            },
            {
                id: "renegociar",
                label: "Renegociar las deudas existentes",
                description: "Llamar al banco y buscar una cuota más manejable.",
                check: { type: "trabajo", base: 58 },
                outcomes: {
                    success: {
                        narrative:
                            "Alargaste el calendario y respiraste. La deuda seguía ahí, pero dejó de ocupar todo el espacio.",
                        stats: { happiness: 3 },
                        debtDelta: -250,
                        expenseModifierDelta: -0.02,
                    },
                    failure: {
                        narrative:
                            "El banco no movió sus condiciones. Colgaste el teléfono con la sensación de estar hablando con una pared.",
                        stats: { happiness: -3 },
                    },
                },
            },
        ],
    },
    {
        id: "salud_adulta",
        title: "El cuerpo también trabaja",
        description:
            "Las horas de oficina, el estrés y el sofá empiezan a notarse. Hay que decidir cuánto tiempo y dinero dedicas a cuidarte.",
        category: "salud",
        priority: "major",
        minAge: 26,
        maxAge: 60,
        once: true,
        options: [
            {
                id: "chequeo_anual",
                label: "Chequeo anual",
                description: "Analíticas y revisión. Detecta problemas antes de que duelan.",
                cost: { shareOfAnnualIncome: 0.02 },
                outcomes: {
                    success: {
                        narrative:
                            "La analítica salió mejor de lo que temías. El médico te dio dos cambios pequeños y tú los tomaste en serio.",
                        stats: { health: 5, happiness: 1 },
                        milestone: "Chequeo preventivo",
                    },
                },
            },
            {
                id: "ejercicio",
                label: "Ejercicio regular",
                description: "Caminar, correr o nadar varias veces por semana. Sin cuotas caras.",
                outcomes: {
                    success: {
                        narrative:
                            "Al principio te dolía todo. Al tercer mes, subir las escaleras dejó de ser una negociación contigo mismo.",
                        stats: { health: 5, happiness: 2, relationships: 1 },
                    },
                },
            },
            {
                id: "ignorar_sintomas",
                label: "Seguir como hasta ahora",
                description: "Ya irás al médico cuando sea necesario.",
                outcomes: {
                    success: {
                        narrative:
                            "Funcionaste con cansancio y café. El cuerpo no protestó todavía, pero empezó a enviar señales pequeñas.",
                        stats: { health: -3, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "amistades_adultas",
        title: "Las amistades cuestan tiempo",
        description:
            "La agenda está llena. Quedan las amistades que sobreviven a las mudanzas y a los cambios de horario.",
        category: "relaciones",
        priority: "major",
        minAge: 27,
        maxAge: 62,
        once: true,
        options: [
            {
                id: "cultivar",
                label: "Cultivar a los tuyos",
                description: "Llamar, quedar y aparecer cuando no es fácil.",
                outcomes: {
                    success: {
                        narrative:
                            "Descubriste que la amistad adulta se sostiene con gestos concretos. Un grupo pequeño se volvió una red de seguridad.",
                        stats: { relationships: 7, happiness: 4, health: 1 },
                        milestone: "Una red de amistades adultas",
                    },
                },
            },
            {
                id: "priorizar_trabajo",
                label: "Priorizar el trabajo",
                description: "Más horas y más logros. Menos cenas que se cancelan.",
                outcomes: {
                    success: {
                        narrative:
                            "Tu carrera avanzó y tu agenda se llenó. Algunas amistades se convirtieron en mensajes anuales.",
                        stats: { relationships: -5, happiness: -1, knowledge: 2 },
                        incomeModifierDelta: 0.06,
                    },
                },
            },
            {
                id: "comunidad",
                label: "Buscar una comunidad",
                description: "Un club, una asociación o un grupo con una afición común.",
                outcomes: {
                    success: {
                        narrative:
                            "Encontraste un grupo donde no tenías que explicar quién eras. Los jueves dejaron de ser una noche cualquiera.",
                        stats: { relationships: 5, happiness: 4, knowledge: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "cuidar_mayores",
        title: "Cuando los papeles cambian",
        description:
            "Tus padres o alguien que te crió necesita ayuda. El cuidado tiene costes emocionales y económicos.",
        category: "familia",
        priority: "major",
        minAge: 34,
        maxAge: 62,
        once: true,
        options: [
            {
                id: "cuidar_casa",
                label: "Cuidar en casa",
                description: "Organizas tu vida alrededor de otra persona.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a dosificar visitas, medicinas y paciencia. Hubo días en los que no sabías quién cuidaba a quién.",
                        stats: { relationships: 6, happiness: -1, health: -1 },
                        expenseModifierDelta: 0.04,
                        milestone: "Cuidar de quien te cuidó",
                    },
                },
            },
            {
                id: "residencia",
                label: "Buscar una residencia",
                description: "Delegar el cuidado profesional y visitar con frecuencia. Tiene un coste alto.",
                cost: { shareOfAnnualIncome: 0.16 },
                outcomes: {
                    success: {
                        narrative:
                            "Elegiste un lugar con personal amable y habitaciones luminosas. La culpa no desapareció, pero aprendiste a compartirla.",
                        stats: { relationships: 2, happiness: -2 },
                    },
                },
            },
            {
                id: "distancia",
                label: "Mantener la distancia",
                description: "Delegar en otros familiares y seguir con tu vida.",
                outcomes: {
                    success: {
                        narrative:
                            "La distancia fue una decisión y también una herida. Algunas llamadas se hicieron más largas y otras nunca llegaron.",
                        stats: { relationships: -4, happiness: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "crisis_media_vida",
        title: "La mitad del camino",
        description:
            "Tienes cuarenta y tantos. Lo que funcionaba antes empieza a no bastar. ¿Reinventarse, sostener o soltar?",
        category: "trabajo",
        priority: "major",
        minAge: 40,
        maxAge: 56,
        once: true,
        options: [
            {
                id: "reinventarse",
                label: "Reinventarte profesionalmente",
                description: "Formarte y cambiar de rumbo. Hay un coste y un riesgo.",
                cost: { shareOfAnnualIncome: 0.2 },
                check: { type: "trabajo", base: 52 },
                outcomes: {
                    success: {
                        narrative:
                            "Volviste a ser principiante y descubriste que no te importaba. La experiencia se convirtió en una ventaja inesperada.",
                        stats: { happiness: 5, knowledge: 5, health: -1 },
                        incomeModifierDelta: 0.12,
                        milestone: "Reinvención a los cuarenta",
                    },
                    failure: {
                        narrative:
                            "El cambio no salió como esperabas. Aprendiste que no toda crisis pide una revolución.",
                        stats: { happiness: -4, knowledge: 2 },
                    },
                },
            },
            {
                id: "sostener",
                label: "Sostener lo construido",
                description: "Mantener el rumbo y proteger lo que funciona.",
                outcomes: {
                    success: {
                        narrative:
                            "No cambiaste de vida. Cambiaste la forma de mirarla y encontraste valor en la continuidad.",
                        stats: { happiness: 2, relationships: 2, knowledge: 1 },
                    },
                },
            },
            {
                id: "priorizar_familia",
                label: "Poner a la familia primero",
                description: "Reducir ambición profesional y ganar tiempo compartido.",
                outcomes: {
                    success: {
                        narrative:
                            "Bajaste el ritmo y empezaste a estar en las cenas. Algunas oportunidades se cerraron; otras aparecieron en casa.",
                        stats: { relationships: 7, happiness: 4 },
                        incomeModifierDelta: -0.05,
                    },
                },
            },
        ],
    },
    {
        id: "plan_pensiones",
        title: "El futuro tiene un precio",
        description:
            "La jubilación está lejos, pero cada año sin ahorrar la acerca con menos margen.",
        category: "dinero",
        priority: "major",
        minAge: 35,
        maxAge: 62,
        once: true,
        options: [
            {
                id: "plan_privado",
                label: "Aportar a un plan de pensiones",
                description: "Ahorro a largo plazo con menos liquidez.",
                cost: { shareOfAnnualIncome: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "Cada aportación parecía pequeña. Con los años, el hábito se convirtió en una colchón que no esperabas.",
                        stats: { happiness: 1, knowledge: 1 },
                        schedule: [
                            {
                                inYears: 20,
                                narrative: "El plan de pensiones llegó a la jubilación con un capital útil.",
                                moneyDelta: 6500,
                                milestone: "Ahorro para la jubilación",
                            },
                        ],
                    },
                },
            },
            {
                id: "ahorro_basico",
                label: "Ahorrar de forma sencilla",
                description: "Una cuenta separada y una transferencia mensual.",
                cost: { shareOfAnnualIncome: 0.03 },
                outcomes: {
                    success: {
                        narrative:
                            "No tenías un plan sofisticado. Tenías constancia, y eso fue suficiente para no llegar con las manos vacías.",
                        stats: { knowledge: 2, happiness: 1 },
                        schedule: [
                            {
                                inYears: 18,
                                narrative: "Tus ahorros dieron algo de aire al llegar la jubilación.",
                                moneyDelta: 2500,
                            },
                        ],
                    },
                },
            },
            {
                id: "vivir_presente",
                label: "Vivir el presente",
                description: "Confiar en la pensión pública y disfrutar ahora.",
                outcomes: {
                    success: {
                        narrative:
                            "Elegiste no sacrificar el presente por un futuro incierto. Disfrutaste de viajes y cenas que todavía recuerdas.",
                        stats: { happiness: 5, health: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "educacion_hijos",
        title: "La escuela de los tuyos",
        description:
            "Tu hijo o hija empieza una etapa escolar. La educación no solo cuesta dinero: también tiempo y decisiones.",
        category: "familia",
        priority: "major",
        minAge: 32,
        maxAge: 56,
        once: true,
        requirements: { childrenMin: 1 },
        options: [
            {
                id: "colegio_privado",
                label: "Pagar un colegio privado",
                description: "Más recursos y una cuota mensual durante años.",
                cost: { shareOfAnnualIncome: 0.16 },
                outcomes: {
                    success: {
                        narrative:
                            "El colegio tenía más actividades y menos alumnos por aula. El esfuerzo económico se notó en cada recibo.",
                        stats: { happiness: 3, relationships: 3, knowledge: 1 },
                        milestone: "Educación con más recursos",
                    },
                },
            },
            {
                id: "tiempo_hijos",
                label: "Acompañar con tiempo",
                description: "Deberes, lecturas y conversaciones. Sin dinero extra, con presencia.",
                outcomes: {
                    success: {
                        narrative:
                            "Te sentaste muchas tardes al lado de un cuaderno. A veces era agotador; también fue una de las etapas que más recuerdas.",
                        stats: { relationships: 7, happiness: 5, health: -1 },
                        milestone: "Acompañar la educación",
                    },
                },
            },
            {
                id: "delegar",
                label: "Delegar en la escuela",
                description: "Confiar en el sistema y reservar tu energía para trabajar.",
                outcomes: {
                    success: {
                        narrative:
                            "La escuela hizo su parte y tú la tuya. Estuviste menos presente, pero nunca faltó lo esencial.",
                        stats: { relationships: -2, happiness: 1, knowledge: 1 },
                        incomeModifierDelta: 0.04,
                    },
                },
            },
        ],
    },
    {
        id: "salud_40",
        title: "Una señal en el cuerpo",
        description:
            "Un dolor que no se va y una analítica pendiente. Puedes actuar ahora o esperar a que el cuerpo grite.",
        category: "salud",
        priority: "major",
        minAge: 40,
        maxAge: 65,
        once: true,
        options: [
            {
                id: "revision_profunda",
                label: "Hacerte una revisión completa",
                description: "Pruebas, especialistas y tiempo. Puede detectar algo importante.",
                cost: { shareOfAnnualIncome: 0.04 },
                outcomes: {
                    success: {
                        narrative:
                            "La revisión encontró un problema que aún podía tratarse. Saliste asustado y agradecido a partes iguales.",
                        stats: { health: 7, happiness: -1 },
                        milestone: "Diagnóstico a tiempo",
                    },
                },
            },
            {
                id: "cambiar_habitos",
                label: "Cambiar hábitos",
                description: "Dormir, moverse y comer mejor sin pasar por consulta.",
                outcomes: {
                    success: {
                        narrative:
                            "No sabías si era suficiente, pero te sentías mejor. El cambio fue lento y real.",
                        stats: { health: 4, happiness: 2 },
                    },
                },
            },
            {
                id: "posponer",
                label: "Posponerlo",
                description: "Tienes trabajo y otras prioridades. El dolor puede esperar.",
                outcomes: {
                    success: {
                        narrative:
                            "El dolor se convirtió en un ruido de fondo. Aprendiste a organizar el día alrededor de él.",
                        stats: { health: -5, happiness: -1 },
                        chronicCondition: "Dolor crónico no diagnosticado",
                    },
                },
            },
        ],
    },
    {
        id: "cambio_40",
        title: "Otra forma de trabajar",
        description:
            "Tienes experiencia y menos paciencia para ciertas cosas. ¿Qué haces con los años que te quedan de vida laboral?",
        category: "trabajo",
        priority: "major",
        minAge: 42,
        maxAge: 58,
        once: true,
        requirements: { employment: ["employed", "self-employed"] },
        options: [
            {
                id: "emprender_40",
                label: "Emprender",
                description: "Usar tu experiencia para construir algo propio. Requiere capital y aguante.",
                cost: { shareOfAnnualIncome: 0.35 },
                check: { type: "trabajo", base: 50 },
                outcomes: {
                    success: {
                        narrative:
                            "Tu negocio creció más despacio de lo que querías y más de lo que temías. Por primera vez en años, el lunes no pesaba igual.",
                        stats: { happiness: 5, knowledge: 4, health: -2 },
                        employment: "self-employed",
                        occupation: "Fundador de una empresa pequeña",
                        sector: "Servicios",
                        contractQuality: 70,
                        incomeModifierDelta: 0.15,
                        milestone: "Emprender después de los cuarenta",
                    },
                    failure: {
                        narrative:
                            "La empresa no llegó a despegar. Perdiste dinero y parte de la confianza, pero no las ganas de intentarlo.",
                        stats: { happiness: -6, knowledge: 3 },
                    },
                },
            },
            {
                id: "quedarse",
                label: "Quedarte en tu puesto",
                description: "Seguridad y rutina. Menos sorpresas y menos crecimiento.",
                outcomes: {
                    success: {
                        narrative:
                            "Elegiste la estabilidad. No fue una rendición: fue una forma de proteger lo que ya tenías.",
                        stats: { happiness: 1, relationships: 2 },
                    },
                },
            },
            {
                id: "reducir_jornada",
                label: "Reducir la jornada",
                description: "Menos sueldo y más vida. Recuperas tardes que llevabas años cediendo.",
                outcomes: {
                    success: {
                        narrative:
                            "Los viernes se convirtieron en un día para ti. El sueldo bajó y la sensación de tener tiempo, no.",
                        stats: { happiness: 7, health: 3, relationships: 4 },
                        incomeModifierDelta: -0.16,
                    },
                },
            },
        ],
    },
    {
        id: "jubilacion_decision",
        title: "Dejar de trabajar",
        description:
            "La edad de jubilación está cerca. Puedes retirarte ya, alargar la vida laboral o buscar una transición.",
        category: "trabajo",
        priority: "major",
        minAge: 63,
        maxAge: 76,
        once: true,
        requirements: { employment: ["employed", "self-employed", "unemployed"] },
        options: [
            {
                id: "jubilarse",
                label: "Jubilarte",
                description: "Dejar el trabajo y empezar a vivir de la pensión y los ahorros.",
                outcomes: {
                    success: {
                        narrative:
                            "El último día te llevaste una caja con cosas que no sabías que guardabas. La primera semana de silencio fue extraña y necesaria.",
                        stats: { happiness: 6, health: 2, relationships: 3 },
                        employment: "retired",
                        incomeModifierDelta: -0.25,
                        milestone: "Jubilación",
                    },
                },
            },
            {
                id: "semi_jubilacion",
                label: "Semi-jubilación",
                description: "Trabajar menos horas y cobrar menos. Una transición más suave.",
                outcomes: {
                    success: {
                        narrative:
                            "Redujiste la jornada y descubriste que todavía disfrutabas enseñando lo que sabías. El tiempo libre se volvió más valioso.",
                        stats: { happiness: 4, health: 1, relationships: 3 },
                        employment: "retired",
                        incomeModifierDelta: -0.12,
                        milestone: "Transición a la jubilación",
                    },
                },
            },
            {
                id: "seguir_trabajando",
                label: "Seguir trabajando",
                description: "Más ingresos y estructura, menos descanso.",
                outcomes: {
                    success: {
                        narrative:
                            "Seguiste levantándote temprano. La rutina te sostuvo y también te impidió escuchar el cansancio.",
                        stats: { health: -3, happiness: 1, knowledge: 1 },
                        incomeModifierDelta: 0.04,
                    },
                },
            },
        ],
    },
    {
        id: "vida_vejez",
        title: "Tiempo por delante",
        description:
            "La jubilación ha cambiado las horas. ¿Qué haces con un tiempo que por fin es tuyo?",
        category: "ocio",
        priority: "major",
        minAge: 66,
        maxAge: 95,
        once: true,
        options: [
            {
                id: "voluntariado_mayor",
                label: "Hacer voluntariado",
                description: "Ayudar en una asociación, una biblioteca o un banco de alimentos.",
                outcomes: {
                    success: {
                        narrative:
                            "Volviste a tener gente que contaba contigo. Los miércoles se llenaron de nombres y de tareas pequeñas.",
                        stats: { relationships: 6, happiness: 6, health: 1 },
                        milestone: "Voluntariado en la vejez",
                    },
                },
            },
            {
                id: "viajar",
                label: "Viajar",
                description: "Gastar parte de los ahorros en ver otros lugares.",
                cost: { shareOfAnnualIncome: 0.2 },
                outcomes: {
                    success: {
                        narrative:
                            "Viajaste con menos equipaje y más paciencia. Las fotos no capturaron el viento de una tarde que recuerdas entera.",
                        stats: { happiness: 8, knowledge: 4, health: -1 },
                        milestone: "Un viaje que recordarás",
                    },
                },
            },
            {
                id: "rutina_tranquila",
                label: "Una rutina tranquila",
                description: "Casa, paseos, lectura y familia. Sin grandes aventuras.",
                outcomes: {
                    success: {
                        narrative:
                            "Descubriste el placer de un día sin exigencias. El barrio se volvió un mapa de saludos y pequeñas costumbres.",
                        stats: { happiness: 4, health: 2, relationships: 3 },
                    },
                },
            },
        ],
    },
    {
        id: "salud_vejez",
        title: "El cuerpo pide otra cosa",
        description:
            "La salud ya no es un fondo inagotable. La atención médica y la casa pueden adaptarse, o no.",
        category: "salud",
        priority: "major",
        minAge: 68,
        maxAge: 100,
        once: true,
        options: [
            {
                id: "atencion_premium",
                label: "Reforzar la atención médica",
                description: "Un seguro o un servicio privado con más disponibilidad.",
                cost: { shareOfAnnualIncome: 0.07 },
                outcomes: {
                    success: {
                        narrative:
                            "Tener a alguien al otro lado del teléfono te dio tranquilidad. Las citas llegaban antes y las explicaciones eran más claras.",
                        stats: { health: 5, happiness: 2 },
                        healthPlan: "premium",
                        milestone: "Cuidado médico reforzado",
                    },
                },
            },
            {
                id: "adaptar_casa",
                label: "Adaptar la casa",
                description: "Rampas, barandillas y una ducha sin bordes.",
                cost: { shareOfAnnualIncome: 0.1 },
                outcomes: {
                    success: {
                        narrative:
                            "Una barandilla evitó una caída que podía haberlo cambiado todo. La casa era la misma, pero te trataba mejor.",
                        stats: { health: 4, happiness: 3, relationships: 1 },
                        housingDelta: 8,
                    },
                },
            },
            {
                id: "resignarse",
                label: "Aceptar las limitaciones",
                description: "No hacer cambios y adaptarte a lo que venga.",
                outcomes: {
                    success: {
                        narrative:
                            "Dejaste de pelear con el cuerpo. Aprendiste a pedir ayuda y a hacer las cosas más despacio, aunque no siempre con paciencia.",
                        stats: { health: -4, happiness: -1, relationships: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "vivienda_vejez",
        title: "Dónde envejecer",
        description:
            "La casa se ha vuelto demasiado grande, demasiado empinada o demasiado sola. Hay que decidir dónde vivir los próximos años.",
        category: "vivienda",
        priority: "major",
        minAge: 70,
        maxAge: 98,
        once: true,
        options: [
            {
                id: "residencia_mayores",
                label: "Mudarte a una residencia",
                description: "Cuidados diarios y compañía, con un coste elevado.",
                cost: { shareOfAnnualIncome: 0.35 },
                outcomes: {
                    success: {
                        narrative:
                            "La habitación era pequeña y las comidas tenían horario. También había gente con historias y personal que sabía cuándo acercarse.",
                        stats: { health: 3, happiness: 2, relationships: 3 },
                        housingDelta: -4,
                        milestone: "Una nueva etapa en residencia",
                    },
                },
            },
            {
                id: "vivir_familia",
                label: "Vivir con tu familia",
                description: "Volver a compartir casa con hijos o nietos. Más vínculo y menos intimidad.",
                outcomes: {
                    success: {
                        narrative:
                            "La casa se llenó de ruido y de objetos ajenos. Aprendiste a convivir con horarios distintos y a recibir cuidado sin sentirte una carga.",
                        stats: { happiness: 6, relationships: 7, health: 2 },
                        milestone: "Envejecer en familia",
                    },
                },
            },
            {
                id: "adaptar_quedarse",
                label: "Adaptar la casa y quedarte",
                description: "Mantener tu independencia con apoyos puntuales.",
                cost: { shareOfAnnualIncome: 0.09 },
                outcomes: {
                    success: {
                        narrative:
                            "Te quedaste entre tus cosas. Una ayuda semanal y un teléfono siempre encendido hicieron que la soledad no se volviera abandono.",
                        stats: { health: 2, happiness: 5, relationships: 2 },
                        housingDelta: 8,
                    },
                },
            },
        ],
    },
    {
        id: "apoyo_social_vejez",
        title: "No quedarse solo",
        description:
            "Algunas amistades se han ido y los días pueden ser largos. La compañía no aparece sola.",
        category: "relaciones",
        priority: "major",
        minAge: 65,
        maxAge: 102,
        once: true,
        options: [
            {
                id: "grupo_comunitario",
                label: "Unirte a un grupo del barrio",
                description: "Un centro de mayores, un coro o un taller. Gente nueva y rutinas compartidas.",
                outcomes: {
                    success: {
                        narrative:
                            "Al principio te sentías un extraño. A la tercera semana alguien guardó un sitio para ti.",
                        stats: { relationships: 7, happiness: 5, health: 1 },
                        milestone: "Una comunidad en la vejez",
                    },
                },
            },
            {
                id: "familia_cerca",
                label: "Acercarte a la familia",
                description: "Llamar más, visitar y dejar que te visiten.",
                outcomes: {
                    success: {
                        narrative:
                            "Recuperaste conversaciones que habían quedado en pausa. Los nietos aprendieron tu historia y tú la contaste distinta.",
                        stats: { relationships: 6, happiness: 4 },
                    },
                },
            },
            {
                id: "aislarse",
                label: "Cerrar la puerta",
                description: "Preferir la soledad y no molestar a nadie.",
                outcomes: {
                    success: {
                        narrative:
                            "La casa se volvió muy silenciosa. Aprendiste a convivir con el silencio, aunque algunos días pesaba más que otros.",
                        stats: { relationships: -7, happiness: -6, health: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "legado",
        title: "Lo que dejas",
        description:
            "Hay una casa, unos ahorros y objetos con historia. También hay personas que quieres y causas que te importan.",
        category: "dinero",
        priority: "major",
        minAge: 72,
        maxAge: 98,
        once: true,
        options: [
            {
                id: "repartir",
                label: "Repartir y ordenar",
                description: "Testamento, conversaciones y decisiones claras. Cuesta una parte del patrimonio.",
                cost: { shareOfAnnualIncome: 0.12 },
                outcomes: {
                    success: {
                        narrative:
                            "Hablaste de dinero y de afectos en la misma mesa. No todos estuvieron de acuerdo, pero nadie se quedó con dudas.",
                        stats: { happiness: 5, relationships: 5 },
                        milestone: "Un legado ordenado",
                    },
                },
            },
            {
                id: "donar",
                label: "Donar a una causa",
                description: "Dejar parte de tus bienes a una organización o a una causa que te importa.",
                cost: { shareOfAnnualIncome: 0.25 },
                outcomes: {
                    success: {
                        narrative:
                            "Firmaste una donación con el nombre de una causa que llevabas años siguiendo. No esperabas ver el resultado, y eso la hacía más honesta.",
                        stats: { happiness: 6, relationships: 2 },
                        milestone: "Una donación significativa",
                    },
                },
            },
            {
                id: "conservar",
                label: "Guardar lo que tienes",
                description: "No resolverlo todavía. Ya habrá tiempo.",
                outcomes: {
                    success: {
                        narrative:
                            "Dejaste los papeles para más adelante. Algunas conversaciones quedaron pendientes, y eso también es una herencia.",
                        stats: { happiness: -1, relationships: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "ultimos_cuidados",
        title: "El horizonte",
        description:
            "A tu edad, las conversaciones importantes ya no se pueden aplazar. ¿Cómo quieres afrontar el tiempo que queda?",
        category: "salud",
        priority: "major",
        minAge: 80,
        maxAge: 106,
        once: true,
        options: [
            {
                id: "cuidados_paliativos",
                label: "Planificar cuidados paliativos",
                description: "Hablar con la familia y con profesionales sobre el final.",
                cost: { shareOfAnnualIncome: 0.06 },
                outcomes: {
                    success: {
                        narrative:
                            "Pusiste por escrito lo que querías y lo hablaste en voz alta. La conversación fue difícil; después, hubo una calma distinta.",
                        stats: { happiness: 5, relationships: 3, health: 1 },
                        milestone: "Decisiones de final de vida",
                    },
                },
            },
            {
                id: "tratamientos",
                label: "Intentar todos los tratamientos",
                description: "Aferrarte a cada opción médica, aunque el coste y el cansancio sean altos.",
                cost: { shareOfAnnualIncome: 0.18 },
                outcomes: {
                    success: {
                        narrative:
                            "Probaste tratamientos que no siempre entendías. Hubo días de esperanza y días en los que solo querías dormir.",
                        stats: { health: 2, happiness: -2, relationships: 1 },
                    },
                },
            },
            {
                id: "viaje_final",
                label: "Un último viaje",
                description: "Gastar una parte importante de los ahorros en hacer algo que siempre postergaste.",
                cost: { shareOfAnnualIncome: 0.3 },
                outcomes: {
                    success: {
                        narrative:
                            "Hiciste el viaje con menos movilidad y más intensidad. Volviste cansado y con la certeza de que había valido la pena.",
                        stats: { happiness: 8, health: -2, relationships: 2 },
                        milestone: "Un último gran viaje",
                    },
                },
            },
        ],
    },
    {
        id: "respuesta_crisis",
        title: "La crisis llama a tu puerta",
        description:
            "Los precios suben y el trabajo se vuelve inseguro. Tienes que responder con los recursos que tienes.",
        category: "dinero",
        priority: "event",
        eventId: "crisis_economica",
        cooldownYears: 10,
        minAge: 18,
        maxAge: 80,
        once: false,
        options: [
            {
                id: "recortar_gastos",
                label: "Recortar gastos",
                description: "Revisar cada recibo y renunciar a lo prescindible.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a distinguir lo que querías de lo que necesitabas. La casa siguió en pie, aunque con menos cosas.",
                        stats: { happiness: -3, knowledge: 1 },
                        expenseModifierDelta: -0.06,
                    },
                },
            },
            {
                id: "endeudarse_crisis",
                label: "Pedir un préstamo para aguantar",
                description: "Cubrir el hueco con deuda y confiar en tiempos mejores.",
                outcomes: {
                    success: {
                        narrative:
                            "El dinero llegó rápido y la tranquilidad también. Los intereses tardaron más en llegar.",
                        stats: { happiness: 2 },
                        debtDelta: 1200,
                        moneyDelta: 1200,
                        expenseModifierDelta: 0.02,
                    },
                },
            },
            {
                id: "buscar_ingreso_extra",
                label: "Buscar un ingreso extra",
                description: "Horas adicionales, un segundo trabajo o un pequeño servicio.",
                check: { type: "trabajo", base: 54 },
                outcomes: {
                    success: {
                        narrative:
                            "Encontraste una forma de sumar ingresos sin romper tu rutina. Dormiste menos y respiraste mejor.",
                        stats: { happiness: 2, health: -2 },
                        incomeModifierDelta: 0.08,
                    },
                    failure: {
                        narrative:
                            "El ingreso extra nunca llegó. Sumaste cansancio a la incertidumbre.",
                        stats: { happiness: -3, health: -1 },
                    },
                },
            },
        ],
    },
    {
        id: "respuesta_epidemia",
        title: "Una epidemia cambia las reglas",
        description:
            "El país se cierra y los hospitales se llenan. La situación es la misma para todos, pero la pregunta cambia según la edad y el lugar que ocupas en tu familia.",
        contextNote:
            "Un niño no decide sobre un empleo ni una nómina. Las opciones se adaptan a lo que realmente está en tus manos a esta edad.",
        category: "salud",
        priority: "event",
        eventId: "epidemia",
        cooldownYears: 14,
        minAge: 6,
        maxAge: 95,
        once: false,
        options: [
            {
                id: "quedarse_en_casa",
                label: "Quedarte en casa y dibujar",
                description: "Las clases se cancelan. Pasas los días entre dibujos, deberes y la ventana.",
                requirements: { minAge: 6, maxAge: 12 },
                outcomes: {
                    success: {
                        narrative:
                            "Convertiste el salón en un refugio. Dibujaste a los que no podías ver y aprendiste a esperar sin entenderlo todo.",
                        stats: { health: 3, happiness: -1, knowledge: 1 },
                    },
                },
            },
            {
                id: "amigos_a_escondidas",
                label: "Ver a tus amigos a escondidas",
                description: "Quedáis en el patio aunque las normas digan que no. La amistad puede pesar más que el miedo.",
                requirements: { minAge: 6, maxAge: 12 },
                check: { type: "social", base: 45 },
                outcomes: {
                    success: {
                        narrative:
                            "Jugasteis como si el mundo no estuviera en pausa. Volviste a casa con barro en los zapatos y una risa que no cabía en la habitación.",
                        stats: { health: -3, happiness: 4, relationships: 4 },
                    },
                    failure: {
                        narrative:
                            "Os descubrieron y hubo una discusión. La tarde terminó antes de tiempo; el susto, mucho después.",
                        stats: { health: -5, happiness: -2, relationships: 1 },
                    },
                },
            },
            {
                id: "recados_vecino",
                label: "Llevar recados a un vecino",
                description: "Alguien mayor no puede salir. Tus padres te dejan ayudarle con la compra.",
                requirements: { minAge: 6, maxAge: 12 },
                outcomes: {
                    success: {
                        narrative:
                            "Llamaste a una puerta y dejaste una bolsa en el suelo. No fue un gesto heroico, pero alguien dejó de estar solo una tarde.",
                        stats: { health: -1, happiness: 2, relationships: 4 },
                        milestone: "Ayudó a un vecino durante una crisis",
                    },
                },
            },
            {
                id: "clases_a_distancia",
                label: "Seguir las clases desde tu habitación",
                description: "Pantallas, tareas y silencios. Estudiar se vuelve más solitario, pero no se detiene.",
                requirements: { minAge: 13, maxAge: 17 },
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a estudiar sin el ruido del aula. Echaste de menos a la gente y descubriste que podías sostener el ritmo.",
                        stats: { knowledge: 3, happiness: -1, relationships: -1 },
                    },
                },
            },
            {
                id: "cuidar_familiar",
                label: "Cuidar a un familiar enfermo",
                description: "En casa alguien necesita ayuda. Tú puedes poner la comida, las medicinas y la compañía.",
                requirements: { minAge: 13, maxAge: 17 },
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste a tomar la temperatura y a callar cuando hacía falta. Nadie te dio un diploma; tu familia supo que estabas.",
                        stats: { health: -2, happiness: -2, relationships: 6 },
                        psychology: { stress: 4, resilience: 2 },
                    },
                },
            },
            {
                id: "salir_con_amigos",
                label: "Salir con tus amigos",
                description: "La adolescencia no espera. Quedáis al aire libre, con la distancia justa y la cabeza en otra parte.",
                requirements: { minAge: 13, maxAge: 17 },
                check: { type: "social", base: 50 },
                outcomes: {
                    success: {
                        narrative:
                            "Durante unas horas todo pareció normal. Volviste a casa con la sensación de que la vida seguía siendo tuya.",
                        stats: { health: -3, happiness: 5, relationships: 4 },
                    },
                    failure: {
                        narrative:
                            "La salida terminó en una discusión con tus padres. El enfado duró más que la tarde y nadie tenía del todo razón.",
                        stats: { health: -5, happiness: -2, relationships: 2 },
                        psychology: { stress: 2 },
                    },
                },
            },
            {
                id: "aislarse",
                label: "Aislarte en casa",
                description: "Reducir contactos al mínimo y proteger tu salud.",
                requirements: { minAge: 18 },
                outcomes: {
                    success: {
                        narrative:
                            "Pasaste semanas mirando el mismo techo. Te mantuviste sano y descubriste cuánto necesitabas a los demás.",
                        stats: { health: 4, relationships: -3, happiness: -1 },
                    },
                },
            },
            {
                id: "seguir_rutina",
                label: "Seguir con tu rutina",
                description: "Mantener el trabajo y la vida social con precauciones.",
                requirements: { minAge: 18 },
                outcomes: {
                    success: {
                        narrative:
                            "No cambiaste tu vida del todo. El miedo estaba ahí, pero también la necesidad de seguir.",
                        stats: { health: -3, happiness: 1, relationships: 1 },
                    },
                },
            },
            {
                id: "cuidar_otros",
                label: "Cuidar de otros",
                description: "Ayudar a vecinos y familiares, aun con riesgo.",
                requirements: { minAge: 18 },
                check: { type: "social", base: 60 },
                outcomes: {
                    success: {
                        narrative:
                            "Hiciste la compra a gente que no podía salir. No fuiste un héroe de titular; fuiste una persona que apareció.",
                        stats: { health: -2, happiness: 4, relationships: 7 },
                        milestone: "Cuidar durante una crisis",
                    },
                    failure: {
                        narrative:
                            "Intentaste ayudar y terminaste agotado. La gratitud ajena no siempre compensó el cansancio.",
                        stats: { health: -4, happiness: -1, relationships: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "oportunidad_curso",
        title: "Una oportunidad formativa",
        description:
            "Hay un programa de formación con plazas limitadas. Mejoraría tu perfil, pero exige tiempo y dinero.",
        category: "educacion",
        priority: "event",
        eventId: "oportunidad_educativa",
        cooldownYears: 9,
        minAge: 16,
        maxAge: 70,
        once: false,
        options: [
            {
                id: "matricularse",
                label: "Matricularte",
                description: "Aprovechar la oportunidad y reorganizar tu agenda.",
                cost: { shareOfAnnualIncome: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "El curso te dio una credencial y una red. Aplicaste lo aprendido antes de terminar la última unidad.",
                        stats: { knowledge: 7, happiness: 2 },
                        incomeModifierDelta: 0.06,
                        milestone: "Formación aprovechada",
                    },
                },
            },
            {
                id: "posponer_curso",
                label: "Dejarlo para más adelante",
                description: "No es el momento. Otras responsabilidades pesan más.",
                outcomes: {
                    success: {
                        narrative:
                            "La plaza se ocupó por otra persona. No fue una tragedia, pero durante un tiempo te preguntaste qué habría pasado.",
                        stats: { happiness: -1 },
                    },
                },
            },
            {
                id: "autoestudio",
                label: "Estudiar por tu cuenta",
                description: "Aprovechar los materiales disponibles sin pagar matrícula.",
                outcomes: {
                    success: {
                        narrative:
                            "No tuviste certificado, pero sí conocimientos. Algunas puertas se abrieron por una conversación, no por un papel.",
                        stats: { knowledge: 4, happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "respuesta_despido",
        title: "Sin trabajo",
        description:
            "La empresa ha cerrado tu puesto. El calendario avanza y las facturas no esperan.",
        category: "trabajo",
        priority: "event",
        eventId: "despido_colectivo",
        cooldownYears: 11,
        minAge: 20,
        maxAge: 66,
        once: false,
        options: [
            {
                id: "reorientarse",
                label: "Reorientarte rápido",
                description: "Actualizar el currículum y buscar un puesto similar.",
                check: { type: "trabajo", base: 58 },
                outcomes: {
                    success: {
                        narrative:
                            "Encontraste trabajo en menos tiempo del que temías. El sueldo era parecido y la confianza estaba maltrecha.",
                        stats: { happiness: 3, knowledge: 2 },
                        employment: "employed",
                        occupation: "Profesional reincorporado",
                        sector: "Servicios",
                        contractQuality: 60,
                    },
                    failure: {
                        narrative:
                            "La búsqueda se alargó y los ahorros empezaron a pesar. Aprendiste a pedir ayuda sin sentir que fallabas.",
                        stats: { happiness: -5 },
                        employment: "unemployed",
                    },
                },
            },
            {
                id: "aceptar_precario",
                label: "Aceptar un empleo precario",
                description: "Cobrar algo ya, aunque sea menos y con menos derechos.",
                outcomes: {
                    success: {
                        narrative:
                            "Entraste en un trabajo que no elegiste. Te dio ingresos y una rutina, y también una rabia que tardó en irse.",
                        stats: { happiness: -2, health: -1 },
                        employment: "employed",
                        occupation: "Empleo temporal",
                        sector: "Servicios",
                        contractQuality: 32,
                        incomeModifierDelta: -0.08,
                    },
                },
            },
            {
                id: "emprender_despido",
                label: "Convertirlo en un negocio",
                description: "Usar la indemnización para intentar algo propio.",
                cost: { shareOfAnnualIncome: 0.18 },
                check: { type: "trabajo", base: 44 },
                outcomes: {
                    success: {
                        narrative:
                            "El despido se convirtió en el empujón que no te atrevías a darte. Trabajabas más que antes y decidías más que nunca.",
                        stats: { happiness: 4, knowledge: 3, health: -2 },
                        employment: "self-employed",
                        occupation: "Trabajador por cuenta propia",
                        sector: "Comercio",
                        contractQuality: 55,
                        incomeModifierDelta: 0.05,
                        milestone: "Emprender tras un despido",
                    },
                    failure: {
                        narrative:
                            "El negocio no llegó a sostenerte. Volviste al mercado laboral con menos ahorros y más historias.",
                        stats: { happiness: -5, knowledge: 2 },
                        employment: "unemployed",
                    },
                },
            },
        ],
    },
    {
        id: "respuesta_desastre",
        title: "La fuerza de la naturaleza",
        description:
            "Un desastre ha dañado tu barrio. La reconstrucción será lenta y no todos pueden permitirse esperar.",
        category: "vivienda",
        priority: "event",
        eventId: "desastre_natural",
        cooldownYears: 11,
        minAge: 18,
        maxAge: 95,
        once: false,
        options: [
            {
                id: "reconstruir",
                label: "Reconstruir",
                description: "Reparar lo dañado y quedarte en el lugar.",
                cost: { shareOfAnnualIncome: 0.14 },
                outcomes: {
                    success: {
                        narrative:
                            "Cubriste agujeros y volviste a colgar un cuadro torcido. La casa recuperó su forma y tú recuperaste una rutina.",
                        stats: { happiness: 3, relationships: 3 },
                        housingDelta: 6,
                    },
                },
            },
            {
                id: "mudarse_temporal",
                label: "Mudarte temporalmente",
                description: "Buscar un lugar seguro y esperar a que pase lo peor.",
                cost: { shareOfAnnualIncome: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "Dormiste en una habitación prestada durante meses. La distancia te protegió y también te hizo sentir extranjero en tu propia ciudad.",
                        stats: { happiness: -2, relationships: -1, health: 1 },
                        housingDelta: -5,
                    },
                },
            },
            {
                id: "ayuda_comunitaria",
                label: "Ayudar a la comunidad",
                description: "Sumarte a la reconstrucción colectiva y apoyar a los vecinos.",
                outcomes: {
                    success: {
                        narrative:
                            "Repartiste agua, cargaste escombros y escuchaste historias. La comunidad se volvió una estructura más sólida que muchas paredes.",
                        stats: { health: -2, happiness: 3, relationships: 6 },
                        milestone: "Reconstruir en comunidad",
                    },
                },
            },
        ],
    },
    {
        id: "presupuesto_inflacion",
        title: "La compra cuesta más",
        description:
            "El precio de la comida y la energía no deja de subir. El presupuesto del mes ya no cuadra.",
        category: "dinero",
        priority: "event",
        eventId: "inflacion",
        cooldownYears: 9,
        minAge: 18,
        maxAge: 90,
        once: false,
        options: [
            {
                id: "ajustar_presupuesto",
                label: "Ajustar el presupuesto",
                description: "Cambiar marcas, recortar ocio y planificar cada compra.",
                outcomes: {
                    success: {
                        narrative:
                            "Aprendiste el precio de casi todo. La cesta de la compra se volvió un ejercicio de memoria y de renuncias pequeñas.",
                        stats: { happiness: -2, knowledge: 2 },
                        expenseModifierDelta: -0.04,
                    },
                },
            },
            {
                id: "endeudarse_inflacion",
                label: "Cubrir el hueco con deuda",
                description: "Usar crédito para no cambiar el nivel de vida de golpe.",
                outcomes: {
                    success: {
                        narrative:
                            "La tarjeta sostuvo el mes. También sostuvo una conversación que preferías no tener con tu propio futuro.",
                        stats: { happiness: 1 },
                        debtDelta: 700,
                        moneyDelta: 700,
                        expenseModifierDelta: 0.02,
                    },
                },
            },
            {
                id: "pedir_aumento",
                label: "Pedir un aumento",
                description: "Plantear en el trabajo que el sueldo ya no cubre lo mismo.",
                check: { type: "trabajo", base: 48 },
                outcomes: {
                    success: {
                        narrative:
                            "La conversación fue incómoda y necesaria. Conseguiste un ajuste que no recuperó todo, pero ayudó.",
                        stats: { happiness: 3 },
                        incomeModifierDelta: 0.06,
                    },
                    failure: {
                        narrative:
                            "La empresa dijo que no había margen. Aprendiste que no siempre se puede negociar desde la urgencia.",
                        stats: { happiness: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "crisis_salud",
        title: "Una urgencia médica",
        description:
            "Un diagnóstico inesperado exige decisiones rápidas. El dinero y el acceso sanitario condicionan las opciones.",
        category: "salud",
        priority: "event",
        eventId: "crisis_sanitaria",
        cooldownYears: 11,
        minAge: 30,
        maxAge: 92,
        once: false,
        options: [
            {
                id: "tratamiento_completo",
                label: "Acceder al tratamiento completo",
                description: "Coste alto y mejores probabilidades de recuperación.",
                cost: { shareOfAnnualIncome: 0.22 },
                check: { type: "salud", base: 68 },
                outcomes: {
                    success: {
                        narrative:
                            "El tratamiento fue duro y efectivo. Aprendiste a medir el tiempo en revisiones y a celebrar analíticas limpias.",
                        stats: { health: 8, happiness: 2, relationships: 2 },
                        healthPlan: "premium",
                        milestone: "Superar una crisis de salud",
                    },
                    failure: {
                        narrative:
                            "La recuperación fue parcial. Quedó una secuela que cambiaría tu forma de moverte por el mundo.",
                        stats: { health: 1, happiness: -3 },
                        chronicCondition: "Secuela de una enfermedad grave",
                    },
                },
            },
            {
                id: "tratamiento_publico",
                label: "Usar la sanidad pública",
                description: "Más espera y menos coste directo.",
                outcomes: {
                    success: {
                        narrative:
                            "Esperaste meses y recibiste un tratamiento correcto. La paciencia se volvió parte del proceso.",
                        stats: { health: 5, happiness: 1 },
                    },
                },
            },
            {
                id: "posponer_tratamiento",
                label: "Posponer el tratamiento",
                description: "No puedes asumir el coste ahora. Intentar aguantar.",
                outcomes: {
                    success: {
                        narrative:
                            "Convives con síntomas que van y vienen. Aprendiste a organizar el día alrededor de un cuerpo que ya no responde igual.",
                        stats: { health: -9, happiness: -4 },
                        chronicCondition: "Condición crónica no tratada",
                    },
                },
            },
        ],
    },
    {
        id: "enfoque_anual",
        title: "¿A qué dedicas el año?",
        description:
            "No todos los años traen una gran decisión. Aun así, el tiempo se reparte de alguna manera.",
        category: "ocio",
        priority: "focus",
        minAge: 0,
        maxAge: 106,
        once: false,
        options: [
            {
                id: "aprender",
                label: "Aprender algo nuevo",
                description: "Leer, estudiar o practicar una habilidad.",
                outcomes: {
                    success: {
                        narrative: "Dedicaste horas a entender algo que antes te parecía ajeno.",
                        stats: { knowledge: 3, happiness: -1 },
                    },
                },
            },
            {
                id: "cuerpo",
                label: "Cuidar el cuerpo",
                description: "Dormir mejor, moverte y comer con más atención.",
                outcomes: {
                    success: {
                        narrative: "El cuerpo respondió con más energía y menos ruido.",
                        stats: { health: 3, happiness: 1 },
                    },
                },
            },
            {
                id: "vincular",
                label: "Pasar tiempo con los tuyos",
                description: "Llamadas, visitas y cenas sin prisa.",
                outcomes: {
                    success: {
                        narrative: "Las conversaciones se alargaron y algunos silencios dejaron de incomodar.",
                        stats: { relationships: 4, happiness: 2 },
                    },
                },
            },
            {
                id: "descansar",
                label: "Bajar el ritmo",
                description: "Menos obligaciones y más espacio sin pantallas.",
                outcomes: {
                    success: {
                        narrative: "Aprendiste a no llenar cada hueco. El descanso también fue una forma de avanzar.",
                        stats: { happiness: 4, health: 1, knowledge: -1 },
                    },
                },
            },
        ],
    },
    {
        id: "micro_habito",
        title: "Un pequeño hábito",
        description:
            "No hace falta una revolución. Un gesto repetido durante un año puede cambiar algo.",
        category: "ocio",
        priority: "focus",
        minAge: 12,
        maxAge: 106,
        once: false,
        options: [
            {
                id: "leer_habitual",
                label: "Leer cada día",
                description: "Veinte minutos antes de dormir.",
                outcomes: {
                    success: {
                        narrative: "La lectura se convirtió en un lugar al que volver.",
                        stats: { knowledge: 2, happiness: 1 },
                    },
                },
            },
            {
                id: "caminar",
                label: "Caminar más",
                description: "Bajar una parada antes o salir a andar después de comer.",
                outcomes: {
                    success: {
                        narrative: "Los trayectos cortos se volvieron tiempo para ordenar ideas.",
                        stats: { health: 2, happiness: 1 },
                    },
                },
            },
            {
                id: "escuchar",
                label: "Escuchar mejor",
                description: "Preguntar y no interrumpir. Una conversación a la semana.",
                outcomes: {
                    success: {
                        narrative: "Descubriste cosas que llevaban años delante de ti.",
                        stats: { relationships: 3, happiness: 1 },
                    },
                },
            },
            {
                id: "esfuerzo_extra",
                label: "Trabajar un poco más",
                description: "Horas extra o un proyecto personal. Más ingresos, menos descanso.",
                outcomes: {
                    success: {
                        narrative: "Sumaste horas y resultados. También sumaste cansancio.",
                        stats: { health: -1, happiness: -1, knowledge: 1 },
                        incomeModifierDelta: 0.03,
                    },
                },
            },
        ],
    },
    {
        id: "familia_tiempo",
        title: "La mesa del domingo",
        description:
            "Hay una familia o una red de afectos que espera noticias tuyas. El trabajo también ocupa ese espacio.",
        category: "familia",
        priority: "focus",
        minAge: 25,
        maxAge: 100,
        once: false,
        requirements: { childrenMin: 1 },
        options: [
            {
                id: "tiempo_familia",
                label: "Reservar tiempo",
                description: "Proteger una tarde para los tuyos, aunque cueste.",
                outcomes: {
                    success: {
                        narrative: "La tarde se llenó de conversaciones y de cosas pendientes que no importaban.",
                        stats: { relationships: 3, happiness: 2 },
                    },
                },
            },
            {
                id: "trabajo_familia",
                label: "Priorizar el trabajo",
                description: "Más horas ahora para sostener la casa.",
                outcomes: {
                    success: {
                        narrative: "El sueldo se sostuvo. Algunas cenas se enfriaron esperándote.",
                        stats: { relationships: -2, happiness: -1 },
                        incomeModifierDelta: 0.02,
                    },
                },
            },
            {
                id: "descanso_familia",
                label: "Descansar juntos",
                description: "Un plan sencillo y sin pantallas.",
                outcomes: {
                    success: {
                        narrative: "No hicisteis nada extraordinario. Fue uno de esos días que se recuerdan sin motivo.",
                        stats: { relationships: 2, happiness: 3, health: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "riesgo_pequeno",
        title: "Una apuesta pequeña",
        description:
            "Tienes una cantidad que podrías arriesgar. No cambiaría tu vida si sale mal, pero quizá sí si sale bien.",
        category: "riesgo",
        priority: "focus",
        minAge: 18,
        maxAge: 80,
        once: false,
        options: [
            {
                id: "invertir",
                label: "Probar suerte",
                description: "Invertir una parte modesta de tus ahorros.",
                cost: { shareOfAnnualIncome: 0.04 },
                check: { type: "riesgo", base: 42 },
                outcomes: {
                    success: {
                        narrative: "La apuesta salió mejor de lo esperado. Cobraste, respiraste y no repetiste la misma jugada.",
                        stats: { happiness: 3, knowledge: 1 },
                        moneyDelta: 600,
                    },
                    failure: {
                        narrative: "Perdiste lo invertido. No fue catastrófico, pero escoció.",
                        stats: { happiness: -2, knowledge: 1 },
                    },
                },
            },
            {
                id: "no_arriesgar",
                label: "No arriesgar",
                description: "Guardar el dinero y seguir con el plan.",
                outcomes: {
                    success: {
                        narrative: "Dejaste pasar la oportunidad y conservaste la tranquilidad.",
                        stats: { happiness: 1 },
                        expenseModifierDelta: -0.01,
                    },
                },
            },
            {
                id: "formarse_riesgo",
                label: "Invertir en formación",
                description: "Gastar ese dinero en una habilidad que puedas usar.",
                cost: { shareOfAnnualIncome: 0.03 },
                outcomes: {
                    success: {
                        narrative: "El curso no te hizo rico, pero te dio una herramienta que usaste varias veces.",
                        stats: { knowledge: 3, happiness: 1 },
                        incomeModifierDelta: 0.02,
                    },
                },
            },
        ],
    },
    {
        id: "camino_profesional",
        title: "El camino que quieres construir",
        description: "Tienes dieciocho años y ya no basta con imaginar el futuro. Una formación, un oficio o un primer empleo van a ordenar los próximos años. No todas las puertas están abiertas para todo el mundo.",
        category: "educacion",
        priority: "major",
        minAge: 18,
        maxAge: 21,
        once: true,
        options: [
            {
                id: "camino_medicina",
                label: "Estudiar medicina",
                description: "Una carrera larga, exigente y con un coste real. No todo el mundo puede permitírsela.",
                cost: { shareOfGdp: 0.12 },
                check: { type: "educacion", base: 66 },
                outcomes: {
                    success: {
                        narrative: "Entraste en medicina. Los primeros años fueron una mezcla de vocación, cansancio y libros que nunca terminaban.",
                        stats: { knowledge: 8, happiness: 2 },
                        psychology: { stress: 8, selfEsteem: 5 },
                        education: "university",
                        flags: ["track_medicine"],
                        milestone: "Empezó medicina",
                        schedule: [{ inYears: 6, narrative: "Terminaste medicina y empezaste a ejercer. La responsabilidad de otra vida pesaba distinto que un examen.", education: "postgraduate", employment: "employed", occupation: "Médica/o", occupationId: "doctor", sector: "salud", contractQuality: 76, flags: ["profesion_medica"], milestone: "Primer turno como médica/o", psychology: { selfEsteem: 6, stress: 5 } }],
                    },
                    failure: {
                        narrative: "La nota no alcanzó para medicina. El curso de preparación no garantizó nada y tuviste que pensar en un plan B.",
                        stats: { happiness: -5, knowledge: 2 },
                        psychology: { selfEsteem: -5, stress: 5 },
                        flags: ["track_reintentar"],
                    },
                },
            },
            {
                id: "camino_derecho",
                label: "Estudiar derecho",
                description: "Leyes, turnos y clientes. Una carrera con prestigio y también con presión.",
                cost: { shareOfGdp: 0.09 },
                check: { type: "educacion", base: 62 },
                outcomes: {
                    success: {
                        narrative: "Empezaste derecho. Aprendiste a discutir con precisión y a escuchar lo que no se decía en voz alta.",
                        stats: { knowledge: 7, relationships: 2 },
                        education: "university",
                        flags: ["track_law"],
                        schedule: [{ inYears: 5, narrative: "Terminaste la carrera y conseguiste tu primer caso. Nadie te preparó para la soledad de decidir por otra persona.", employment: "employed", occupation: "Abogada/o", occupationId: "lawyer", sector: "servicios", contractQuality: 68, flags: ["profesion_abogacia"], milestone: "Primer caso propio", psychology: { selfEsteem: 4, stress: 4 } }],
                    },
                    failure: {
                        narrative: "El primer año de derecho te superó. Cambiaste de plan antes de que la deuda creciera más.",
                        stats: { happiness: -4, knowledge: 2 },
                        flags: ["track_reintentar"],
                    },
                },
            },
            {
                id: "camino_tecnologia",
                label: "Formarte en tecnología",
                description: "Programación, datos y proyectos. Un sector con buenos salarios y una exigencia que no siempre se ve desde fuera.",
                cost: { shareOfGdp: 0.05 },
                check: { type: "educacion", base: 64 },
                outcomes: {
                    success: {
                        narrative: "Aprendiste a construir cosas con código. Al principio copiabas ejemplos; después empezaste a entender por qué funcionaban.",
                        stats: { knowledge: 8, happiness: 2 },
                        education: "university",
                        flags: ["track_tech"],
                        schedule: [{ inYears: 4, narrative: "Tu primer proyecto real salió adelante. Descubriste que el trabajo también podía ser un lugar de aprendizaje.", employment: "employed", occupation: "Desarrolladora/or de software", occupationId: "software-developer", sector: "tecnología", contractQuality: 74, flags: ["profesion_tecnologia"], milestone: "Primer proyecto profesional", psychology: { selfEsteem: 5, stress: 3 } }],
                    },
                    failure: {
                        narrative: "El curso era más difícil de lo que parecía. Terminaste con algunas herramientas y muchas preguntas.",
                        stats: { knowledge: 3, happiness: -2 },
                        flags: ["track_reintentar"],
                    },
                },
            },
            {
                id: "camino_musica",
                label: "Formarte en música",
                description: "Clases, ensayos y escenarios pequeños. Ya habías mostrado interés; ahora toca tomarse en serio el oficio.",
                cost: { shareOfGdp: 0.04 },
                check: { type: "social", base: 58 },
                outcomes: {
                    success: {
                        narrative: "La música dejó de ser solo una afición. Aprendiste a ensayar aunque no tuvieras ganas y a escuchar antes de tocar.",
                        stats: { happiness: 6, knowledge: 4, relationships: 3 },
                        education: "vocational",
                        flags: ["track_music"],
                        milestone: "Primera formación musical seria",
                        schedule: [{ inYears: 3, narrative: "Empezaste a dar clases y a tocar en locales pequeños. No era fama, pero era un oficio y una forma de estar en el mundo.", employment: "self-employed", occupation: "Música y enseñanza musical", occupationId: "artist", sector: "cultura", contractQuality: 42, flags: ["profesion_musica"], milestone: "Primer concierto pagado", psychology: { selfEsteem: 4, stress: 2 } }],
                    },
                    failure: {
                        narrative: "Las clases se volvieron una obligación y perdiste parte del placer. Aun así, la música siguió siendo tuya.",
                        stats: { happiness: 2, knowledge: 2 },
                        flags: ["track_music", "musica_aficion"],
                    },
                },
            },
            {
                id: "camino_oficio",
                label: "Aprender un oficio",
                description: "Formación práctica, herramientas y un trabajo que se ve al final del día.",
                cost: { shareOfGdp: 0.03 },
                outcomes: {
                    success: {
                        narrative: "Elegiste aprender con las manos. Un taller, un tutor y errores que costaban dinero pero enseñaban rápido.",
                        stats: { knowledge: 4, health: 1, happiness: 3 },
                        education: "vocational",
                        flags: ["track_trade"],
                        schedule: [{ inYears: 2, narrative: "Terminaste tu aprendizaje y empezaste a cobrar por un trabajo bien hecho.", employment: "employed", occupation: "Técnica/o especialista", occupationId: "mechanic", sector: "servicios", contractQuality: 55, flags: ["profesion_oficio"], milestone: "Primer trabajo cualificado" }],
                    },
                },
            },
            {
                id: "camino_emprender",
                label: "Aprender a vender y emprender",
                description: "No hay título, pero hay un mercado. Aprenderás a tratar con clientes y a asumir riesgos.",
                cost: { shareOfGdp: 0.02 },
                outcomes: {
                    success: {
                        narrative: "Empezaste a vender cosas pequeñas. Aprendiste a mirar a los ojos de un cliente y a escuchar un no sin derrumbarte.",
                        stats: { relationships: 4, knowledge: 3, happiness: 2 },
                        flags: ["track_business"],
                        schedule: [{ inYears: 3, narrative: "Tenías un pequeño negocio y clientes habituales. No eras rico, pero el dinero dependía de tus decisiones.", employment: "self-employed", occupation: "Pequeño negocio propio", occupationId: "shop-owner", sector: "comercio", contractQuality: 48, flags: ["profesion_comercio"], milestone: "Su primer negocio", psychology: { selfEsteem: 4, stress: 4 } }],
                    },
                },
            },
            {
                id: "camino_trabajo",
                label: "Empezar a trabajar ya",
                description: "Un sueldo inmediato y menos formación reglada. No es una rendición: es una forma de sostenerte.",
                outcomes: {
                    success: {
                        narrative: "Empezaste a trabajar sin esperar a tener un título. El primer sueldo te dio una independencia que no sabías cuánto necesitabas.",
                        stats: { happiness: 3, relationships: 2, knowledge: 1 },
                        employment: "employed",
                        occupation: "Empleo de entrada",
                        occupationId: "retail-clerk",
                        sector: "comercio",
                        contractQuality: 42,
                        flags: ["track_work"],
                        milestone: "Primer empleo estable",
                    },
                },
            },
        ],
    },
    {
        id: "profesion_medica_caso",
        title: "Una decisión en el hospital",
        description: "Una paciente llega con síntomas que no encajan del todo. El protocolo dice una cosa; tu intuición, otra. La familia espera fuera.",
        category: "trabajo",
        priority: "major",
        minAge: 26,
        maxAge: 76,
        once: true,
        requirements: { flagsAll: ["profesion_medica"] },
        options: [
            {
                id: "seguir_protocolo",
                label: "Seguir el protocolo y consultar",
                description: "Contrastar con un colega antes de mover ficha.",
                outcomes: {
                    success: {
                        narrative: "La consulta fue acertada. La paciente mejoró y tú aprendiste que pedir ayuda también era parte del oficio.",
                        stats: { knowledge: 2, happiness: 4 },
                        psychology: { selfEsteem: 4 },
                        moneyDelta: 180,
                        milestone: "Un caso resuelto con equipo",
                    },
                },
            },
            {
                id: "intervenir",
                label: "Actuar por tu cuenta",
                description: "Confiar en tu lectura del caso y asumir el riesgo.",
                check: { type: "riesgo", base: 55 },
                outcomes: {
                    success: {
                        narrative: "Tu decisión cambió el curso del caso. La familia te lo agradeció; tú solo pensaste en lo cerca que había estado el error.",
                        stats: { happiness: 5, knowledge: 3 },
                        psychology: { stress: 6, selfEsteem: 6 },
                        moneyDelta: 450,
                        flags: ["caso_medico_riesgo"],
                        milestone: "Salvó un caso difícil",
                    },
                    failure: {
                        narrative: "La intervención no salió como esperabas. Nadie te acusó, pero el comité revisó cada paso y tú no dormiste igual durante semanas.",
                        stats: { happiness: -9, health: -2 },
                        psychology: { stress: 16, selfEsteem: -8, grief: 8 },
                        debtDelta: 800,
                        medical: { condition: "Estrés postraumático", severity: "moderada", note: "Revisión de un caso clínico adverso." },
                        flags: ["caso_medico_adverso"],
                    },
                },
            },
            {
                id: "derivar",
                label: "Derivar a otra especialidad",
                description: "Reconocer tus límites y pasar el caso sin intentar ser el héroe.",
                outcomes: {
                    success: {
                        narrative: "Derivaste el caso. No fue una rendición; fue una forma de proteger a la paciente de tu prisa.",
                        stats: { happiness: 1, relationships: 1 },
                        psychology: { stress: -4, selfEsteem: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "profesion_musica_gira",
        title: "La oportunidad de tocar fuera",
        description: "Te ofrecen una gira pequeña durante seis meses. El dinero no es seguro y dejarás tus clases y tu rutina.",
        category: "trabajo",
        priority: "major",
        minAge: 24,
        maxAge: 60,
        once: true,
        requirements: { flagsAny: ["profesion_musica"] },
        options: [
            {
                id: "aceptar_gira",
                label: "Aceptar la gira",
                description: "Coger la furgoneta y comprobar hasta dónde llega el proyecto.",
                check: { type: "social", base: 52 },
                outcomes: {
                    success: {
                        narrative: "La gira no te hizo famosa, pero te dio público, historias y la certeza de saber por qué tocabas.",
                        stats: { happiness: 6, relationships: 4, health: -2 },
                        psychology: { stress: 5, selfEsteem: 5 },
                        moneyDelta: 700,
                        milestone: "Una gira que recordarías",
                    },
                    failure: {
                        narrative: "La gira terminó antes de lo previsto. Volviste con menos dinero y con la sensación de haber perdido el hilo de tu vida.",
                        stats: { happiness: -5, relationships: -3 },
                        psychology: { stress: 10, selfEsteem: -4 },
                        moneyDelta: -450,
                    },
                },
            },
            {
                id: "seguir_local",
                label: "Quedarte con tus clases y tu escenario local",
                description: "Una vida más pequeña, pero más predecible.",
                outcomes: {
                    success: {
                        narrative: "Diste clase, tocaste los fines de semana y conservaste a tus alumnos. No era una gira, pero era una vida.",
                        stats: { happiness: 3, relationships: 2 },
                        psychology: { stress: -3 },
                        moneyDelta: 220,
                    },
                },
            },
            {
                id: "dejar_musica",
                label: "Dejar la música como profesión",
                description: "Convertirla otra vez en una afición y buscar ingresos más estables.",
                outcomes: {
                    success: {
                        narrative: "Dejaste de intentar vivir de la música. Tocar volvió a ser un placer, no una factura pendiente.",
                        stats: { happiness: 2, knowledge: 2 },
                        psychology: { stress: -6 },
                        employment: "employed",
                        occupation: "Empleo estable",
                        occupationId: "admin-assistant",
                        sector: "servicios",
                        contractQuality: 58,
                        clearFlags: ["profesion_musica"],
                        flags: ["musica_aficion"],
                    },
                },
            },
        ],
    },
    {
        id: "crear_negocio",
        title: "Montar algo propio",
        description: "Tienes experiencia, una idea y algo de capital. También tienes facturas. ¿Es el momento de abrir un negocio o de esperar?",
        category: "trabajo",
        priority: "major",
        minAge: 28,
        maxAge: 58,
        once: true,
        requirements: { hasBusiness: false },
        options: [
            {
                id: "abrir_estudio_musica",
                label: "Abrir un estudio de música",
                description: "Clases, grabaciones y un local pequeño. Tu formación musical por fin tiene una puerta propia.",
                requirements: { flagsAll: ["track_music"] },
                cost: { shareOfGdp: 0.18 },
                outcomes: {
                    success: {
                        narrative: "Alquilaste un local con mala acústica y lo llenaste de instrumentos. El primer mes no ganaste dinero; el segundo, tampoco. Pero las clases empezaron a repetirse.",
                        flags: ["negocio_activo"],
                        businessStart: { kind: "estudio-musica", name: "Estudio de música" },
                        psychology: { selfEsteem: 4, stress: 5 },
                        milestone: "Abrió su estudio de música",
                    },
                },
            },
            {
                id: "abrir_clinica",
                label: "Abrir una consulta médica",
                description: "Tu propia consulta, con la responsabilidad y los costes que eso implica.",
                requirements: { flagsAll: ["profesion_medica"] },
                cost: { shareOfGdp: 0.25 },
                outcomes: {
                    success: {
                        narrative: "Firmaste el contrato del local y compraste una camilla. La consulta era tuya, y también lo eran las noches sin dormir.",
                        flags: ["negocio_activo"],
                        businessStart: { kind: "clinica", name: "Consulta médica" },
                        psychology: { selfEsteem: 5, stress: 6 },
                        milestone: "Abrió una consulta propia",
                    },
                },
            },
            {
                id: "abrir_estudio_tech",
                label: "Fundar un estudio de tecnología",
                description: "Un socio, dos ordenadores y un producto que aún no existe.",
                requirements: { flagsAny: ["profesion_tecnologia", "track_tech"] },
                cost: { shareOfGdp: 0.14 },
                outcomes: {
                    success: {
                        narrative: "Registraste la empresa un martes por la mañana. El producto salió tarde y con errores, pero alguien pagó por usarlo.",
                        flags: ["negocio_activo"],
                        businessStart: { kind: "tecnologia", name: "Estudio de tecnología" },
                        psychology: { selfEsteem: 5, stress: 6 },
                        milestone: "Fundó una empresa tecnológica",
                    },
                },
            },
            {
                id: "abrir_comercio",
                label: "Abrir un comercio",
                description: "Un local a pie de calle, horario largo y clientes que vuelven.",
                requirements: { flagsAny: ["track_business", "track_trade", "track_work", "profesion_comercio"] },
                cost: { shareOfGdp: 0.1 },
                outcomes: {
                    success: {
                        narrative: "Abrir la persiana cada mañana se convirtió en una rutina. Aprendiste qué productos desaparecían y cuáles se quedaban cogiendo polvo.",
                        flags: ["negocio_activo"],
                        businessStart: { kind: "comercio", name: "Comercio propio" },
                        psychology: { selfEsteem: 3, stress: 5 },
                        milestone: "Abrió un comercio",
                    },
                },
            },
            {
                id: "no_abrir_negocio",
                label: "Esperar y seguir como estás",
                description: "No es el momento. Conservas tu estabilidad y tus ahorros.",
                outcomes: {
                    success: {
                        narrative: "Dejaste la idea en un cuaderno. A veces volvías a leerla; otras veces no.",
                        stats: { happiness: -1, knowledge: 2 },
                        psychology: { stress: -3, selfEsteem: -1 },
                    },
                },
            },
        ],
    },
    {
        id: "gestion_negocio",
        title: "La empresa necesita una decisión",
        description: "Las ventas no van mal, pero la competencia aprieta. Cada euro que pongas en marketing es un euro que no estará en otra parte.",
        category: "trabajo",
        priority: "major",
        minAge: 29,
        maxAge: 90,
        requirements: { hasBusiness: true },
        options: [
            {
                id: "marketing_fuerte",
                label: "Invertir en publicidad",
                description: "Anuncios, redes y una campaña que puede multiplicar la clientela o quedarse en ruido.",
                cost: { shareOfAnnualIncome: 0.12 },
                check: { type: "trabajo", base: 50 },
                outcomes: {
                    success: {
                        narrative: "La campaña trajo clientes que no conocían el negocio. El local volvió a parecer pequeño.",
                        businessChange: { marketingSpendDelta: 1200, reputationDelta: 5 },
                        stats: { knowledge: 2, happiness: 2 },
                        psychology: { selfEsteem: 3 },
                    },
                    failure: {
                        narrative: "Los anuncios se vieron, pero no compraron. Aprendiste que la publicidad no arregla un producto que aún no convence.",
                        businessChange: { marketingSpendDelta: 700, reputationDelta: -3 },
                        moneyDelta: -250,
                        stats: { happiness: -3 },
                        psychology: { stress: 6, selfEsteem: -3 },
                    },
                },
            },
            {
                id: "marketing_local",
                label: "Marketing de barrio",
                description: "Clientes fieles, carteles y una pequeña campaña sin grandes promesas.",
                cost: { shareOfAnnualIncome: 0.03 },
                outcomes: {
                    success: {
                        narrative: "Repartiste tarjetas y cuidaste a quien ya confiaba en ti. El negocio no despegó, pero dejó de ir hacia atrás.",
                        businessChange: { marketingSpendDelta: 180, reputationDelta: 2 },
                        stats: { relationships: 2, happiness: 1 },
                    },
                },
            },
            {
                id: "recortar_costes",
                label: "Recortar gastos",
                description: "Bajar costes sin cerrar. La reputación puede resentirse.",
                outcomes: {
                    success: {
                        narrative: "Recortaste lo que parecía prescindible. La caja aguantó, aunque algunos clientes notaron la diferencia.",
                        businessChange: { costDelta: -800, reputationDelta: -4 },
                        stats: { happiness: -1 },
                        psychology: { stress: -3 },
                    },
                },
            },
            {
                id: "boca_a_boca",
                label: "Confiar en el boca a boca",
                description: "No gastar y dejar que la calidad hable.",
                outcomes: {
                    success: {
                        narrative: "No hiciste ruido. Los clientes que volvieron trajeron a otros y la caja se mantuvo.",
                        businessChange: { reputationDelta: 2 },
                        stats: { happiness: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "prestamo_familia",
        title: "Pedir ayuda a la familia",
        description: "La cuenta no llega a fin de mes. Tus padres tienen algo ahorrado, pero pedirles dinero cambia la relación. También puedes arreglártelas sin ellos.",
        category: "dinero",
        priority: "major",
        minAge: 18,
        maxAge: 50,
        once: true,
        requirements: { flagsAny: ["familia_puede_ayudar"] },
        options: [
            {
                id: "prestamo_padres",
                label: "Pedirles un préstamo",
                description: "Devolverlo cuando puedas. La familia no cobra intereses, pero tampoco olvida.",
                outcomes: {
                    success: {
                        narrative: "Tus padres te transfirieron el dinero sin pedir papeles. La ayuda resolvió el mes y dejó una deuda emocional que no aparece en el banco.",
                        loan: { amountRule: { shareOfAnnualIncome: 0.28 }, lender: "familia", label: "Préstamo de la familia", annualInterestRate: 0 },
                        stats: { relationships: 3, happiness: 2 },
                        psychology: { stress: -4, selfEsteem: -2 },
                        flags: ["deuda_familiar"],
                        milestone: "Recibió ayuda económica familiar",
                    },
                },
            },
            {
                id: "apoyo_emocional",
                label: "Pedir ayuda sin dinero",
                description: "Hablar con ellos de la situación y buscar otra salida.",
                outcomes: {
                    success: {
                        narrative: "No pediste dinero. Pediste consejo y compañía, y descubriste que podías nombrar una dificultad sin que se convirtiera en derrota.",
                        stats: { relationships: 4, happiness: 2 },
                        psychology: { stress: -3, selfEsteem: 2 },
                    },
                },
            },
            {
                id: "no_pedir_nada",
                label: "No pedir nada",
                description: "Resolverlo sola o solo. La independencia también tiene un coste.",
                outcomes: {
                    success: {
                        narrative: "No llamaste. Encontraste una salida más incómoda y la sacaste adelante sin deber explicaciones.",
                        stats: { happiness: -1, knowledge: 2 },
                        psychology: { stress: 4, selfEsteem: 3 },
                    },
                },
            },
        ],
    },
    {
        id: "padre_en_apuros",
        title: "La familia te necesita",
        description: "La situación económica de tu familia empeoró. No es una petición formal, sino una conversación incómoda en la cocina.",
        category: "familia",
        priority: "major",
        minAge: 20,
        maxAge: 65,
        once: true,
        requirements: { flagsAny: ["father_en_apuros", "mother_en_apuros"] },
        options: [
            {
                id: "prestar_familia",
                label: "Prestarles parte de tus ahorros",
                description: "Les das dinero sin saber cuándo volverá. La relación queda marcada.",
                outcomes: {
                    success: {
                        narrative: "Transferiste el dinero y no preguntaste cuándo lo devolverían. En la siguiente comida nadie lo mencionó, pero todos lo sabían.",
                        moneyDelta: -900,
                        stats: { relationships: 6, happiness: 1 },
                        psychology: { selfEsteem: 3, stress: 4 },
                        flags: ["familia_ayudada"],
                        milestone: "Ayudó económicamente a su familia",
                    },
                },
            },
            {
                id: "cubrir_factura",
                label: "Pagar una factura concreta",
                description: "No das efectivo: pagas la luz o la compra del mes.",
                cost: { shareOfAnnualIncome: 0.08 },
                outcomes: {
                    success: {
                        narrative: "Pagaste la factura directamente. Era una forma de ayudar sin convertir la ayuda en una negociación.",
                        stats: { relationships: 4 },
                        psychology: { selfEsteem: 2, stress: 2 },
                        flags: ["familia_ayudada"],
                    },
                },
            },
            {
                id: "no_puedo_ayudar",
                label: "Explicar que no puedes",
                description: "Tu propia economía no da para más.",
                outcomes: {
                    success: {
                        narrative: "Dijiste que no. La conversación fue dura y honesta; ninguno de los dos salió igual.",
                        stats: { relationships: -3, happiness: -2 },
                        psychology: { stress: 4, selfEsteem: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "prestamo_bancario",
        title: "El banco ofrece crédito",
        description: "Tienes una oferta de préstamo. El dinero llega hoy; las cuotas llegarán durante años. No todo lo que se puede pedir conviene pedirlo.",
        category: "dinero",
        priority: "focus",
        minAge: 22,
        maxAge: 60,
        options: [
            {
                id: "prestamo_pequeno",
                label: "Pedir un préstamo pequeño",
                description: "Una cantidad manejable para una necesidad concreta.",
                outcomes: {
                    success: {
                        narrative: "Firmaste sin leer cada línea. El dinero entró rápido; la cuota mensual empezó a formar parte de tus cálculos.",
                        loan: { amountRule: { shareOfAnnualIncome: 0.2 }, lender: "banco", label: "Préstamo bancario", annualInterestRate: 0.12 },
                        creditDelta: -2,
                        stats: { happiness: 1 },
                        psychology: { stress: 3 },
                    },
                },
            },
            {
                id: "prestamo_grande",
                label: "Pedir un préstamo grande",
                description: "Más dinero, más intereses y una cuota que puede condicionar tus decisiones.",
                outcomes: {
                    success: {
                        narrative: "El banco aprobó una cantidad que te sorprendió. Durante un tiempo te sentiste con opciones; después comprendiste el precio de tenerlas.",
                        loan: { amountRule: { shareOfAnnualIncome: 0.55 }, lender: "banco", label: "Préstamo bancario amplio", annualInterestRate: 0.15 },
                        creditDelta: -4,
                        stats: { happiness: 2 },
                        psychology: { stress: 7, selfEsteem: 1 },
                    },
                },
            },
            {
                id: "rechazar_prestamo",
                label: "Rechazar la oferta",
                description: "No endeudarte ahora. La tranquilidad también es un activo.",
                outcomes: {
                    success: {
                        narrative: "Cerraste la carta del banco y seguiste con tu presupuesto. No era la opción emocionante, pero dormiste mejor.",
                        stats: { happiness: 1 },
                        psychology: { stress: -4, selfEsteem: 2 },
                        creditDelta: 2,
                    },
                },
            },
        ],
    },
    {
        id: "oferta_tentadora",
        title: "Una oferta demasiado fácil",
        description: "Alguien te propone ganar dinero rápido con un negocio que no termina de explicar. La cantidad es alta y el plazo, corto. También puedes alejarte o denunciarlo.",
        category: "riesgo",
        priority: "major",
        minAge: 20,
        maxAge: 45,
        once: true,
        requirements: { severity: "full" },
        options: [
            {
                id: "aceptar_oferta",
                label: "Aceptar y no hacer preguntas",
                description: "Cobrar primero. Ya verás después.",
                check: { type: "riesgo", base: 38 },
                outcomes: {
                    success: {
                        narrative: "El dinero llegó. Durante unos meses te sentiste más listo que los demás; después empezaste a mirar el teléfono cada vez que sonaba.",
                        moneyDelta: 2600,
                        stats: { happiness: 3 },
                        psychology: { stress: 7, selfEsteem: 2 },
                        flags: ["dinero_dudoso"],
                        milestone: "Ganó dinero en un negocio opaco",
                    },
                    failure: {
                        narrative: "La operación era una estafa. Perdiste lo que habías puesto y tuviste que explicar a tu familia por qué confiaste.",
                        moneyDelta: -1200,
                        stats: { happiness: -8, relationships: -3 },
                        psychology: { stress: 12, selfEsteem: -7 },
                        flags: ["estafado"],
                    },
                },
            },
            {
                id: "investigar_oferta",
                label: "Investigar antes de decidir",
                description: "Preguntar, buscar y pedir papeles. Perderás la oportunidad si es buena.",
                outcomes: {
                    success: {
                        narrative: "Descubriste que la oferta no era lo que decía. No ganaste dinero, pero tampoco perdiste lo que no tenías.",
                        stats: { knowledge: 4, happiness: 1 },
                        psychology: { selfEsteem: 3, stress: -1 },
                    },
                },
            },
            {
                id: "denunciar_oferta",
                label: "Denunciarlo",
                description: "No es tu problema, pero puede serlo el de otra persona.",
                outcomes: {
                    success: {
                        narrative: "Presentaste una denuncia. No recuperaste nada, pero alguien más no cayó en la trampa.",
                        stats: { relationships: 1, happiness: 2 },
                        psychology: { selfEsteem: 4 },
                        flags: ["denunciante"],
                    },
                },
            },
        ],
    },
    {
        id: "conduccion_riesgo",
        title: "La carretera de noche",
        description: "Volvéis tarde. El conductor ha bebido y propone ir rápido por la carretera secundaria. Tú también puedes elegir cómo volver.",
        category: "riesgo",
        priority: "major",
        minAge: 18,
        maxAge: 45,
        once: true,
        requirements: { severity: "full" },
        options: [
            {
                id: "subir_al_coche",
                label: "Subir al coche",
                description: "Es solo un trayecto. No parece tan grave.",
                check: { type: "riesgo", base: 50 },
                outcomes: {
                    success: {
                        narrative: "Llegaste a casa sin consecuencias. Al día siguiente lo contaste como una anécdota; años después te costó entender por qué lo hiciste.",
                        stats: { happiness: 1 },
                        psychology: { stress: 4 },
                        flags: ["conduccion_temeraria"],
                    },
                    failure: {
                        narrative: "El coche salió de la vía. La recuperación fue larga y el miedo tardó más que los huesos en curarse.",
                        stats: { health: -24, happiness: -10 },
                        psychology: { stress: 18, grief: 4 },
                        chronicCondition: "Secuelas de accidente de tráfico",
                        medical: { condition: "Accidente de tráfico", severity: "grave", note: "Politraumatismo tras salida de vía." },
                        debtDelta: 1800,
                        flags: ["accidente_grave"],
                    },
                },
            },
            {
                id: "llamar_taxi",
                label: "Llamar un taxi",
                description: "Pagar la carrera y discutir mañana.",
                cost: { shareOfAnnualIncome: 0.02 },
                outcomes: {
                    success: {
                        narrative: "Pagaste el taxi y dejaste el coche donde estaba. La discusión de la mañana fue incómoda; el resto de tu vida, no.",
                        stats: { happiness: 2, relationships: 1 },
                        psychology: { selfEsteem: 3, stress: -2 },
                    },
                },
            },
            {
                id: "quedarse",
                label: "Quedarte donde estás",
                description: "No volver con ellos. Buscar otra forma de llegar.",
                outcomes: {
                    success: {
                        narrative: "Te quedaste. Dormiste poco y al día siguiente tuviste que explicar por qué no volviste.",
                        stats: { happiness: 1, relationships: -2 },
                        psychology: { selfEsteem: 2, stress: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "cuidar_padres_mayores",
        title: "Tus padres ya no pueden solos",
        description: "Una caída en casa ha dejado claro que necesitan apoyo. Cuidarles tú, contratar ayuda o buscar una residencia son decisiones con costes distintos.",
        category: "familia",
        priority: "major",
        minAge: 45,
        maxAge: 80,
        once: true,
        requirements: { flagsAny: ["parents_mayores"] },
        options: [
            {
                id: "cuidar_en_casa",
                label: "Cuidarles en casa",
                description: "Organizar tu vida alrededor de sus necesidades.",
                outcomes: {
                    success: {
                        narrative: "Cambiaste horarios y habitaciones. Hubo días de agotamiento y días en los que entendiste a tus padres de una forma nueva.",
                        stats: { relationships: 7, health: -3, happiness: 2 },
                        psychology: { stress: 10, burnout: 8, grief: 2 },
                        milestone: "Cuidó a sus padres en casa",
                    },
                },
            },
            {
                id: "contratar_ayuda",
                label: "Contratar ayuda a domicilio",
                description: "Pagar a alguien para que esté con ellos durante el día.",
                cost: { shareOfAnnualIncome: 0.12 },
                outcomes: {
                    success: {
                        narrative: "Contrataste a una cuidadora. La casa siguió siendo suya y tú pudiste dormir alguna noche completa.",
                        stats: { relationships: 4, happiness: 1 },
                        psychology: { stress: -3, grief: 1 },
                    },
                },
            },
            {
                id: "residencia",
                label: "Buscar una residencia",
                description: "Una decisión difícil que puede darles más compañía y a ti más tiempo.",
                cost: { shareOfAnnualIncome: 0.18 },
                outcomes: {
                    success: {
                        narrative: "Elegiste una residencia con jardín. La primera visita fue silenciosa; la segunda, un poco menos.",
                        stats: { relationships: 2, happiness: -1 },
                        psychology: { stress: -2, grief: 4, selfEsteem: -3 },
                        milestone: "Buscó una residencia para sus padres",
                    },
                },
            },
            {
                id: "repartir_familia",
                label: "Repartir el cuidado con tus hermanos",
                description: "Una conversación difícil para que nadie cargue con todo.",
                outcomes: {
                    success: {
                        narrative: "Hiciste una lista de tareas y la compartiste. No fue justo todos los días, pero al menos dejó de ser invisible.",
                        stats: { relationships: 5, happiness: 2 },
                        psychology: { stress: -2, selfEsteem: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "enfermedad_grave",
        title: "Una noticia médica",
        description: "Una prueba ha salido mal. Hay un tratamiento caro, otro más lento y la opción de esperar. No hay una decisión sin coste.",
        category: "salud",
        priority: "major",
        minAge: 30,
        maxAge: 90,
        once: true,
        options: [
            {
                id: "tratamiento_privado",
                label: "Pagar el tratamiento completo",
                description: "Acceso rápido y seguimiento cercano, si la economía lo permite.",
                cost: { shareOfAnnualIncome: 0.3 },
                check: { type: "salud", base: 58 },
                outcomes: {
                    success: {
                        narrative: "El tratamiento funcionó. La factura llegó antes que la mejoría, pero pudiste pagarla y volver a casa.",
                        stats: { health: 12, happiness: 4 },
                        psychology: { stress: -5, selfEsteem: 2 },
                        milestone: "Superó una enfermedad grave",
                    },
                    failure: {
                        narrative: "El tratamiento no dio el resultado esperado. La enfermedad avanzó y tu vida tuvo que reorganizarse alrededor de ella.",
                        stats: { health: -10, happiness: -6 },
                        psychology: { stress: 14, grief: 6 },
                        chronicCondition: "Enfermedad crónica grave",
                        medical: { condition: "Enfermedad grave", severity: "grave", note: "Tratamiento con respuesta parcial." },
                    },
                },
            },
            {
                id: "tratamiento_publico",
                label: "Seguir el tratamiento público",
                description: "Más espera, menos coste directo. La distancia y las listas también pesan.",
                check: { type: "salud", base: 50 },
                outcomes: {
                    success: {
                        narrative: "La sanidad pública te sostuvo. Las esperas fueron largas, pero el tratamiento llegó a tiempo.",
                        stats: { health: 8, happiness: 2 },
                        psychology: { stress: 2 },
                    },
                    failure: {
                        narrative: "La espera se alargó más de lo que podías permitirte. Aprendiste que el tiempo también es una forma de coste.",
                        stats: { health: -8, happiness: -4 },
                        psychology: { stress: 10 },
                        chronicCondition: "Secuelas de una enfermedad tratada tarde",
                    },
                },
            },
            {
                id: "esperar",
                label: "Esperar y observar",
                description: "No decidir todavía. A veces es prudente; otras, una forma de no mirar.",
                check: { type: "salud", base: 38 },
                outcomes: {
                    success: {
                        narrative: "La revisión siguiente mostró que no era tan grave. Te sentiste afortunado y también un poco culpable.",
                        stats: { health: 3, happiness: 1 },
                        psychology: { stress: -2 },
                    },
                    failure: {
                        narrative: "Esperar costó caro. Cuando volviste, el margen de tratamiento era menor.",
                        stats: { health: -14, happiness: -5 },
                        psychology: { stress: 12, grief: 5 },
                        chronicCondition: "Enfermedad avanzada",
                    },
                },
            },
        ],
    },
    {
        id: "robo_oportunidad",
        title: "Una cartera en el suelo",
        description: "Vuelves a casa y encuentras una cartera con dinero y documentación. Nadie te ha visto. Lo que hagas ahora dirá algo de ti, aunque nadie llegue a saberlo.",
        category: "riesgo",
        priority: "major",
        minAge: 14,
        maxAge: 38,
        once: true,
        requirements: { severity: "full" },
        options: [
            {
                id: "quedarse_cartera",
                label: "Quedarte el dinero",
                description: "Guardar la cartera y no contar dónde la encontraste.",
                check: { type: "riesgo", base: 46 },
                outcomes: {
                    success: {
                        narrative: "Te quedaste el dinero. Durante unos días pareció una victoria pequeña; luego empezaste a evitar pasar por la misma calle.",
                        moneyDelta: 240,
                        stats: { happiness: 2, relationships: -2 },
                        psychology: { stress: 5, selfEsteem: -1 },
                        flags: ["delito_menor"],
                        milestone: "Guardó una cartera ajena",
                        schedule: [
                            {
                                inYears: 3,
                                narrative: "Aquel dinero ya no existía, pero el recuerdo seguía ahí. Una carta de una entidad o una conversación con alguien te devolvió la escena entera.",
                                stats: { happiness: -2 },
                                incomeModifierDelta: -0.02,
                                flags: ["antecedente_penal"],
                            },
                        ],
                    },
                    failure: {
                        narrative: "La dueña apareció antes de que pudieras guardarla. La vergüenza fue pública; el susto, doméstico. Tuviste que devolverlo todo y pagar una multa.",
                        moneyDelta: -120,
                        debtDelta: 600,
                        stats: { happiness: -9, relationships: -4 },
                        psychology: { stress: 14, selfEsteem: -8 },
                        flags: ["delito_menor", "antecedente_penal"],
                    },
                },
            },
            {
                id: "devolver_cartera",
                label: "Buscar a su dueño",
                description: "Mirar la documentación y devolverla sin quedarte nada.",
                check: { type: "social", base: 68 },
                outcomes: {
                    success: {
                        narrative: "Encontraste a la dueña. No hubo recompensa, solo un alivio compartido y la sensación de haber hecho algo que no necesitaba público.",
                        stats: { happiness: 3, relationships: 2 },
                        psychology: { selfEsteem: 4, stress: -2 },
                    },
                    failure: {
                        narrative: "La dirección ya no existía. Dejaste la cartera en comisaría y explicaste lo que sabías. No era tu dinero, pero te llevaste una historia.",
                        stats: { relationships: 1 },
                        psychology: { stress: 1 },
                    },
                },
            },
            {
                id: "dejarla",
                label: "Dejarla donde estaba",
                description: "No tocar nada y seguir con tu vida.",
                outcomes: {
                    success: {
                        narrative: "La dejaste allí. Quizá volvió a su dueña; quizá no. No lo sabrás, y decidiste que no necesitabas saberlo.",
                        psychology: { stress: -1 },
                    },
                },
            },
        ],
    },

    // ---------------------------------------------------------------------
    // Decisiones de contexto v3: país, familia, género, migración y empresa.
    // Son situaciones, no destinos: siempre existe una vía de resistencia o
    // recuperación, y ninguna opción garantiza riqueza ni condena a pobreza.
    // ---------------------------------------------------------------------
    {
        id: "presion_estudios_genero",
        title: "La escuela frente a la familia",
        description: "En casa hay una conversación sobre tu futuro. Los estudios compiten con el trabajo y con lo que la comunidad espera de ti. No es una sentencia: es una presión que debes negociar.",
        contextNote: "Este dilema aparece en contextos donde las normas familiares y las barreras educativas pesan más. Puedes intentar cambiarlo.",
        category: "educacion",
        priority: "major",
        minAge: 14,
        maxAge: 18,
        once: true,
        weight: 2.2,
        requirements: { country: ["IND", "NGA", "EGY", "IDN"], sex: ["female"], familyTierMax: 4 },
        options: [
            {
                id: "beca_insistir", label: "Buscar una beca y seguir estudiando",
                description: "Hablar con una profesora y preparar solicitudes. Requiere constancia y apoyo.",
                cost: { shareOfGdp: 0.04 }, check: { type: "educacion", base: 48 },
                outcomes: {
                    success: { narrative: "Una profesora te ayudó a reunir papeles. La beca no lo arregló todo, pero abrió una puerta que tu familia no veía.", stats: { knowledge: 7, happiness: 3, relationships: 1 }, education: "secondary", flags: ["beca_escolar", "track_education"], milestone: "Consiguió una beca para seguir estudiando" },
                    failure: { narrative: "La solicitud quedó fuera de plazo. No te rindes, pero el curso se complica y en casa vuelven las dudas.", stats: { knowledge: 2, happiness: -3, relationships: -1 }, psychology: { stress: 5 } },
                },
            },
            {
                id: "formacion_oficio", label: "Aprender un oficio mientras trabajas",
                description: "Formación práctica y un pequeño ingreso. Menos tiempo libre y menos prestigio social.",
                outcomes: {
                    success: { narrative: "Entre turnos aprendiste un oficio con las manos. No era el futuro que imaginabas, pero empezaste a ganar algo tuyo.", stats: { knowledge: 3, health: -1, relationships: 1 }, education: "vocational", flags: ["formacion_oficio", "track_trade"], milestone: "Completó una formación profesional" },
                    failure: { narrative: "El taller cerró antes de que terminaras. Te quedaste con lo aprendido y sin el certificado.", stats: { knowledge: 1, happiness: -2 }, employment: "unemployed", flags: ["formacion_oficio"] },
                },
            },
            {
                id: "trabajo_familia", label: "Aceptar el trabajo que propone la familia",
                description: "Un ingreso inmediato y una obligación con los tuyos. La escuela queda en segundo plano.",
                outcomes: {
                    success: { narrative: "Empezaste a trabajar con alguien de confianza. El dinero entró pronto; la idea de volver a estudiar se fue aplazando.", stats: { relationships: 3, happiness: -1, knowledge: -2 }, employment: "employed", flags: ["dejo_estudios", "trabajo_familiar"], incomeModifierDelta: 0.04 },
                },
            },
        ],
    },
    {
        id: "presion_matrimonio",
        title: "Conocer a alguien que no elegiste",
        description: "La familia ha organizado una presentación. No hay amenaza ni boda automática, pero sí expectativas, miradas y la sensación de que rechazar también tiene un precio.",
        contextNote: "La presión familiar varía por país y hogar. Tu decisión no está escrita de antemano.",
        category: "familia",
        priority: "major",
        minAge: 18,
        maxAge: 30,
        once: true,
        weight: 2,
        requirements: { hasPartner: false, country: ["IND", "NGA", "EGY", "IDN", "ZAF", "MEX", "BRA"], familyTierMax: 4 },
        options: [
            {
                id: "aceptar_presentacion", label: "Aceptar la presentación y ver qué pasa",
                description: "Conocer a la persona, escuchar a la familia y decidir después. No es un sí definitivo.",
                check: { type: "social", base: 56 },
                outcomes: {
                    success: { narrative: "La conversación fue mejor de lo que temías. No fue amor instantáneo, pero hubo respeto y una segunda cita.", stats: { relationships: 4, happiness: 2 }, setPartner: true, maritalStatus: "dating", flags: ["presentacion_familiar"] },
                    failure: { narrative: "La cita fue tensa y llena de expectativas ajenas. Saliste sabiendo que no querías construir una vida así.", stats: { happiness: -2, relationships: -1 }, psychology: { stress: 3 } },
                },
            },
            {
                id: "negociar_tiempo", label: "Pedir tiempo y conocer a la persona sin boda",
                description: "Negociar con tu familia un periodo de conocimiento. Puede funcionar o romper la confianza.",
                check: { type: "social", base: 48 },
                outcomes: {
                    success: { narrative: "Tu familia aceptó esperar. Ganaste tiempo y una relación que empezó a tu ritmo, no al de la sala.", stats: { relationships: 2, happiness: 3, knowledge: 1 }, setPartner: true, maritalStatus: "dating", flags: ["relacion_elegida"] },
                    failure: { narrative: "La negociación se leyó como rechazo. La relación con parte de tu familia se enfrió, aunque tú seguiste decidiendo sobre tu vida.", stats: { relationships: -3, happiness: 1 }, psychology: { stress: 4, selfEsteem: 2 } },
                },
            },
            {
                id: "rechazar_presion", label: "Rechazar la presentación",
                description: "Defender tu autonomía y asumir el conflicto familiar.",
                outcomes: {
                    success: { narrative: "Dijiste que no. La cena terminó antes de lo previsto, pero dormiste sabiendo que esa decisión era tuya.", stats: { happiness: 3, relationships: -4, knowledge: 2 }, psychology: { stress: 2, selfEsteem: 5 }, flags: ["rechazo_presion", "independencia"] },
                },
            },
        ],
    },
    {
        id: "presion_hijos",
        title: "La presión de tener hijos",
        description: "Las conversaciones familiares giran alrededor de los hijos. Hay expectativas culturales, cansancio y preguntas que no siempre quieres responder. También puedes elegir tu propio camino.",
        contextNote: "La fecundidad y las normas familiares cambian por país y generación. La presión social se juega, no se impone.",
        category: "familia",
        priority: "major",
        minAge: 24,
        maxAge: 40,
        once: true,
        weight: 1.8,
        requirements: { hasPartner: true, childrenMax: 0, country: ["MEX", "BRA", "IND", "NGA", "EGY", "IDN"] },
        options: [
            { id: "tener_hijo", label: "Tener un hijo ahora", description: "Asumir el deseo y el coste de cuidar a otra persona desde este año.", outcomes: { success: { narrative: "La casa cambió de ritmo. El cansancio fue real, también el vínculo. A partir de aquí, cada decisión tendría en cuenta a alguien más.", stats: { happiness: 4, relationships: 5, health: -2 }, childrenDelta: 1, psychology: { stress: 4, lifeSatisfaction: 3 }, milestone: "Tuvo su primer hijo" } } },
            { id: "esperar_hijos", label: "Esperar y hablar con tu pareja", description: "Poner límites a la presión sin cerrar definitivamente la puerta.", outcomes: { success: { narrative: "Acordasteis esperar. Algunas miradas familiares siguieron incómodas, pero la decisión fue compartida.", stats: { relationships: 2, happiness: 1 }, psychology: { stress: -2, selfEsteem: 2 } } } },
            { id: "renunciar_hijos", label: "Decidir no tener hijos", description: "Defender una vida sin hijos frente a las expectativas del entorno.", outcomes: { success: { narrative: "No cambié de idea. Hubo distancia con parte de la familia y una tranquilidad que no sabías que necesitabas.", stats: { happiness: 3, relationships: -4, knowledge: 2 }, psychology: { stress: 3, selfEsteem: 5 }, flags: ["sin_hijos_elegido"] } } },
        ],
    },
    {
        id: "migracion_internacional",
        title: "Un billete hacia otro país",
        description: "Tienes edad, información y una oportunidad incompleta. Cada destino exige dinero, papeles y una red de apoyo. Migrar no garantiza mejorar; quedarte tampoco.",
        contextNote: "Costes y dificultad de visado son parámetros orientativos. La vida en destino depende de tus estudios, idioma y decisiones posteriores.",
        category: "migracion",
        priority: "major",
        minAge: 18,
        maxAge: 34,
        once: true,
        weight: 2.4,
        dataRefs: ["data/country-context.json"],
        options: [
            { id: "migrar_espana", label: "Probar en España", description: "Idioma y comunidad, pero trámites lentos y alquileres altos en las ciudades.", cost: { destinationCountry: "ESP" }, check: { type: "trabajo", base: 52 }, outcomes: { success: { narrative: "Aterrizaste con dos maletas y una dirección prestada. El primer alquiler fue una habitación; el primer trabajo, peor de lo que esperabas. Aun así, abriste una vida nueva.", stats: { knowledge: 3, happiness: 2, relationships: -3 }, migrateTo: { countryCode: "ESP", location: "Madrid" }, employment: "employed", flags: ["migrante", "migracion_espana"], milestone: "Emigró a España" }, failure: { narrative: "El visado no llegó a tiempo y perdiste la mayoría del dinero en el intento. La oportunidad quedó a medias, pero la idea no desapareció.", stats: { happiness: -4, relationships: -1 }, psychology: { stress: 8 }, flags: ["visado_rechazado"] } } },
            { id: "migrar_alemania", label: "Aceptar un contrato en Alemania", description: "Más requisitos de idioma y cualificación, pero un mercado laboral más estable.", cost: { destinationCountry: "DEU" }, check: { type: "educacion", base: 44 }, outcomes: { success: { narrative: "El contrato era real, aunque el primer invierno fue muy solitario. El idioma te limitó y también te obligó a aprender más rápido.", stats: { knowledge: 5, happiness: -1, relationships: -2 }, migrateTo: { countryCode: "DEU", location: "Berlín" }, employment: "employed", flags: ["migrante", "migracion_alemania"], milestone: "Emigró a Alemania" }, failure: { narrative: "La agencia desapareció con la tasa de tramitación. Aprendiste a desconfiar de las promesas rápidas y volviste a empezar.", stats: { knowledge: 2, happiness: -3 }, psychology: { stress: 6 }, flags: ["estafa_migratoria"] } } },
            { id: "migrar_estados_unidos", label: "Intentar cruzar hacia Estados Unidos", description: "El coste y el riesgo son altos. La recompensa puede ser grande o dejar una deuda y una situación irregular.", cost: { destinationCountry: "USA" }, check: { type: "riesgo", base: 34 }, outcomes: { success: { narrative: "Cruzaste con ayuda de una red de conocidos. El trabajo llegó pronto; el miedo a no tener papeles tardó mucho más en irse.", stats: { health: -2, knowledge: 2, happiness: 1 }, migrateTo: { countryCode: "USA", location: "Los Ángeles" }, employment: "employed", flags: ["migrante", "estatus_irregular"], milestone: "Emigró a Estados Unidos" }, failure: { narrative: "La ruta se cerró y tuviste que volver. Perdiste dinero y confianza, pero conservaste la vida.", stats: { health: -4, happiness: -5 }, psychology: { stress: 10 }, flags: ["migracion_fallida"] } } },
            { id: "preparar_migracion", label: "Quedarte y preparar una migración mejor", description: "Ahorrar, estudiar idiomas y solicitar información antes de mover la vida entera.", outcomes: { success: { narrative: "No te fuiste todavía. Abriste una carpeta con papeles, cursos y ahorros. La puerta quedó abierta sin romperte la vida actual.", stats: { knowledge: 4, happiness: 1, relationships: 1 }, flags: ["migracion_preparada"] } } },
        ],
    },
    {
        id: "trabajo_contrato",
        title: "Leer el contrato antes de firmar",
        description: "La oferta parece buena. El contrato tiene letra pequeña: horario, seguro, periodo de prueba y una cláusula que no entiendes. Firmar cambia tu estabilidad.",
        contextNote: "La calidad del empleo no depende solo del salario. El país y el sector cambian tus derechos y tu margen de negociación.",
        category: "trabajo", priority: "major", minAge: 18, maxAge: 38, once: true, weight: 1.7,
        options: [
            { id: "negociar_contrato", label: "Pedir cambios y aclaraciones", description: "Negociar horario, seguro y cláusula de salida antes de firmar.", check: { type: "trabajo", base: 50 }, outcomes: { success: { narrative: "La empresa aceptó parte de tus condiciones. No fue perfecto, pero entraste con los ojos abiertos.", stats: { knowledge: 2, happiness: 2, relationships: 1 }, employment: "employed", contractQuality: 78, incomeModifierDelta: 0.05, flags: ["contrato_negociado"] }, failure: { narrative: "La empresa dijo que eras sustituible. Firmaste con menos condiciones o seguiste buscando; aprendiste cuánto pesa la prisa.", stats: { happiness: -2, knowledge: 2 }, employment: "employed", contractQuality: 45 } } },
            { id: "firmar_contrato", label: "Firmar y aprender sobre la marcha", description: "Un ingreso seguro ahora. El coste aparecerá en las horas y en la falta de protección.", outcomes: { success: { narrative: "El sueldo llegó puntual. Las horas extra, también. Aprendiste a leer un contrato después de haberlo firmado.", stats: { knowledge: 1, happiness: -1, health: -1 }, employment: "employed", contractQuality: 52, incomeModifierDelta: 0.03, flags: ["contrato_firmado_sin_leer"] } } },
            { id: "rechazar_empleo", label: "Rechazar la oferta y seguir buscando", description: "Defender tus condiciones aunque la cuenta bancaria apriete.", outcomes: { success: { narrative: "Dijiste no. La búsqueda se alargó y el ahorro se redujo, pero no normalizaste un trato que te habría desgastado.", stats: { happiness: 2, knowledge: 1, health: 1 }, psychology: { stress: 3, selfEsteem: 3 }, employment: "unemployed", flags: ["empleo_rechazado"] } } },
        ],
    },
    {
        id: "empresa_contratar",
        title: "La empresa necesita crecer",
        description: "Tienes clientes y más trabajo del que puedes cubrir. Contratar puede multiplicar el negocio o convertir una mala racha en una nómina imposible.",
        contextNote: "Una empresa no es dinero automático: cada decisión afecta a costes, reputación y personas.",
        category: "trabajo", priority: "major", minAge: 25, maxAge: 65, once: true, weight: 2,
        requirements: { hasBusiness: true },
        options: [
            { id: "contratar_primera_persona", label: "Contratar a una persona", description: "Delegar parte del trabajo y asumir un salario fijo.", outcomes: { success: { narrative: "La primera persona contratada aprendió rápido. La nómina pesó, pero el negocio pudo aceptar más encargos.", stats: { happiness: 2 }, businessChange: { employeesDelta: 1, reputationDelta: 3 }, milestone: "Creó el primer empleo de su empresa" }, failure: { narrative: "La persona no encajó y el coste llegó antes que los ingresos. Aprendiste que contratar es una decisión de empresa, no un gesto de generosidad.", stats: { happiness: -2 }, businessChange: { employeesDelta: 1, costDelta: 0.05 } } } },
            { id: "no_contratar", label: "No contratar todavía", description: "Mantener el control y rechazar clientes antes que endeudarte.", outcomes: { success: { narrative: "Dijiste que no a algunos encargos. El negocio creció menos, pero conservaste margen para respirar.", stats: { happiness: 1 }, businessChange: { reputationDelta: 1 } } } },
            { id: "contratar_familiar", label: "Contratar a alguien de la familia", description: "Confianza y flexibilidad, pero mezclar afecto y salario complica los límites.", outcomes: { success: { narrative: "Un familiar entró a ayudar. La confianza evitó papeleo y creó deudas que no se podían contabilizar.", stats: { relationships: 3, happiness: 1 }, businessChange: { employeesDelta: 1, costDelta: 0.02 }, flags: ["empresa_familiar"] } } },
        ],
    },
    {
        id: "empresa_crisis",
        title: "La empresa entra en números rojos",
        description: "Dos meses sin margen. La reputación se resiente y los proveedores llaman. Puedes invertir, recortar o compartir el control antes de que la situación te supere.",
        contextNote: "Una mala gestión puede llevar al cierre; una decisión difícil también puede salvar el negocio.",
        category: "trabajo", priority: "major", minAge: 25, maxAge: 68, once: true, weight: 2.2,
        requirements: { hasBusiness: true, flagsAny: ["negocio_activo"] },
        options: [
            { id: "invertir_marketing", label: "Invertir en marketing y producto", description: "Gastar ahora para recuperar clientes. Puede empeorar la caja a corto plazo.", cost: { shareOfGdp: 0.08 }, check: { type: "trabajo", base: 48 }, outcomes: { success: { narrative: "La campaña trajo suficientes clientes para cubrir el año. No fue magia: fue una apuesta medida y mucho trabajo.", stats: { happiness: 2 }, businessChange: { marketingSpendDelta: 600, reputationDelta: 5 } }, failure: { narrative: "El dinero se fue en anuncios sin ventas. La caja quedó más débil y tuviste que recortar de inmediato.", stats: { happiness: -3, health: -1 }, businessChange: { marketingSpendDelta: 300, reputationDelta: -3 } } } },
            { id: "recortar_costes", label: "Recortar costes y negociar con proveedores", description: "Menos margen para crecer, más posibilidades de sobrevivir.", outcomes: { success: { narrative: "Negociaste plazos y redujiste gastos. El negocio se volvió más pequeño y más resistente.", stats: { happiness: -1 }, businessChange: { costDelta: -600, reputationDelta: -1 } } } },
            { id: "despedir_persona", label: "Despedir a una persona para reducir costes", description: "Proteger la caja a costa de un empleo y de la confianza del equipo.", outcomes: { success: { narrative: "Explicaste la decisión como pudiste. La nómina desapareció y la reputación interna quedó dañada.", stats: { happiness: -3, relationships: -3 }, psychology: { stress: 8, selfEsteem: -3 }, businessChange: { employeesDelta: -1, reputationDelta: -7 }, flags: ["despido_realizado"] } } },
            { id: "buscar_socio", label: "Buscar un socio con dinero", description: "Ceder parte del control para ganar aire y experiencia.", check: { type: "social", base: 44 }, outcomes: { success: { narrative: "Un socio aportó capital y contactos. Tuviste que compartir decisiones que antes eran solo tuyas.", stats: { relationships: 2 }, businessChange: { costDelta: -300, reputationDelta: 3 }, flags: ["socio_empresa"] }, failure: { narrative: "Las negociaciones se alargaron y el socio se echó atrás. La empresa siguió sola, más cerca del límite.", stats: { happiness: -2 }, psychology: { stress: 5 } } } },
        ],
    },
    {
        id: "vivienda_emancipacion",
        title: "Irte de casa",
        description: "Tienes ingresos, pero el alquiler se lleva una parte enorme. Compartir, esperar o comprar cambia tu libertad y tu riesgo. No hay una opción sin coste.",
        contextNote: "El coste de la vivienda depende del país y de la ciudad. Comprar sin fondo de emergencia puede ser tan arriesgado como alquilar sin red.",
        category: "vivienda", priority: "major", minAge: 18, maxAge: 32, once: true, weight: 1.8,
        requirements: { employment: ["employed", "self-employed"] },
        options: [
            { id: "alquilar_sola", label: "Alquilar un lugar propio", description: "Independencia y privacidad a cambio de una renta alta y menos ahorro.", cost: { shareOfAnnualIncome: 0.22 }, outcomes: { success: { narrative: "Firmaste el contrato y compraste lo mínimo. La libertad era real; la cuenta a final de mes, también.", stats: { happiness: 4, relationships: 1 }, housingDelta: 8, expenseModifierDelta: 0.04, flags: ["emancipada"] } } },
            { id: "compartir_piso", label: "Compartir piso", description: "Menos coste y más compañía, pero menos intimidad.", cost: { shareOfAnnualIncome: 0.12 }, outcomes: { success: { narrative: "Compartiste cocina y decisiones. Aprendiste a negociar el ruido, los platos y el espacio.", stats: { relationships: 4, happiness: 2 }, housingDelta: 3, expenseModifierDelta: 0.02, flags: ["emancipada", "piso_compartido"] } } },
            { id: "quedarse_casa", label: "Quedarte y ahorrar", description: "Posponer la independencia para construir un colchón.", outcomes: { success: { narrative: "Seguiste en casa. No fue gratis: hubo tensión y preguntas. Pero tu ahorro creció y la salida futura tenía más base.", stats: { relationships: -1, happiness: -1 }, flags: ["ahorro_vivienda"] } } },
        ],
    },
    {
        id: "recuperar_despues_de_fallo",
        title: "Una segunda oportunidad",
        description: "Lo que salió mal todavía no define toda tu vida. Alguien te ofrece formación, un empleo modesto o la posibilidad de empezar un pequeño negocio. No es un reinicio limpio: arrastras deudas y vínculos.",
        contextNote: "Las decisiones anteriores cierran puertas, pero el modelo genera oportunidades de recuperación para que una mala racha no sea una condena.",
        category: "trabajo", priority: "major", minAge: 20, maxAge: 55, once: true, weight: 3,
        requirements: { flagsAny: ["dejo_estudios", "negocio_quebrado", "deuda_familiar", "estafa_migratoria", "migracion_fallida", "despido"] },
        options: [
            { id: "volver_estudiar", label: "Volver a formarte", description: "Estudiar mientras trabajas o con una beca parcial. El esfuerzo tarda en dar fruto.", cost: { shareOfGdp: 0.06 }, check: { type: "educacion", base: 50 }, outcomes: { success: { narrative: "Volviste a las aulas con más cansancio y más claro que antes. La formación no borró el error, pero cambió lo que podías intentar después.", stats: { knowledge: 7, happiness: 2 }, education: "vocational", flags: ["segunda_oportunidad"], milestone: "Volvió a formarse después de un revés" }, failure: { narrative: "La formación no encajó con tus turnos. Abandonaste a mitad, con la sensación de haber perdido otra oportunidad.", stats: { happiness: -2 }, psychology: { stress: 4 } } } },
            { id: "empleo_modesto", label: "Aceptar un empleo modesto", description: "Estabilidad imperfecta, salario bajo y la posibilidad de reconstruir desde ahí.", outcomes: { success: { narrative: "Aceptaste un trabajo que no te hacía ilusión. Pagaba facturas y te devolvió una rutina. Desde ahí pudiste mirar más lejos.", stats: { happiness: -1, knowledge: 1 }, employment: "employed", contractQuality: 45, flags: ["segunda_oportunidad"] } } },
            { id: "microempresa", label: "Abrir un comercio local de productos cotidianos", description: "Menos capital, menos promesas y un riesgo medido.", cost: { shareOfGdp: 0.12 }, check: { type: "trabajo", base: 40 }, outcomes: { success: { narrative: "Empezaste con lo justo: un local compartido, una página web y clientes del barrio. No era una gran empresa, pero era tuya.", stats: { knowledge: 3, happiness: 2 }, businessStart: { kind: "comercio", name: "Segundo comienzo" }, flags: ["segunda_oportunidad"] }, failure: { narrative: "El pequeño negocio no llegó a cubrir gastos. Cerraste antes de que la deuda creciera y aprendiste una lección cara.", stats: { happiness: -3 }, psychology: { stress: 6 }, flags: ["negocio_quebrado"] } } },
        ],
    },

    {
        id: "compra_vivienda",
        title: "Una casa, un contrato y una deuda",
        description: "El precio de la vivienda es alto y las opciones no son equivalentes. Pagar al contado te deja sin colchón; la hipoteca ata ingresos durante años; alquilar protege tu movilidad. La decisión cambia tu patrimonio y tu margen de riesgo.",
        contextNote: "El coste real depende del país, del barrio y del tipo de interés. Los importes son una estimación del modelo, no una oferta bancaria.",
        category: "vivienda",
        priority: "major",
        minAge: 25,
        maxAge: 55,
        once: true,
        weight: 2.5,
        requirements: { employment: ["employed", "self-employed"] },
        options: [
            { id: "comprar_contado", label: "Comprar al contado", description: "Usar tus ahorros para no deber intereses. Te quedas con menos liquidez para una emergencia.", cost: { shareOfGdp: 2.4 }, outcomes: { success: { narrative: "Firmaste ante notario y recibiste las llaves. La cuenta quedó mucho más ligera, pero nadie podía subirte el alquiler.", stats: { happiness: 5, health: 1 }, housingDelta: 26, expenseModifierDelta: -0.06, flags: ["casa_propia", "vivienda_pagada"], milestone: "Compró una vivienda al contado" } } },
            { id: "comprar_hipoteca", label: "Comprar con hipoteca a 25 años", description: "Una entrada ahora y una cuota mensual durante décadas. Los intereses dependen del país.", cost: { shareOfGdp: 0.45 }, outcomes: { success: { narrative: "El banco aprobó la hipoteca después de revisar cada recibo. Tener una casa propia también significaba deber una parte de ella al banco.", stats: { happiness: 4, health: 1 }, housingDelta: 22, expenseModifierDelta: 0.05, mortgage: { amountRule: { shareOfGdp: 1.9 }, annualInterestRate: 0.045, years: 25, label: "Hipoteca de vivienda" }, creditDelta: -4, flags: ["casa_propia", "hipoteca"], milestone: "Compró una vivienda con hipoteca" } } },
            { id: "alquilar_vivienda", label: "Alquilar y mantener flexibilidad", description: "Una renta mensual y menos patrimonio, pero puedes mudarte si el barrio o el trabajo cambian.", cost: { shareOfAnnualIncome: 0.2 }, outcomes: { success: { narrative: "Firmaste un alquiler y decoraste lo justo. No era una inversión, pero era un lugar desde el que podías decidir irte.", stats: { happiness: 2, relationships: 1 }, housingDelta: 9, expenseModifierDelta: 0.04, flags: ["alquiler"], milestone: "Empezó a alquilar una vivienda" } } },
            { id: "posponer_compra", label: "Esperar y seguir ahorrando", description: "No comprar todavía. El alquiler o la familia siguen siendo tu red, y el ahorro crece.", outcomes: { success: { narrative: "No firmaste nada. Cada mes que pasaba tu colchón crecía, aunque el precio de la vivienda también podía hacerlo.", stats: { happiness: -1, knowledge: 1 }, flags: ["ahorro_vivienda"] } } },
        ],
    },


    {
        id: "descanso_digital",
        title: "La pantalla antes de dormir",
        description: "El día termina, pero la cabeza sigue encendida. El móvil ofrece una última cosa que mirar y roba horas de descanso sin que apenas lo notes.",
        contextNote: "Una decisión pequeña y repetible. No cambia una vida por sí sola, pero acumula hábitos.",
        category: "salud", priority: "focus", minAge: 14, maxAge: 85, once: false, weight: 1.15,
        options: [
            { id: "dejar_pantalla", label: "Dejar el móvil fuera del dormitorio", description: "Cortar el estímulo de raíz y aceptar el aburrimiento de la primera noche.", outcomes: { success: { narrative: "La primera noche fue extraña. La segunda, más larga. Al cabo de una semana dormías antes y te despertabas con menos prisa.", stats: { health: 2, happiness: 1 }, psychology: { stress: -2, lifeSatisfaction: 1 }, flags: ["descanso_digital"] } } },
            { id: "limitar_pantalla", label: "Poner un límite y cumplirlo", description: "Usar un temporizador y dejar de desplazarte cuando suene.", outcomes: { success: { narrative: "El límite sonó y lo respetaste a medias. No fue perfecto, pero dormiste un poco más y dejaste de revisar lo que no podías cambiar.", stats: { health: 1, happiness: 1 }, psychology: { stress: -1 } } } },
            { id: "seguir_pantalla", label: "Seguir como hasta ahora", description: "No cambiar nada y confiar en que el cuerpo se adapte.", outcomes: { success: { narrative: "Seguiste mirando el techo y la pantalla. El cansancio se hizo costumbre, que no es lo mismo que descansar.", stats: { health: -1 }, psychology: { stress: 1, burnout: 1 } } } },
        ],
    },
    {
        id: "mascota_compania",
        title: "Un animal en casa",
        description: "Una mascota cambia la rutina, el gasto y la compañía. Adoptar no es un capricho: implica cuidar a alguien que dependerá de ti.",
        category: "familia", priority: "major", minAge: 20, maxAge: 78, once: true, weight: 1.2,
        options: [
            { id: "adoptar_mascota", label: "Adoptar un animal", description: "Asumir el coste y el tiempo de cuidarlo durante años.", cost: { shareOfAnnualIncome: 0.025 }, outcomes: { success: { narrative: "La casa tuvo un ritmo distinto desde el primer día. Había pelo en el sofá, paseos a horas fijas y una compañía que no pedía explicaciones.", stats: { relationships: 4, happiness: 3, health: 1 }, expenseModifierDelta: 0.012, flags: ["mascota"] } } },
            { id: "acoger_mascota", label: "Acoger temporalmente", description: "Ayudar sin comprometerte para toda la vida del animal.", outcomes: { success: { narrative: "Acogiste a un animal durante unas semanas. Cuando se fue, la casa quedó demasiado quieta y supiste que volverías a hacerlo.", stats: { relationships: 2, happiness: 2 }, flags: ["mascota_acogida"] } } },
            { id: "no_mascota", label: "Decidir que no es el momento", description: "Reconocer que el deseo no encaja con tu tiempo y tu dinero.", outcomes: { success: { narrative: "Dijiste que no por ahora. No era falta de cariño, sino de margen. La idea quedó guardada para otra etapa.", stats: { happiness: -1, knowledge: 1 }, psychology: { selfEsteem: 1 } } } },
        ],
    },
    {
        id: "invertir_ahorros",
        title: "Qué hacer con los ahorros",
        description: "Tienes algo de dinero parado. La inflación, el miedo y las promesas de rentabilidad compiten por tu atención. Ninguna opción está libre de riesgo.",
        contextNote: "Los rendimientos son parámetros de simulación, no una recomendación financiera. La opción de mantener liquidez también es una decisión.",
        category: "dinero", priority: "major", minAge: 25, maxAge: 70, once: true, weight: 1.35,
        requirements: { minMoney: 3000 },
        options: [
            { id: "invertir_bolsa", label: "Invertir una parte en bolsa", description: "Buscar más rentabilidad aceptando que el valor puede caer.", cost: { shareOfAnnualIncome: 0.1 }, check: { type: "riesgo", base: 43 }, outcomes: { success: { narrative: "El mercado subió más de lo que esperabas. No te volviste rico, pero aprendiste que el riesgo también puede pagar.", stats: { happiness: 2, knowledge: 2 }, moneyDelta: 900, flags: ["inversor"] }, failure: { narrative: "La caída llegó antes que la paciencia. Vendiste para no perder más y convertiste una pérdida en una lección.", stats: { happiness: -2, knowledge: 2 }, psychology: { stress: 3 }, flags: ["inversor"] } } },
            { id: "deposito_plazo", label: "Aceptar un depósito a plazo fijo", description: "Menos rentabilidad, más previsibilidad. El dinero queda atado un tiempo.", outcomes: { success: { narrative: "Firmaste un depósito modesto. No era emocionante, pero sabías exactamente cuánto tendrías al final.", stats: { happiness: 1, knowledge: 1 }, moneyDelta: 180, flags: ["ahorro_plazo"] } } },
            { id: "fondo_emergencia", label: "Construir un fondo de emergencia", description: "Mantener el dinero disponible para una enfermedad, un despido o una mudanza.", outcomes: { success: { narrative: "No buscaste rentabilidad. Buscaste dormir. El fondo creció despacio y te dio algo que ninguna inversión garantiza: margen para decir no.", stats: { happiness: 2, knowledge: 1 }, expenseModifierDelta: -0.01, psychology: { stress: -2 }, flags: ["fondo_emergencia"] } } },
            { id: "dejar_ahorro", label: "Dejar el dinero quieto por ahora", description: "No decidir todavía y seguir observando.", outcomes: { success: { narrative: "Dejaste el dinero donde estaba. No ganaste nada, pero tampoco perdiste. La decisión seguía esperando.", stats: { happiness: -1, knowledge: 1 }, psychology: { stress: 1 } } } },
        ],
    },
    {
        id: "mejorar_hogar",
        title: "La casa pide un cambio",
        description: "El espacio ya no encaja con tu vida. Reformar, mudarte o esperar cuesta dinero de formas distintas, y no siempre se ve en la cuenta bancaria.",
        contextNote: "El coste se expresa como proporción de tus ingresos. La vivienda también afecta a tu salud, tus relaciones y tu estabilidad.",
        category: "vivienda", priority: "major", minAge: 24, maxAge: 82, once: true, weight: 1.15,
        options: [
            { id: "reformar_casa", label: "Reformar lo que ya tienes", description: "Invertir en el espacio sin cambiar de barrio.", cost: { shareOfAnnualIncome: 0.08 }, outcomes: { success: { narrative: "La obra duró más de lo previsto y dejó polvo en todas partes. Cuando terminó, la casa parecía respirar mejor y tú también.", stats: { happiness: 3, health: 1 }, housingDelta: 9, expenseModifierDelta: 0.01, flags: ["hogar_mejorado"] } } },
            { id: "mudarse_mejor", label: "Mudarte a un lugar que encaje", description: "Cambiar de casa y de rutina, con el coste de la mudanza.", cost: { shareOfAnnualIncome: 0.12 }, outcomes: { success: { narrative: "Empaquetaste una vida en cajas. La nueva casa no resolvió tus problemas, pero te dio un lugar distinto desde el que mirarlos.", stats: { happiness: 3, relationships: 1 }, housingDelta: 12, expenseModifierDelta: 0.02, flags: ["mudanza_reciente"] } } },
            { id: "esperar_casa", label: "Esperar y aprovechar lo que hay", description: "No gastar ahora y arreglar solo lo urgente.", outcomes: { success: { narrative: "Pintaste una pared y cambiaste una lámpara. No era la casa que querías, pero dejó de ser la casa que te agotaba.", stats: { happiness: 1, knowledge: 1 }, housingDelta: 3, flags: ["ahorro_vivienda"] } } },
        ],
    },
    {
        id: "voluntariado_local",
        title: "Dar parte de tu tiempo",
        description: "Alguien del barrio pide ayuda. No hay sueldo ni garantía de que cambie nada grande, pero tu tiempo puede importar a otra persona.",
        category: "ocio", priority: "focus", minAge: 16, maxAge: 88, once: false, weight: 0.9,
        options: [
            { id: "voluntariado_tiempo", label: "Comprometerte unas horas al mes", description: "Elegir una causa concreta y aparecer cuando toca.", outcomes: { success: { narrative: "Durante unas horas dejaste de pensar en tu propia lista. Ayudaste y descubriste que la reciprocidad no siempre se cobra.", stats: { relationships: 3, happiness: 2, knowledge: 1 }, psychology: { lifeSatisfaction: 2 }, flags: ["voluntariado"] } } },
            { id: "voluntariado_dinero", label: "Donar lo que puedas", description: "Aportar dinero sin comprometer tu tiempo.", cost: { shareOfAnnualIncome: 0.01 }, outcomes: { success: { narrative: "Donaste una cantidad modesta. No sabías exactamente a quién llegaría, pero decidiste que no todo tenía que volver a ti.", stats: { happiness: 2, relationships: 1 }, flags: ["donante"] } } },
            { id: "voluntariado_no", label: "No comprometerte ahora", description: "Reconocer que no tienes margen y decirlo sin culpa.", outcomes: { success: { narrative: "Dijiste que no. No fue indiferencia: era el límite real de tu semana. Aun así, la petición se quedó contigo un rato.", stats: { happiness: -1, knowledge: 1 }, psychology: { stress: -1 } } } },
        ],
    },
    {
        id: "aprender_arte",
        title: "Aprender algo que no da dinero",
        description: "Una clase, un taller o una práctica sin objetivo profesional. El tiempo invertido no aparece en el currículum, pero puede cambiar cómo te miras.",
        category: "educacion", priority: "focus", minAge: 8, maxAge: 90, once: false, weight: 0.85,
        options: [
            { id: "taller_arte", label: "Apuntarte a un taller", description: "Pagar por aprender con otras personas y una rutina semanal.", cost: { shareOfGdp: 0.015 }, outcomes: { success: { narrative: "Las primeras clases fueron torpes. Luego dejaste de compararte y empezaste a mirar lo que hacías. El taller se convirtió en una parte de la semana que defendías.", stats: { knowledge: 3, happiness: 3, relationships: 1 }, psychology: { stress: -2, selfEsteem: 2 }, flags: ["arte"] } } },
            { id: "arte_autodidacta", label: "Aprender por tu cuenta", description: "Practicar sin horario ni coste, con más riesgo de abandonar.", outcomes: { success: { narrative: "Empezaste con tutoriales y materiales baratos. No tenías profesor, pero tenías curiosidad, que a veces basta para empezar.", stats: { knowledge: 2, happiness: 2 }, psychology: { selfEsteem: 1 }, flags: ["arte"] } } },
            { id: "no_arte", label: "Dejarlo para otro momento", description: "No añadir otra cosa a una vida ya llena.", outcomes: { success: { narrative: "Guardaste el folleto en un cajón. No era una renuncia definitiva, aunque el cajón se fue llenando de cosas parecidas.", stats: { happiness: -1 }, psychology: { stress: -1 } } } },
        ],
    },
    {
        id: "testamento",
        title: "Pensar en lo que dejas",
        description: "Una casa, unos ahorros, objetos y una historia. Ponerlo por escrito no adelanta el final, pero evita que otros tengan que adivinarlo.",
        category: "dinero", priority: "major", minAge: 58, maxAge: 105, once: true, weight: 1.2,
        options: [
            { id: "firmar_testamento", label: "Firmar un testamento", description: "Ordenar la herencia y dejar instrucciones claras.", cost: { shareOfGdp: 0.008 }, outcomes: { success: { narrative: "Firmaste el documento con una mezcla de incomodidad y alivio. No desaparecía nada, pero dejabas de cargar a los demás con una pregunta sin respuesta.", stats: { happiness: 2, knowledge: 1 }, psychology: { stress: -2, lifeSatisfaction: 1 }, flags: ["testamento"] } } },
            { id: "hablar_herencia", label: "Hablar con la familia primero", description: "Explicar lo que quieres y escuchar lo que esperan.", outcomes: { success: { narrative: "La conversación fue incómoda y necesaria. No todos estuvieron de acuerdo, pero al menos dejaron de imaginar cosas distintas.", stats: { relationships: 3, happiness: 1 }, psychology: { stress: -1 }, flags: ["herencia_hablada"] } } },
            { id: "posponer_testamento", label: "No pensar en eso todavía", description: "Aplazar una decisión que no apetece.", outcomes: { success: { narrative: "Lo dejaste para otro año. La vida siguió y la pregunta también, esperando en un cajón.", stats: { happiness: -1 }, psychology: { stress: 2 } } } },
        ],
    },
    {
        id: "limites_trabajo",
        title: "El trabajo invade la vida",
        description: "Las horas se alargan, los mensajes llegan fuera de horario y nadie ha llamado a eso un problema. Puedes poner límites, aceptar el ritmo o cambiar de rumbo.",
        contextNote: "La calidad del empleo no se mide solo por el salario. Los derechos y el margen de negociación dependen del país y del sector.",
        category: "trabajo", priority: "major", minAge: 20, maxAge: 66, once: true, weight: 1.45,
        requirements: { employment: ["employed", "self-employed"] },
        options: [
            { id: "poner_limites", label: "Poner límites y hablar con tu responsable", description: "Defender horarios y carga de trabajo sin abandonar el empleo.", check: { type: "trabajo", base: 52 }, outcomes: { success: { narrative: "La conversación no fue cómoda, pero tu responsable entendió parte del problema. No cambió todo, y aun así dejaste de normalizar el desbordamiento.", stats: { health: 3, happiness: 3, relationships: 1 }, psychology: { stress: -4, selfEsteem: 3 }, incomeModifierDelta: -0.02, flags: ["limites_laborales"] }, failure: { narrative: "Te escucharon y no hicieron nada. Seguiste cargando con el trabajo, ahora con la certeza de que el problema no era tuyo.", stats: { happiness: -1 }, psychology: { stress: 3 }, flags: ["limites_laborales"] } } },
            { id: "aceptar_horas", label: "Aceptar las horas extra", description: "Ganar más ahora a costa de tu salud y tu tiempo.", outcomes: { success: { narrative: "El dinero extra llegó y también las noches frente al ordenador. Aprendiste que un aumento puede comprarse con algo que no se recupera.", stats: { health: -3, happiness: -2, knowledge: 1 }, incomeModifierDelta: 0.06, psychology: { stress: 4, burnout: 3 }, flags: ["horas_extra"] } } },
            { id: "cambiar_trabajo", label: "Buscar otro trabajo", description: "Preparar una salida sin quemar el puente actual.", check: { type: "trabajo", base: 43 }, outcomes: { success: { narrative: "Enviaste currículums sin decírselo a nadie. La entrevista salió bien y cambiaste de aires con una mezcla de miedo y alivio.", stats: { happiness: 3, knowledge: 1 }, employment: "employed", incomeModifierDelta: 0.05, contractQuality: 65, flags: ["cambio_laboral"] }, failure: { narrative: "No encontraste nada mejor en el plazo que necesitabas. Seguiste en el mismo puesto, con la carpeta de búsqueda abierta.", stats: { happiness: -2 }, psychology: { stress: 2 } } } },
            { id: "apoyo_sindical", label: "Buscar apoyo colectivo", description: "Hablar con compañeros o sindicato en lugar de cargar solo.", check: { type: "social", base: 46 }, outcomes: { success: { narrative: "Descubriste que no estabas solo. El grupo puso el problema sobre la mesa y consiguió pequeñas mejoras que una persona sola no habría logrado.", stats: { relationships: 3, happiness: 2, health: 1 }, psychology: { stress: -3, selfEsteem: 2 }, flags: ["apoyo_sindical"] }, failure: { narrative: "La reunión se llenó de silencios. Algunos compañeros tenían demasiado miedo y el problema siguió igual.", stats: { relationships: 1, happiness: -1 }, psychology: { stress: 2 } } } },
        ],
    },

    {
        id: "reconstruir_empleo",
        title: "Reconstruir el sustento",
        description:
            "La situación laboral se ha roto y las facturas siguen llegando. No hay una solución limpia: puedes aceptar algo modesto, volver a formarte, apoyarte en los tuyos o reducir el ritmo antes de romperte.",
        contextNote: "Una mala racha no borra la partida. Esta decisión aparece cuando el empleo o los ingresos se han deteriorado y ofrece caminos reales, no un premio inesperado.",
        category: "trabajo",
        priority: "recovery",
        minAge: 20,
        maxAge: 64,
        // Repetible: una persona puede intentar reconstruir su empleo más de una vez.
        weight: 12,
        requirements: { employment: ["unemployed", "disabled"] },
        options: [
            {
                id: "empleo_temporal",
                label: "Aceptar un empleo temporal",
                description: "Un sueldo modesto y poca estabilidad. Pagar facturas también es reconstruir.",
                outcomes: {
                    success: {
                        narrative:
                            "Aceptaste un trabajo que no era el que imaginabas. El sueldo era bajo y el horario incómodo, pero volviste a tener una rutina y una forma de pagar lo esencial.",
                        stats: { happiness: -1, health: -1 },
                        employment: "employed",
                        occupation: "Empleo temporal",
                        contractQuality: 35,
                        incomeModifierDelta: 0.03,
                        psychology: { stress: -2 },
                        flags: ["segunda_oportunidad", "empleo_temporal"],
                    },
                },
            },
            {
                id: "formacion_publica",
                label: "Volver a formarte con apoyo público",
                description: "Estudiar mientras buscas trabajo. El fruto llega más tarde y no está garantizado.",
                check: { type: "educacion", base: 58 },
                outcomes: {
                    success: {
                        narrative:
                            "Encontraste un programa público y volviste a estudiar con más canas y menos tiempo. No cambió tu vida de inmediato, pero abrió una puerta que antes estaba cerrada.",
                        stats: { knowledge: 5, happiness: 1 },
                        education: "vocational",
                        psychology: { selfEsteem: 2, stress: -2 },
                        flags: ["segunda_oportunidad", "formacion_publica"],
                        schedule: [
                            {
                                inYears: 2,
                                narrative: "La formación empezó a notarse en las entrevistas y en el tipo de trabajo que podías aceptar.",
                                incomeModifierDelta: 0.05,
                            },
                        ],
                    },
                    failure: {
                        narrative:
                            "El curso no encajó con tus turnos y lo dejaste a medias. No fue una condena, pero sí una oportunidad que no llegó a cuajar.",
                        stats: { happiness: -2 },
                        psychology: { stress: 3 },
                        flags: ["formacion_publica"],
                    },
                },
            },
            {
                id: "microemprender",
                label: "Montar algo pequeño",
                description: "Un negocio de barrio, con poco capital y un riesgo medido.",
                cost: { shareOfGdp: 0.08 },
                check: { type: "trabajo", base: 42 },
                outcomes: {
                    success: {
                        narrative:
                            "Empezaste con lo justo: un local compartido, una página sencilla y clientes del barrio. No era una gran empresa, pero era tuya y te devolvió el control.",
                        stats: { knowledge: 3, happiness: 2 },
                        businessStart: { kind: "comercio", name: "Segundo comienzo" },
                        psychology: { selfEsteem: 3 },
                        flags: ["segunda_oportunidad"],
                    },
                    failure: {
                        narrative:
                            "El negocio no llegó a cubrir gastos. Cerraste antes de que la deuda creciera y aprendiste una lección cara.",
                        stats: { happiness: -3 },
                        psychology: { stress: 5 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "red_familiar",
                label: "Apoyarte en la familia",
                description: "Pedir ayuda sin convertirla en una deuda eterna. Cuesta orgullo y cambia la relación.",
                outcomes: {
                    success: {
                        narrative:
                            "La familia no resolvió el problema, pero te dio un lugar desde el que respirar. Pusiste límites claros y convertiste la ayuda en un puente, no en una dependencia.",
                        stats: { relationships: 3, happiness: 1 },
                        psychology: { stress: -3, selfEsteem: 1 },
                        flags: ["red_familiar", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "pausa_salud",
                label: "Bajar el ritmo antes de romperte",
                description: "Reducir ingresos y presión para recuperar salud y cabeza.",
                outcomes: {
                    success: {
                        narrative:
                            "Dijiste que no a una carrera que te estaba desgastando. Perdiste ingresos y quizá prestigio; recuperaste horas de sueño y la sensación de habitar tu propia vida.",
                        stats: { health: 4, happiness: 2 },
                        incomeModifierDelta: -0.03,
                        psychology: { stress: -4, burnout: -3 },
                        flags: ["segunda_oportunidad"],
                    },
                },
            },
        ],
    },
    {
        id: "renegociar_deudas",
        title: "La deuda no desaparece",
        description:
            "Los pagos se han vuelto una sombra en cada decisión. Puedes renegociar, ordenar el presupuesto, vender algo o aceptar que necesitas ayuda antes de que el problema crezca.",
        contextNote: "No hay condonaciones mágicas. La salida consiste en reducir presión y recuperar margen con decisiones que arrastran costes reales.",
        category: "dinero",
        priority: "recovery",
        minAge: 20,
        maxAge: 80,
        once: true,
        weight: 12,
        options: [
            {
                id: "negociar_plazos",
                label: "Renegociar plazos e intereses",
                description: "Hablar con los acreedores y aceptar un plan más largo.",
                check: { type: "social", base: 52 },
                outcomes: {
                    success: {
                        narrative:
                            "La llamada fue incómoda. Conseguiste alargar los plazos y bajar la cuota mensual. No debías menos, pero volviste a poder respirar a fin de mes.",
                        stats: { happiness: 1 },
                        expenseModifierDelta: -0.025,
                        psychology: { stress: -4 },
                        flags: ["deuda_negociada", "segunda_oportunidad"],
                    },
                    failure: {
                        narrative:
                            "Te ofrecieron condiciones casi idénticas y una letra pequeña que no podías aceptar. La deuda siguió igual, pero al menos conocías mejor el terreno.",
                        stats: { knowledge: 2, happiness: -1 },
                        psychology: { stress: 2 },
                    },
                },
            },
            {
                id: "ordenar_presupuesto",
                label: "Ordenar el presupuesto",
                description: "Separar lo esencial, recortar lo prescindible y hacer un plan realista.",
                outcomes: {
                    success: {
                        narrative:
                            "Pusiste las cuentas sobre la mesa. No apareció dinero, pero dejaste de gastar a ciegas y recuperaste cierta sensación de control.",
                        stats: { knowledge: 3 },
                        expenseModifierDelta: -0.03,
                        psychology: { stress: -3, selfEsteem: 2 },
                        flags: ["plan_financiero", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "vender_algo",
                label: "Vender algo que no necesitas",
                description: "Desprenderte de un objeto o de una parte de tu nivel de vida.",
                outcomes: {
                    success: {
                        narrative:
                            "Vendiste cosas que ocupaban espacio y también un poco de tu identidad anterior. No era una fortuna, pero alivió el mes y te enseñó qué era prescindible.",
                        stats: { happiness: -1, knowledge: 1 },
                        expenseModifierDelta: -0.02,
                        housingDelta: -1,
                        psychology: { stress: -2 },
                        flags: ["segunda_oportunidad"],
                    },
                },
            },
            {
                id: "apoyo_comunitario",
                label: "Buscar apoyo comunitario",
                description: "Acudir a una entidad, parroquia o red del barrio sin ocultar la situación.",
                outcomes: {
                    success: {
                        narrative:
                            "Pediste ayuda a una red local. No te sacó de la deuda, pero te dio comida, asesoría y personas con las que dejar de sentir que el problema era una vergüenza privada.",
                        stats: { relationships: 3, happiness: 1 },
                        expenseModifierDelta: -0.015,
                        psychology: { stress: -3 },
                        flags: ["apoyo_comunitario", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "sostener_sin_cambios",
                label: "Sostener el plan actual",
                description: "Seguir pagando como hasta ahora y esperar tiempos mejores.",
                outcomes: {
                    success: {
                        narrative:
                            "Seguiste pagando sin cambiar nada. La deuda no empeoró, pero el margen siguió siendo estrecho y la preocupación se quedó otro año.",
                        stats: { happiness: -1 },
                        psychology: { stress: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "recuperar_salud",
        title: "El cuerpo pide una pausa",
        description:
            "La salud ha bajado lo suficiente como para notarse en la vida diaria. Atenderte, reducir el ritmo o esperar son decisiones distintas, y ninguna sale gratis.",
        contextNote: "La atención sanitaria depende del país y de tus recursos. Esta decisión no diagnostica ni sustituye a un profesional: modela las consecuencias de buscar o no ayuda.",
        category: "salud",
        priority: "recovery",
        minAge: 20,
        maxAge: 90,
        // Repetible: la salud puede necesitar más de una salida a lo largo de la vida.
        weight: 12,
        requirements: { maxHealth: 55 },
        options: [
            {
                id: "consulta_publica",
                label: "Acudir a la sanidad pública",
                description: "Pedir cita, hacerte pruebas y seguir las indicaciones.",
                outcomes: {
                    success: {
                        narrative:
                            "La espera fue larga, pero te atendieron. No había una solución instantánea; había un plan, revisiones y la sensación de no estar improvisando tu salud.",
                        stats: { health: 6, happiness: 1 },
                        psychology: { stress: -2 },
                        flags: ["salud_atendida", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "reducir_ritmo",
                label: "Reducir el ritmo de trabajo",
                description: "Ganar menos para dormir, moverte y recuperarte.",
                outcomes: {
                    success: {
                        narrative:
                            "Bajaste horas y ingresos. Al principio parecía una derrota; después empezaste a dormir mejor y a notar que el cuerpo dejaba de pedir permiso para todo.",
                        stats: { health: 5, happiness: 2 },
                        incomeModifierDelta: -0.04,
                        psychology: { stress: -4, burnout: -3 },
                        flags: ["segunda_oportunidad"],
                    },
                },
            },
            {
                id: "tratamiento_privado",
                label: "Pagar un tratamiento privado",
                description: "Acceso más rápido y seguimiento, con un coste que puede desestabilizar el presupuesto.",
                cost: { shareOfAnnualIncome: 0.1 },
                outcomes: {
                    success: {
                        narrative:
                            "Pagaste por adelantar el diagnóstico y el tratamiento. La salud mejoró, y también la preocupación por cómo pagarías el próximo mes.",
                        stats: { health: 9, happiness: 2 },
                        expenseModifierDelta: 0.01,
                        psychology: { stress: -2 },
                        flags: ["tratamiento_privado", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "cuidados_familia",
                label: "Pedir apoyo a los tuyos",
                description: "Compartir el problema y aceptar compañía, tiempo o ayuda concreta.",
                outcomes: {
                    success: {
                        narrative:
                            "No querías ser una carga, pero dejaste que te acompañaran. La salud no se resolvió sola; la soledad tampoco empeoró el cuadro.",
                        stats: { relationships: 3, health: 4, happiness: 1 },
                        psychology: { stress: -3 },
                        flags: ["red_familiar", "segunda_oportunidad"],
                    },
                },
            },
            {
                id: "seguir_adelante",
                label: "Seguir adelante sin cambiar nada",
                description: "Esperar a que pase, aunque el cuerpo ya esté avisando.",
                outcomes: {
                    success: {
                        narrative:
                            "Seguiste como si nada. El cuerpo no envió una factura inmediata, pero dejó una señal que ya no podías ignorar.",
                        stats: { health: -3, happiness: -1 },
                        psychology: { stress: 3 },
                    },
                },
            },
        ],
    },

];

export const DECISIONS: DecisionDefinition[] = [
    ...BASE_DECISIONS,
    ...EXPANDED_DECISIONS,
    ...LIFE_PATHS,
    ...CHILDHOOD_PATHS,
    ...OPENING_DECISIONS,
    ...RELATIONSHIP_SCENARIOS,
    ...CAREER_OPENINGS,
    ...CAREER_SCENARIOS,
    ...FAMILY_SCENARIOS,
    ...HOUSEHOLD_DECISIONS,
    ...COMPANY_DECISIONS,
    ...PROPERTY_DECISIONS,
    ...EDUCATION_PATH,
    ...RELATIONSHIP_CRISES,
    ...COUNTRY_PATHS,
    ...MOBILITY_DECISIONS,
    ...WEALTH_DECISIONS,
];

for(const d of DECISIONS)if(d.id.startsWith("child_")||d.id==="company_trade_profile")d.monthlyOnly=true;

const decisionById = new Map(DECISIONS.map((decision) => [decision.id, decision]));

export function getDecision(id: string): DecisionDefinition | undefined {
    return decisionById.get(id);
}

export function decisionsForEvent(eventId: string): DecisionDefinition[] {
    return DECISIONS.filter((decision) => decision.eventId === eventId);
}
