import type { DecisionDefinition } from "./decision-types.js";

/**
 * Ampliación v5 del catálogo.
 *
 * Estas decisiones cubren tres huecos que el jugador notaba: la vida de una
 * empresa, las transferencias familiares y los proyectos migratorios. Los
 * efectos están declarados como datos; el motor no contiene condicionales
 * específicos para cada historia.
 */
export const EXPANDED_DECISIONS: DecisionDefinition[] = [
    {
        id: "empresa_crecer",
        title: "La empresa ya no cabe en el local",
        description: "La demanda supera lo que puedes atender. Abrir otra sede, reforzar lo que ya funciona o esperar cambia tus costes fijos y tu margen de error.",
        contextNote: "Crecer no es solo vender más: también es asumir alquileres, personal y una estructura más difícil de deshacer.",
        category: "trabajo",
        priority: "major",
        minAge: 24,
        maxAge: 70,
        cooldownYears: 6,
        weight: 4.2,
        requirements: { hasBusiness: true },
        options: [
            {
                id: "abrir_segunda_sede",
                label: "Abrir una segunda sede",
                description: "Duplicar espacio y capacidad. La inversión es alta y el retorno no está garantizado.",
                cost: { shareOfAnnualIncome: 0.22 },
                check: { type: "trabajo", base: 48 },
                outcomes: {
                    success: {
                        narrative: "La segunda sede abrió con más gastos de los previstos, pero también con una cartera de clientes que la primera no podía atender. El negocio dejó de depender de una sola dirección.",
                        stats: { happiness: 3, knowledge: 2 },
                        businessChange: { revenueDeltaPct: 0.22, costDelta: 400, employeesDelta: 1, reputationDelta: 4 },
                        milestone: "Abrió una segunda sede",
                        flags: ["empresa_expandida"],
                    },
                    failure: {
                        narrative: "El local nuevo quedó medio vacío durante meses. La caja aguantó, pero aprendiste que crecer antes de tener demanda estable es una forma cara de comprar problemas.",
                        stats: { happiness: -3, health: -1 },
                        psychology: { stress: 7 },
                        businessChange: { costDelta: 900, reputationDelta: -2 },
                    },
                },
            },
            {
                id: "reforzar_actual",
                label: "Reforzar el negocio actual",
                description: "Invertir en el producto y en los clientes que ya tienes, sin abrir otro frente.",
                cost: { shareOfAnnualIncome: 0.07 },
                outcomes: {
                    success: {
                        narrative: "No te expandiste. Mejoraste lo que ya vendías y cuidaste a los clientes que sostenían la caja. El crecimiento fue más lento, pero también más controlable.",
                        stats: { happiness: 2, knowledge: 1 },
                        businessChange: { revenueDeltaPct: 0.09, reputationDelta: 6 },
                    },
                },
            },
            {
                id: "esperar_crecimiento",
                label: "Esperar a que la caja sea más sólida",
                description: "No invertir todavía y acumular un colchón antes de arriesgar.",
                outcomes: {
                    success: {
                        narrative: "Dejaste pasar la oportunidad de crecer ahora. El negocio siguió igual, con menos riesgo y menos ambición. A veces esa es la decisión que mantiene vivo un proyecto.",
                        stats: { happiness: 1 },
                        psychology: { stress: -2 },
                        businessChange: { reputationDelta: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "empresa_talento",
        title: "El equipo que sostiene la empresa",
        description: "Una persona clave amenaza con irse y otra pide más responsabilidad. Pagar más, formar a alguien o repartir incentivos cambia el negocio y las relaciones.",
        contextNote: "Una empresa pequeña depende de pocas personas. Perder a una puede costar más que subirle el salario.",
        category: "trabajo",
        priority: "major",
        minAge: 26,
        maxAge: 68,
        cooldownYears: 5,
        weight: 3.4,
        requirements: { hasBusiness: true },
        options: [
            {
                id: "subir_salario_clave",
                label: "Subir el salario a la persona clave",
                description: "Retener talento cuesta dinero, pero reemplazarlo también.",
                cost: { shareOfAnnualIncome: 0.05 },
                outcomes: {
                    success: {
                        narrative: "La persona se quedó y el equipo notó que el esfuerzo tenía un precio justo. La nómina subió; la rotación bajó.",
                        stats: { relationships: 3, happiness: 2 },
                        businessChange: { costDelta: 250, reputationDelta: 5 },
                        flags: ["equipo_estable"],
                    },
                },
            },
            {
                id: "formar_equipo",
                label: "Invertir en formación",
                description: "Enseñar a varias personas para depender menos de una sola.",
                cost: { shareOfAnnualIncome: 0.035 },
                check: { type: "educacion", base: 58 },
                outcomes: {
                    success: {
                        narrative: "La formación mejoró el trabajo diario y repartió el conocimiento. Nadie era imprescindible, y eso también era una forma de cuidar el negocio.",
                        stats: { knowledge: 3, relationships: 2 },
                        businessChange: { revenueDeltaPct: 0.06, reputationDelta: 3, employeesDelta: 1 },
                    },
                    failure: {
                        narrative: "El curso no encajó con el ritmo del local. Parte del equipo lo terminó por obligación y la empresa recuperó poco de lo invertido.",
                        stats: { happiness: -1 },
                        businessChange: { costDelta: 180 },
                    },
                },
            },
            {
                id: "repartir_incentivos",
                label: "Repartir incentivos por resultados",
                description: "Pagar una parte variable para alinear el esfuerzo con los beneficios.",
                check: { type: "social", base: 54 },
                outcomes: {
                    success: {
                        narrative: "El equipo entendió el acuerdo y respondió. La empresa ganó margen y las personas sintieron que su trabajo se veía.",
                        stats: { relationships: 3, happiness: 2 },
                        businessChange: { revenueDeltaPct: 0.1, reputationDelta: 3 },
                        flags: ["incentivos_equipo"],
                    },
                    failure: {
                        narrative: "El reparto se percibió como injusto. Algunos compararon cifras y el clima se enfrió más de lo que la caja podía compensar.",
                        stats: { relationships: -3, happiness: -1 },
                        businessChange: { reputationDelta: -3 },
                    },
                },
            },
        ],
    },
    {
        id: "empresa_exportar",
        title: "Una oportunidad fuera del mercado local",
        description: "Un comprador extranjero o una plataforma internacional quiere tus servicios. Exportar exige adaptarse a otro idioma, otra legislación y otros plazos.",
        category: "trabajo",
        priority: "major",
        minAge: 28,
        maxAge: 68,
        cooldownYears: 7,
        weight: 3.2,
        requirements: { hasBusiness: true, minEducation: "secondary" },
        options: [
            {
                id: "exportar_contrato",
                label: "Firmar el contrato internacional",
                description: "Un ingreso mayor, con costes de adaptación y riesgo de impago.",
                cost: { shareOfAnnualIncome: 0.08 },
                check: { type: "trabajo", base: 46 },
                outcomes: {
                    success: {
                        narrative: "El primer pedido internacional salió bien. Tuviste que aprender horarios, divisas y una forma distinta de negociar. La empresa dejó de tener un solo mercado.",
                        stats: { knowledge: 4, happiness: 2 },
                        businessChange: { revenueDeltaPct: 0.26, reputationDelta: 6, employeesDelta: 1 },
                        milestone: "Internacionalizó su negocio",
                        flags: ["empresa_exportadora"],
                    },
                    failure: {
                        narrative: "El comprador retrasó el pago y las condiciones cambiaron a mitad del encargo. El contrato no salvó la caja, pero enseñó qué cláusulas faltaban.",
                        stats: { knowledge: 2, happiness: -2 },
                        psychology: { stress: 6 },
                        businessChange: { costDelta: 700, reputationDelta: -2 },
                    },
                },
            },
            {
                id: "probar_pequeno",
                label: "Probar con un pedido pequeño",
                description: "Testear el mercado sin comprometer toda la estructura.",
                cost: { shareOfAnnualIncome: 0.025 },
                outcomes: {
                    success: {
                        narrative: "Empezaste con un encargo modesto. No cambió la empresa, pero validó que había demanda y que podías responder sin desmontar lo que ya funcionaba.",
                        stats: { knowledge: 2, happiness: 1 },
                        businessChange: { revenueDeltaPct: 0.07, reputationDelta: 2 },
                    },
                },
            },
            {
                id: "rechazar_exportar",
                label: "Consolidar el mercado local",
                description: "Decir no a la expansión y proteger la calidad y la estabilidad.",
                outcomes: {
                    success: {
                        narrative: "Rechazaste el contrato. La empresa siguió siendo pequeña y controlable, con clientes que conocías por su nombre.",
                        stats: { happiness: 1 },
                        businessChange: { reputationDelta: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "empresa_impuestos",
        title: "La inspección que llega sin avisar",
        description: "La administración revisa las cuentas del negocio. Regularizar, recurrir o retrasar la respuesta tiene consecuencias distintas para la caja y la reputación.",
        category: "dinero",
        priority: "major",
        minAge: 26,
        maxAge: 72,
        cooldownYears: 8,
        weight: 2.7,
        requirements: { hasBusiness: true },
        options: [
            {
                id: "regularizar_todo",
                label: "Regularizar y pagar lo pendiente",
                description: "Cerrar el problema con una factura incómoda.",
                cost: { shareOfAnnualIncome: 0.06 },
                outcomes: {
                    success: {
                        narrative: "Pagaste la regularización y ordenaste la contabilidad. Dolía, pero la empresa dejó de vivir con una amenaza encima.",
                        stats: { happiness: -1, knowledge: 2 },
                        businessChange: { reputationDelta: 4 },
                        flags: ["cuentas_regulares"],
                    },
                },
            },
            {
                id: "recurrir_sancion",
                label: "Recurrir con asesoría",
                description: "Defender tu interpretación con ayuda profesional.",
                cost: { shareOfAnnualIncome: 0.03 },
                check: { type: "educacion", base: 46 },
                outcomes: {
                    success: {
                        narrative: "La asesoría encontró un error en la liquidación. La sanción se redujo y la empresa aprendió a documentar mejor sus operaciones.",
                        stats: { knowledge: 3, happiness: 2 },
                        businessChange: { reputationDelta: 2 },
                    },
                    failure: {
                        narrative: "El recurso no prosperó y añadió intereses. Lo que parecía una defensa razonable se convirtió en una factura más grande.",
                        stats: { happiness: -2 },
                        psychology: { stress: 6 },
                        businessChange: { costDelta: 500, reputationDelta: -3 },
                    },
                },
            },
            {
                id: "retrasar_respuesta",
                label: "Retrasar la respuesta",
                description: "Ganar tiempo con la esperanza de que el expediente se enfríe.",
                check: { type: "riesgo", base: 34 },
                outcomes: {
                    success: {
                        narrative: "El expediente se quedó en un cajón. La empresa respiró, aunque la incertidumbre siguió formando parte de cada cierre de mes.",
                        stats: { happiness: -1 },
                        psychology: { stress: 4 },
                        flags: ["inspeccion_pendiente"],
                    },
                    failure: {
                        narrative: "El retraso se interpretó como obstrucción. La sanción creció y la reputación del negocio quedó manchada.",
                        stats: { happiness: -3, relationships: -2 },
                        businessChange: { costDelta: 900, reputationDelta: -8 },
                        flags: ["sancion_empresa"],
                    },
                },
            },
        ],
    },
    {
        id: "empresa_venta",
        title: "Vender la empresa o seguir",
        description: "Un comprador ofrece una cifra por el negocio. Puedes vender, buscar un socio o seguir cargando con la responsabilidad.",
        category: "trabajo",
        priority: "major",
        minAge: 38,
        maxAge: 78,
        once: true,
        weight: 2.1,
        requirements: { hasBusiness: true },
        options: [
            {
                id: "vender_empresa",
                label: "Vender y cerrar una etapa",
                description: "Convertir años de trabajo en liquidez y perder el control del negocio.",
                outcomes: {
                    success: {
                        narrative: "Firmaste la venta y entregaste las llaves. El dinero no compensó todos los años, pero te dio una libertad que no tenías.",
                        stats: { happiness: 4, health: 1 },
                        moneyDelta: 18000,
                        endBusiness: { reason: "Venta del negocio", salePrice: 18000 },
                        milestone: "Vendió su empresa",
                        flags: ["empresa_vendida"],
                    },
                },
            },
            {
                id: "buscar_socio_empresa",
                label: "Buscar un socio para crecer",
                description: "Ceder parte del control y compartir el riesgo.",
                check: { type: "social", base: 48 },
                outcomes: {
                    success: {
                        narrative: "El socio aportó capital y contactos. Tuviste que compartir decisiones que antes eran solo tuyas, pero la empresa ganó aire.",
                        stats: { relationships: 2, happiness: 1 },
                        businessChange: { revenueDeltaPct: 0.12, reputationDelta: 4 },
                        flags: ["socio_empresa"],
                    },
                    failure: {
                        narrative: "Las negociaciones se alargaron y el candidato se echó atrás. La empresa siguió sola, más cerca del límite.",
                        stats: { happiness: -2 },
                        psychology: { stress: 5 },
                    },
                },
            },
            {
                id: "seguir_empresa",
                label: "Seguir al mando",
                description: "Mantener el control y apostar por el negocio que construiste.",
                outcomes: {
                    success: {
                        narrative: "Rechazaste la oferta. El negocio siguió siendo tuyo, con sus noches largas y sus pequeñas victorias.",
                        stats: { happiness: 2, health: -1 },
                        businessChange: { reputationDelta: 3 },
                        psychology: { stress: 3, selfEsteem: 3 },
                    },
                },
            },
        ],
    },
    {
        id: "hijo_boda",
        title: "Tu hijo quiere casarse",
        description: "La boda se acerca y la familia espera una contribución. Pagar una celebración grande, ayudar con lo esencial o decir que no cambia el vínculo y la cuenta.",
        contextNote: "El dinero familiar no es solo dinero: también expresa expectativas, favoritismos y límites.",
        category: "familia",
        priority: "major",
        minAge: 38,
        maxAge: 80,
        once: true,
        weight: 3,
        requirements: { childrenMin: 1, adultChildrenMin:1 },
        options: [
            {
                id: "pagar_boda_grande",
                label: "Pagar una boda a lo grande",
                description: "Asumir gran parte del coste para que la familia tenga su celebración.",
                cost: { shareOfAnnualIncome: 0.12 },
                outcomes: {
                    success: {
                        narrative: "La celebración salió como se esperaba. Hubo abrazos, fotografías y una factura que tardó meses en dejar de doler. Tu hijo lo recordó, y también lo recordó tu cuenta.",
                        stats: { happiness: 5, relationships: 5 },
                        psychology: { lifeSatisfaction: 3 },
                        milestone: "Celebró la boda de su hijo",
                        flags: ["boda_financiada"],
                    },
                },
            },
            {
                id: "ayudar_boda_esencial",
                label: "Ayudar con lo esencial",
                description: "Contribuir a los trámites y la comida sin financiar un gran evento.",
                cost: { shareOfAnnualIncome: 0.035 },
                outcomes: {
                    success: {
                        narrative: "No pagaste la boda de las revistas, pero cubriste lo importante. Tu hijo entendió el límite y la relación salió más honesta que si hubieras fingido tener más dinero.",
                        stats: { happiness: 2, relationships: 3 },
                        flags: ["boda_apoyo"],
                    },
                },
            },
            {
                id: "no_pagar_boda",
                label: "Decir que no puedes",
                description: "Reconocer tu situación sin endeudarte por una celebración.",
                outcomes: {
                    success: {
                        narrative: "Dijiste que no. Hubo silencio y alguna frase que dolió. La boda se hizo más pequeña, y tú conservaste la posibilidad de ayudar en una urgencia real.",
                        stats: { happiness: -1, relationships: -3, knowledge: 1 },
                        psychology: { stress: 3 },
                        flags: ["limite_familiar"],
                    },
                },
            },
        ],
    },
    {
        id: "apoyo_padres",
        title: "Tus padres necesitan ayuda",
        description: "La salud o la economía de tus padres se deteriora. Puedes aportar dinero cada mes, cuidarles tú o pedir que otros hermanos se impliquen.",
        contextNote: "El cuidado de los mayores suele recaer en quien tiene más disponibilidad, no necesariamente en quien puede pagarlo.",
        category: "familia",
        priority: "major",
        minAge: 25,
        maxAge: 72,
        cooldownYears: 4,
        weight: 3.1,
        requirements: { parentsAlive: true },
        options: [
            {
                id: "apoyo_mensual_padres",
                label: "Aportar dinero cada mes",
                description: "Ayudar con gastos médicos, vivienda o comida sin cambiar tu vida diaria.",
                cost: { shareOfAnnualIncome: 0.05 },
                outcomes: {
                    success: {
                        narrative: "Enviaste una ayuda estable. No resolvió todos sus problemas, pero les permitió afrontar el mes con menos miedo. Tú también aprendiste a poner una cifra a la responsabilidad.",
                        stats: { relationships: 5, happiness: 2 },
                        psychology: { stress: 2, lifeSatisfaction: 2 },
                        flags: ["apoyo_padres"],
                    },
                },
            },
            {
                id: "cuidar_padres_casa",
                label: "Cuidarles en tu casa",
                description: "Compartir espacio y tiempo. La relación se fortalece y también se desgasta.",
                outcomes: {
                    success: {
                        narrative: "Tu casa cambió de ritmo. Hubo citas, medicinas y conversaciones que antes no tenías. Cuidar también te enseñó cosas que no sabías de tus padres ni de ti.",
                        stats: { relationships: 7, health: -2, happiness: 2 },
                        expenseModifierDelta: 0.03,
                        psychology: { stress: 6, lifeSatisfaction: 4 },
                        flags: ["cuidador_familiar"],
                    },
                },
            },
            {
                id: "repartir_cuidados",
                label: "Repartir la responsabilidad",
                description: "Hablar con la familia y organizar turnos, dinero y límites.",
                check: { type: "social", base: 52 },
                outcomes: {
                    success: {
                        narrative: "La conversación fue incómoda, pero salió un reparto. No todos cumplieron igual, y aun así dejar de cargar sola con todo cambió la relación.",
                        stats: { relationships: 3, happiness: 2, knowledge: 2 },
                        psychology: { stress: -4 },
                        flags: ["cuidados_repartidos"],
                    },
                    failure: {
                        narrative: "La reunión terminó con reproches. Asumiste más de lo que podías y la relación con parte de la familia se enfrió.",
                        stats: { relationships: -2, happiness: -2, health: -1 },
                        psychology: { stress: 7 },
                    },
                },
            },
        ],
    },
    {
        id: "donacion_personal",
        title: "Dar parte de lo que tienes",
        description: "Una causa cercana pide ayuda. Puedes donar dinero, ofrecer tiempo o reconocer que ahora no puedes sostener otra responsabilidad.",
        category: "ocio",
        priority: "major",
        minAge: 25,
        maxAge: 88,
        cooldownYears: 3,
        weight: 1.7,
        requirements: { minMoney: 1200 },
        options: [
            {
                id: "donar_parte",
                label: "Donar una parte de tus ahorros",
                description: "Aportar dinero a una causa concreta y renunciar a parte de tu colchón.",
                cost: { shareOfAnnualIncome: 0.04 },
                outcomes: {
                    success: {
                        narrative: "La donación llegó a un proyecto que conocías. No cambió tu vida material, pero te recordó que tu dinero también podía servir para algo más que protegerte.",
                        stats: { happiness: 3, relationships: 2 },
                        psychology: { lifeSatisfaction: 2 },
                        flags: ["donante"],
                    },
                },
            },
            {
                id: "donar_tiempo_familia",
                label: "Donar tiempo en lugar de dinero",
                description: "Comprometerte con una causa sin tocar la cuenta bancaria.",
                outcomes: {
                    success: {
                        narrative: "Dedicaste horas a una organización del barrio. No era dinero, pero el tiempo también tiene un coste y una recompensa.",
                        stats: { relationships: 4, happiness: 2, health: 1 },
                        flags: ["voluntariado"],
                    },
                },
            },
            {
                id: "no_donar_ahora",
                label: "No donar por ahora",
                description: "Proteger tu estabilidad y decir que no.",
                outcomes: {
                    success: {
                        narrative: "Dijiste que no. No fue indiferencia: era el límite real de tu situación. La petición se quedó contigo un rato de todos modos.",
                        stats: { happiness: -1, knowledge: 1 },
                        psychology: { stress: -1 },
                    },
                },
            },
        ],
    },
    {
        id: "nietos_educacion",
        title: "Un futuro para tus nietos",
        description: "Tu nieto quiere estudiar y la familia no llega. Pagar la matrícula, abrir una cuenta de ahorro o ayudar de otra forma cambia su futuro y tu patrimonio.",
        category: "familia",
        priority: "major",
        minAge: 52,
        maxAge: 92,
        cooldownYears: 5,
        weight: 2.5,
        requirements: { grandchildrenMin: 1 },
        options: [
            {
                id: "pagar_estudios_nieto",
                label: "Pagar sus estudios",
                description: "Cubrir la matrícula y parte del material.",
                cost: { shareOfAnnualIncome: 0.07 },
                outcomes: {
                    success: {
                        narrative: "Pagaste la matrícula y acompañaste el primer día. No sabes si terminará la carrera, pero sí que no tendrá que abandonarla por una factura.",
                        stats: { happiness: 5, relationships: 5, knowledge: 2 },
                        psychology: { lifeSatisfaction: 4 },
                        milestone: "Financió los estudios de un nieto",
                        flags: ["legado_educativo"],
                    },
                },
            },
            {
                id: "ahorro_nietos",
                label: "Abrir un ahorro a su nombre",
                description: "Guardar una cantidad para que decida más adelante.",
                cost: { shareOfAnnualIncome: 0.04 },
                outcomes: {
                    success: {
                        narrative: "Abriste una cuenta con su nombre. No era una solución inmediata, pero dejaste una puerta abierta para cuando tuviera que decidir.",
                        stats: { happiness: 3, relationships: 3 },
                        psychology: { lifeSatisfaction: 2 },
                        flags: ["ahorro_nietos"],
                    },
                },
            },
            {
                id: "apoyo_no_dinero_nietos",
                label: "Acompañar sin pagar",
                description: "Ayudar con tiempo, tareas y consejo dentro de tus posibilidades.",
                outcomes: {
                    success: {
                        narrative: "No tenías dinero para la matrícula, pero sí tardes para explicar deberes y una casa abierta. Tu nieto recordó eso más que la cantidad que no pudiste dar.",
                        stats: { relationships: 4, happiness: 3, knowledge: 1 },
                    },
                },
            },
        ],
    },
    {
        id: "familiar_enfermo",
        title: "La enfermedad entra en casa",
        description: "Un familiar cercano recibe un diagnóstico que exige tiempo y dinero. Puedes pagar el mejor tratamiento disponible, repartir cuidados o reconocer que no puedes cubrirlo todo.",
        category: "salud",
        priority: "major",
        minAge: 28,
        maxAge: 88,
        cooldownYears: 7,
        weight: 2.6,
        options: [
            {
                id: "pagar_tratamiento_familiar",
                label: "Pagar el tratamiento",
                description: "Usar tus ahorros para acelerar la atención.",
                cost: { shareOfAnnualIncome: 0.1 },
                outcomes: {
                    success: {
                        narrative: "El tratamiento llegó antes. No compró una garantía, pero sí tiempo y menos dolor. La cuenta quedó más ligera y la familia supo que no estabas mirando hacia otro lado.",
                        stats: { relationships: 6, happiness: 2 },
                        psychology: { lifeSatisfaction: 3, stress: 4 },
                        flags: ["apoyo_familiar_salud"],
                    },
                },
            },
            {
                id: "cuidar_familiar",
                label: "Organizar los cuidados",
                description: "Acompañar, coordinar citas y compartir el peso con otros.",
                outcomes: {
                    success: {
                        narrative: "Repartiste el cuidado en turnos. Hubo días de agotamiento y conversaciones que nunca habríais tenido sin la enfermedad. La relación se volvió más real.",
                        stats: { relationships: 5, health: -2, happiness: 1 },
                        psychology: { stress: 5, lifeSatisfaction: 3 },
                        flags: ["cuidador_familiar"],
                    },
                },
            },
            {
                id: "limites_cuidado",
                label: "Reconocer tus límites",
                description: "Ayudar sin abandonar tu trabajo y tu salud.",
                outcomes: {
                    success: {
                        narrative: "No pudiste estar en todo. Ayudaste con lo que tenías y pediste ayuda para el resto. Algunos te juzgaron; tú aprendiste que cuidar también requiere límites.",
                        stats: { relationships: -1, health: 1, happiness: -1 },
                        psychology: { stress: 2, selfEsteem: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "mascota_veterinario",
        title: "Tu mascota no está bien",
        description: "El animal que vive contigo ha dejado de comer y el veterinario ofrece un tratamiento caro. Puedes pagarlo, intentar cuidados básicos o esperar.",
        category: "salud",
        priority: "major",
        minAge: 18,
        maxAge: 94,
        cooldownYears: 3,
        weight: 2.2,
        requirements: { hasPet: true },
        options: [
            {
                id: "tratamiento_mascota",
                label: "Pagar el tratamiento completo",
                description: "Asumir el coste aunque duela en la cuenta.",
                cost: { shareOfAnnualIncome: 0.035 },
                outcomes: {
                    success: {
                        narrative: "El tratamiento funcionó y la mascota volvió a levantarse al oírte llegar. Pagaste una factura que no esperabas, pero no tuviste que decidir cuánto valía su compañía.",
                        stats: { happiness: 4, relationships: 3 },
                        flags: ["mascota_cuidada"],
                    },
                },
            },
            {
                id: "cuidados_basicos_mascota",
                label: "Cuidados básicos y seguimiento",
                description: "Hacer lo posible sin el tratamiento más caro.",
                outcomes: {
                    success: {
                        narrative: "Elegiste un cuidado más modesto. La mascota mejoró despacio y tú aprendiste a mirar cada día como una prórroga.",
                        stats: { happiness: 1, relationships: 1 },
                        psychology: { stress: 2 },
                    },
                },
            },
            {
                id: "despedir_mascota",
                label: "Acompañarla al final",
                description: "Evitar un encarnizamiento terapéutico y despedirla.",
                outcomes: {
                    success: {
                        narrative: "El veterinario habló con claridad. Estuviste con ella hasta el final. La casa quedó demasiado quieta, pero no la dejaste sola.",
                        stats: { happiness: -4, relationships: 2 },
                        psychology: { grief: 8 },
                    },
                },
            },
        ],
    },
    {
        id: "visa_calificada",
        title: "Una visa por cualificación",
        description: "Un país busca profesionales de tu sector. La visa exige títulos, idioma y una oferta verificable. Puedes preparar la solicitud, aceptar un destino menos deseado o quedarte.",
        category: "migracion",
        priority: "major",
        minAge: 22,
        maxAge: 48,
        once: true,
        weight: 2.3,
        requirements: { minEducation: "vocational", notCountry: ["DEU", "FRA", "SWE"] },
        options: [
            {
                id: "visa_alemania",
                label: "Solicitar la visa alemana",
                description: "Un mercado estable, trámites exigentes y un idioma que cuesta.",
                cost: { destinationCountry: "DEU" },
                check: { type: "educacion", base: 50 },
                outcomes: {
                    success: {
                        narrative: "La visa llegó después de meses de papeles. El primer trabajo fue más modesto que el anuncio, pero te permitió quedarte y construir desde ahí.",
                        stats: { knowledge: 4, happiness: 2, relationships: -2 },
                        migrateTo: { countryCode: "DEU", location: "Hamburgo" },
                        employment: "employed",
                        contractQuality: 68,
                        flags: ["migrante", "visa_calificada"],
                        milestone: "Obtuvo una visa cualificada",
                    },
                    failure: {
                        narrative: "La documentación no acreditó lo suficiente. Perdiste tasas y meses, pero conservaste el expediente para intentarlo de otra forma.",
                        stats: { happiness: -3, knowledge: 2 },
                        psychology: { stress: 6 },
                        flags: ["visado_rechazado"],
                    },
                },
            },
            {
                id: "visa_francia",
                label: "Probar el sistema francés",
                description: "Un proceso por puntos que premia idioma y experiencia.",
                cost: { destinationCountry: "FRA" },
                check: { type: "educacion", base: 44 },
                outcomes: {
                    success: {
                        narrative: "El sistema de puntos te dio una invitación. Llegaste con un contrato y una ciudad que aún no sabías pronunciar. La adaptación fue más lenta que la burocracia.",
                        stats: { knowledge: 5, happiness: 1, relationships: -3 },
                        migrateTo: { countryCode: "FRA", location: "Lyon" },
                        employment: "employed",
                        flags: ["migrante", "visa_calificada"],
                    },
                    failure: {
                        narrative: "La puntuación no alcanzó el corte. La oportunidad se cerró sin drama, con una carta que explicaba el motivo y una sensación difícil de tragar.",
                        stats: { happiness: -2, knowledge: 1 },
                        flags: ["visado_rechazado"],
                    },
                },
            },
            {
                id: "quedarse_visa",
                label: "Quedarte y mejorar el perfil",
                description: "Estudiar idiomas, certificar experiencia y volver a intentarlo.",
                outcomes: {
                    success: {
                        narrative: "No solicitaste la visa todavía. Invertiste en idioma y certificaciones. La puerta no estaba cerrada; solo necesitabas mejores llaves.",
                        stats: { knowledge: 4, happiness: 1 },
                        flags: ["migracion_preparada"],
                    },
                },
            },
        ],
    },
    {
        id: "reagrupacion_familiar",
        title: "Reunir a la familia en otro país",
        description: "Vives fuera y tu pareja o tus hijos siguen en el país de origen. La reagrupación exige ingresos, vivienda y paciencia administrativa.",
        category: "migracion",
        priority: "major",
        minAge: 25,
        maxAge: 65,
        cooldownYears: 4,
        weight: 2.4,
        requirements: { migrated: true, hasPartner: true, minIncome: 1 },
        options: [
            {
                id: "solicitar_reagrupacion",
                label: "Iniciar la reagrupación",
                description: "Pagar trámites y demostrar estabilidad económica.",
                cost: { shareOfAnnualIncome: 0.06 },
                check: { type: "trabajo", base: 52 },
                outcomes: {
                    success: {
                        narrative: "La reagrupación salió adelante. La casa volvió a tener las voces que faltaban, y también nuevos roces que la distancia había escondido.",
                        stats: { happiness: 6, relationships: 6 },
                        psychology: { stress: -4, lifeSatisfaction: 4 },
                        flags: ["familia_reagrupada"],
                        milestone: "Reagrupó a su familia",
                    },
                    failure: {
                        narrative: "El expediente se atascó por un requisito que no esperabas. La distancia se volvió más cara, económica y emocionalmente.",
                        stats: { happiness: -4, relationships: -2 },
                        psychology: { stress: 8 },
                        flags: ["reagrupacion_pendiente"],
                    },
                },
            },
            {
                id: "visitas_frecuentes",
                label: "Mantener la familia a distancia",
                description: "Viajar cuando se pueda y sostener el vínculo sin moverla.",
                cost: { shareOfAnnualIncome: 0.035 },
                outcomes: {
                    success: {
                        narrative: "Elegiste la distancia con visitas. No era una vida cómoda, pero mantuviste el vínculo con viajes, llamadas y una cuenta que nunca dejaba de moverse.",
                        stats: { relationships: 2, happiness: 1, health: -1 },
                        psychology: { stress: 3 },
                    },
                },
            },
            {
                id: "volver_para_reagrupar",
                label: "Volver al país de origen",
                description: "Renunciar a la vida construida fuera para estar con la familia.",
                outcomes: {
                    success: {
                        narrative: "Volviste. La familia estaba completa y el proyecto migratorio quedó a medias. A veces reconstruir también es elegir qué no quieres perder.",
                        stats: { relationships: 5, happiness: 2, knowledge: 1 },
                        returnToBirthCountry: true,
                        flags: ["retorno_familiar"],
                    },
                },
            },
        ],
    },
    {
        id: "retorno_raices",
        title: "La llamada del país de origen",
        description: "Después de años fuera, el país donde naciste vuelve a aparecer en tus planes. Puedes volver, quedarte o construir una vida entre dos lugares.",
        category: "migracion",
        priority: "major",
        minAge: 35,
        maxAge: 78,
        once: true,
        weight: 2,
        requirements: { migrated: true },
        options: [
            {
                id: "volver_pais_origen",
                label: "Volver definitivamente",
                description: "Regresar con los ahorros y la experiencia acumulada.",
                outcomes: {
                    success: {
                        narrative: "Volviste con más años y menos certezas. La ciudad había cambiado, y tú también. Aun así, reconociste el olor de la calle y supiste que una parte de ti nunca se había ido.",
                        stats: { happiness: 4, relationships: 4, knowledge: 2 },
                        returnToBirthCountry: true,
                        flags: ["retorno_pais"],
                        milestone: "Volvió a su país de origen",
                    },
                },
            },
            {
                id: "quedarse_pais_adoptivo",
                label: "Quedarte donde construiste tu vida",
                description: "Elegir el país que te dio trabajo y amistades.",
                outcomes: {
                    success: {
                        narrative: "Decidiste quedarte. La distancia con el origen se volvió una forma de pertenencia distinta, con llamadas y visitas que ya no prometían volver.",
                        stats: { happiness: 2, relationships: 1 },
                        psychology: { lifeSatisfaction: 2 },
                    },
                },
            },
            {
                id: "vida_entre_dos_paises",
                label: "Vivir entre los dos países",
                description: "Repartir el año y asumir el coste de no estar nunca del todo.",
                cost: { shareOfAnnualIncome: 0.04 },
                outcomes: {
                    success: {
                        narrative: "Pasaste temporadas en cada lugar. No fue una vida estable, pero sí una forma de no renunciar a ninguna de tus dos historias.",
                        stats: { happiness: 3, knowledge: 2, relationships: 2, health: -1 },
                        flags: ["vida_transnacional"],
                    },
                },
            },
        ],
    },
    {
        id: "visa_apelacion",
        title: "El visado que no salió",
        description: "Tu solicitud fue rechazada. Puedes recurrir con asesoría, cambiar de destino o aceptar que esa puerta se cerró.",
        category: "migracion",
        priority: "major",
        minAge: 22,
        maxAge: 52,
        once: true,
        weight: 2.3,
        requirements: { flagsAny: ["visado_rechazado", "estafa_migratoria", "migracion_fallida"] },
        options: [
            {
                id: "recurrir_visado",
                label: "Recurrir con un abogado",
                description: "Revisar el expediente y pagar una segunda opinión.",
                cost: { shareOfAnnualIncome: 0.04 },
                check: { type: "educacion", base: 46 },
                outcomes: {
                    success: {
                        narrative: "El recurso encontró un error administrativo. El visado salió, más tarde y con más cicatrices, pero salió.",
                        stats: { knowledge: 3, happiness: 4 },
                        flags: ["visado_aprobado", "migrante"],
                        milestone: "Ganó una apelación de visado",
                    },
                    failure: {
                        narrative: "La apelación confirmó la negativa. Gastaste dinero y tiempo, y aprendiste que no todas las puertas se abren con insistencia.",
                        stats: { happiness: -3, knowledge: 2 },
                        psychology: { stress: 6 },
                        flags: ["visado_definitivo_rechazado"],
                    },
                },
            },
            {
                id: "cambiar_destino",
                label: "Buscar otro país",
                description: "Rehacer el plan con un destino que tenga requisitos distintos.",
                cost: { shareOfAnnualIncome: 0.02 },
                outcomes: {
                    success: {
                        narrative: "Cambiaste de destino. El nuevo proceso era más lento, pero encajaba mejor con tu perfil. La migración dejó de ser un solo billete.",
                        stats: { knowledge: 3, happiness: 2 },
                        flags: ["migracion_preparada"],
                    },
                },
            },
            {
                id: "aceptar_rechazo",
                label: "Quedarte y reconstruir aquí",
                description: "Cerrar el capítulo migratorio sin convertirlo en fracaso personal.",
                outcomes: {
                    success: {
                        narrative: "Aceptaste la negativa. No fue rendirse: fue dejar de gastar energía en una puerta que no dependía de ti. Empezaste a mirar lo que sí podías construir aquí.",
                        stats: { happiness: 2, knowledge: 2, relationships: 1 },
                        psychology: { stress: -3, selfEsteem: 2 },
                    },
                },
            },
        ],
    },
    {
        id: "enfermedad_seria",
        title: "Un diagnóstico que cambia el año",
        description: "La salud se rompe y el tratamiento exige decisiones difíciles. Puedes pagar la atención más rápida, seguir el sistema público o reducir el ritmo para cuidarte.",
        category: "salud",
        priority: "major",
        minAge: 25,
        maxAge: 92,
        cooldownYears: 4,
        weight: 3,
        requirements: { maxHealth: 58 },
        options: [
            {
                id: "tratamiento_intensivo",
                label: "Buscar el tratamiento más completo",
                description: "Pagar por rapidez y seguimiento aunque la cuenta se resienta.",
                cost: { shareOfAnnualIncome: 0.12 },
                check: { type: "salud", base: 56 },
                outcomes: {
                    success: {
                        narrative: "El tratamiento llegó a tiempo. La recuperación fue lenta y cara, pero volviste a tener energía para cosas que habías dejado de hacer.",
                        stats: { health: 12, happiness: 3 },
                        psychology: { stress: -3, lifeSatisfaction: 2 },
                        flags: ["tratamiento_intensivo"],
                    },
                    failure: {
                        narrative: "El tratamiento no dio el resultado esperado y la deuda sanitaria se quedó. Aprendiste que pagar más no siempre compra certeza.",
                        stats: { health: 2, happiness: -3 },
                        psychology: { stress: 7 },
                        flags: ["deuda_medica"],
                    },
                },
            },
            {
                id: "seguir_sanidad_publica",
                label: "Seguir el circuito público",
                description: "Aceptar listas de espera y ajustar la vida al ritmo del sistema.",
                outcomes: {
                    success: {
                        narrative: "La sanidad pública te atendió con demora. No fue rápido, pero no te dejó solo ni te obligó a elegir entre salud y alquiler.",
                        stats: { health: 7, happiness: 1, knowledge: 1 },
                        psychology: { stress: 2 },
                    },
                },
            },
            {
                id: "reducir_ritmo_salud",
                label: "Reducir el ritmo y cuidarte",
                description: "Bajar ingresos para recuperar salud y tiempo.",
                outcomes: {
                    success: {
                        narrative: "Pediste una reducción de jornada. El sueldo bajó y el cuerpo empezó a responder. No era la vida que habías planeado, pero era una que podías sostener.",
                        stats: { health: 8, happiness: 2 },
                        incomeModifierDelta: -0.08,
                        psychology: { stress: -5, lifeSatisfaction: 2 },
                        flags: ["ritmo_reducido"],
                    },
                },
            },
        ],
    },
    {
        id: "salud_mental_adulta",
        title: "La cabeza también tiene facturas",
        description: "El cansancio emocional afecta al trabajo y a las relaciones. Puedes buscar terapia, apoyarte en la comunidad o seguir funcionando hasta que el cuerpo diga basta.",
        category: "salud",
        priority: "major",
        minAge: 24,
        maxAge: 82,
        cooldownYears: 3,
        weight: 2.6,
        requirements: { maxHappiness: 58 },
        options: [
            {
                id: "terapia_privada",
                label: "Empezar terapia",
                description: "Pagar un espacio semanal para entender lo que te pasa.",
                cost: { shareOfAnnualIncome: 0.04 },
                outcomes: {
                    success: {
                        narrative: "La terapia no borró el problema, pero te dio un lugar donde mirarlo sin culpa. Aprendiste a pedir ayuda antes de llegar al límite.",
                        stats: { happiness: 7, health: 3, relationships: 2 },
                        psychology: { stress: -7, selfEsteem: 4, resilience: 3 },
                        flags: ["terapia"],
                    },
                },
            },
            {
                id: "apoyo_comunitario",
                label: "Buscar apoyo en la comunidad",
                description: "Un grupo, una amistad o una red de cuidado mutuo.",
                outcomes: {
                    success: {
                        narrative: "Encontraste a personas que estaban pasando por algo parecido. No tenías una solución, pero dejaste de sentir que el problema era solo tuyo.",
                        stats: { happiness: 4, relationships: 4 },
                        psychology: { stress: -4, grief: -2 },
                        flags: ["red_apoyo"],
                    },
                },
            },
            {
                id: "seguir_sin_ayuda",
                label: "Seguir como puedes",
                description: "No parar y confiar en que el tiempo lo resuelva.",
                outcomes: {
                    success: {
                        narrative: "Seguiste funcionando. La vida no se detuvo, pero el cansancio se acumuló en el cuerpo y en las relaciones que más te importaban.",
                        stats: { health: -3, happiness: -2, relationships: -2 },
                        psychology: { stress: 6, burnout: 5 },
                    },
                },
            },
        ],
    },
    {
        id: "legado_testamento",
        title: "Lo que dejas cuando ya no estés",
        description: "La vejez pone sobre la mesa la herencia, los cuidados y los deseos. Puedes repartir el patrimonio, dejar una causa escrita o evitar hablar del tema.",
        category: "familia",
        priority: "major",
        minAge: 60,
        maxAge: 98,
        once: true,
        weight: 2.2,
        options: [
            {
                id: "testamento_familiar",
                label: "Repartir el patrimonio con claridad",
                description: "Firmar un testamento y hablar con la familia.",
                outcomes: {
                    success: {
                        narrative: "Reuniste a la familia y explicaste tus decisiones. No todos estuvieron de acuerdo, pero nadie tuvo que adivinar qué querías después.",
                        stats: { relationships: 4, happiness: 3 },
                        psychology: { lifeSatisfaction: 4, stress: -2 },
                        flags: ["testamento_firmado"],
                    },
                },
            },
            {
                id: "legado_solidario",
                label: "Dejar parte a una causa",
                description: "Destinar una parte del patrimonio a algo que te importa.",
                outcomes: {
                    success: {
                        narrative: "Dejaste una parte a una causa que te acompañó durante años. La familia no lo entendió del todo, pero tú sabías que aquello también era tu legado.",
                        stats: { happiness: 4, relationships: -1 },
                        psychology: { lifeSatisfaction: 5 },
                        flags: ["legado_solidario"],
                    },
                },
            },
            {
                id: "evitar_testamento",
                label: "No hablar del testamento",
                description: "Dejar que el futuro se resuelva sin prepararlo.",
                outcomes: {
                    success: {
                        narrative: "Evitaste el tema. La familia no supo qué querías y los papeles quedaron para después. No hubo una conversación incómoda, pero dejaste otra.",
                        stats: { relationships: -2, happiness: -1 },
                        psychology: { stress: 2 },
                        flags: ["testamento_pendiente"],
                    },
                },
            },
        ],
    },
    {
        id: "reconstruir_negocio",
        title: "Volver a emprender después de caer",
        description: "El negocio anterior no funcionó, pero sigues teniendo experiencia, contactos y una idea. Puedes volver con algo más pequeño, comprar una franquicia o elegir un empleo estable.",
        category: "trabajo",
        priority: "major",
        minAge: 28,
        maxAge: 62,
        once: true,
        weight: 3,
        requirements: { hasBusiness: false, flagsAny: ["negocio_quebrado", "negocio_cerrado"], minMoney: 1 },
        options: [
            {
                id: "reemprender_pequeno",
                label: "Empezar de nuevo en pequeño",
                description: "Menos capital, menos promesas y la experiencia de la caída.",
                cost: { shareOfGdp: 0.12 },
                check: { type: "trabajo", base: 50 },
                outcomes: {
                    success: {
                        narrative: "Volviste a abrir con lo justo. Sabías qué errores no querías repetir y a quién no volverías a contratar. El negocio creció más despacio y con más cicatrices.",
                        stats: { knowledge: 3, happiness: 3 },
                        businessStart: { kind: "comercio", name: "Segundo comienzo" },
                        flags: ["reemprendedor"],
                        milestone: "Volvió a emprender",
                    },
                    failure: {
                        narrative: "El nuevo negocio no encontró clientes suficientes. Cerraste antes de que la deuda creciera y decidiste que esta vez no habría una tercera apuesta inmediata.",
                        stats: { happiness: -3 },
                        psychology: { stress: 7 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "comprar_franquicia",
                label: "Comprar una franquicia",
                description: "Un modelo probado con un coste de entrada alto.",
                cost: { shareOfGdp: 0.35 },
                check: { type: "trabajo", base: 54 },
                outcomes: {
                    success: {
                        narrative: "La franquicia trajo clientes desde el primer mes. No era tu marca, pero sí un sistema que funcionaba y un ingreso que no dependía de improvisar.",
                        stats: { knowledge: 2, happiness: 2 },
                        businessStart: { kind: "gastronomia", name: "Franquicia de barrio" },
                        flags: ["franquiciado"],
                    },
                    failure: {
                        narrative: "La franquicia prometía más de lo que daba. El canon y los proveedores se comieron el margen, y el negocio se quedó sin aire.",
                        stats: { happiness: -4 },
                        psychology: { stress: 8 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "volver_empleo",
                label: "Buscar un empleo estable",
                description: "Cambiar autonomía por una nómina y una rutina predecible.",
                outcomes: {
                    success: {
                        narrative: "Volviste a trabajar por cuenta ajena. El sueldo era menor que tus mejores años de empresario, pero la nómina llegaba y podías dormir sin revisar la caja.",
                        stats: { happiness: 2, health: 3 },
                        employment: "employed",
                        contractQuality: 62,
                        flags: ["vuelta_empleo"],
                    },
                },
            },
        ],
    },
    {
        id: "cuidar_nietos",
        title: "Los nietos cambian la semana",
        description: "Tu hijo necesita ayuda con los nietos. Cuidarlos te devuelve energía y también te la quita. Pagar una guardería, cambiar tu rutina o decir que no son opciones reales.",
        category: "familia",
        priority: "major",
        minAge: 50,
        maxAge: 90,
        cooldownYears: 4,
        weight: 2.1,
        requirements: { grandchildrenMin: 1 },
        options: [
            {
                id: "cuidar_nietos_tiempo",
                label: "Cuidarlos varias tardes",
                description: "Dar tiempo y rutina sin cobrar por ello.",
                outcomes: {
                    success: {
                        narrative: "Tu semana se llenó de deberes, meriendas y voces pequeñas. Llegabas cansado y con la sensación de estar en el lugar correcto.",
                        stats: { relationships: 6, happiness: 4, health: -2 },
                        psychology: { lifeSatisfaction: 4, stress: 3 },
                        flags: ["abuelo_cuidador"],
                    },
                },
            },
            {
                id: "pagar_guarderia",
                label: "Pagar parte de la guardería",
                description: "Ayudar con dinero sin asumir el cuidado diario.",
                cost: { shareOfAnnualIncome: 0.035 },
                outcomes: {
                    success: {
                        narrative: "Pagaste parte de la guardería. No estabas en cada tarde, pero el apoyo económico permitió que la familia respirara y que tú conservaras tus rutinas.",
                        stats: { relationships: 3, happiness: 2 },
                        flags: ["apoyo_nietos"],
                    },
                },
            },
            {
                id: "poner_limites_nietos",
                label: "Poner un límite",
                description: "Reconocer que ya cuidaste y que ahora necesitas tu tiempo.",
                outcomes: {
                    success: {
                        narrative: "Dijiste que no podías con toda la semana. Hubo decepción y una conversación pendiente, pero también recuperaste horas que ya no te sobraban.",
                        stats: { relationships: -2, happiness: 1, health: 2 },
                        psychology: { selfEsteem: 2, stress: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "segundo_aliento",
        title: "Un trabajo que no esperabas",
        description: "Después de un despido o una pausa laboral, aparece una oportunidad modesta. Puedes aceptarla, formarte para algo mejor o esperar una oferta que encaje con tu trayectoria.",
        category: "trabajo",
        priority: "major",
        minAge: 32,
        maxAge: 62,
        cooldownYears: 5,
        weight: 2.7,
        requirements: { flagsAny: ["despido", "desempleo_largo", "negocio_quebrado", "vuelta_empleo"] },
        options: [
            {
                id: "aceptar_trabajo_modesto",
                label: "Aceptar y reconstruir desde ahí",
                description: "Un salario menor y una rutina que devuelve estabilidad.",
                outcomes: {
                    success: {
                        narrative: "Aceptaste un trabajo que no estaba a la altura de tu experiencia. Pagaba facturas y te devolvió una rutina. Desde ahí pudiste mirar más lejos.",
                        stats: { happiness: 1, health: 2, knowledge: 1 },
                        employment: "employed",
                        contractQuality: 52,
                        incomeModifierDelta: 0.04,
                        flags: ["reconstruccion_laboral"],
                    },
                },
            },
            {
                id: "formarse_para_mejorar",
                label: "Formarte para optar a algo mejor",
                description: "Invertir tiempo y dinero en una certificación.",
                cost: { shareOfAnnualIncome: 0.06 },
                check: { type: "educacion", base: 52 },
                outcomes: {
                    success: {
                        narrative: "La formación te devolvió una puerta. No era un título prestigioso, pero te permitió presentarte a trabajos que antes te descartaban.",
                        stats: { knowledge: 6, happiness: 2 },
                        education: "vocational",
                        incomeModifierDelta: 0.08,
                        flags: ["recualificacion"],
                    },
                    failure: {
                        narrative: "La certificación no se tradujo en una oferta. Gastaste tiempo y dinero, y tuviste que volver a aceptar lo que había.",
                        stats: { happiness: -2, knowledge: 2 },
                        psychology: { stress: 4 },
                    },
                },
            },
            {
                id: "esperar_mejor_oferta",
                label: "Esperar una oferta mejor",
                description: "No aceptar menos de lo que crees que vales.",
                check: { type: "trabajo", base: 42 },
                outcomes: {
                    success: {
                        narrative: "Esperaste y llegó una oferta mejor. El tiempo sin ingresos fue duro, pero la paciencia tuvo un resultado concreto.",
                        employment: "employed",
                        contractQuality: 72,
                        stats: { happiness: 3, knowledge: 1 },
                        incomeModifierDelta: 0.07,
                    },
                    failure: {
                        narrative: "La oferta mejor no llegó. Los meses sin ingresos erosionaron tus ahorros y tu confianza, y acabaste aceptando algo peor que lo que habías rechazado.",
                        stats: { happiness: -3, health: -1 },
                        psychology: { stress: 8 },
                        employment: "unemployed",
                    },
                },
            },
        ],
    },

    {
        id: "primer_negocio",
        title: "Una idea propia",
        description: "Tienes experiencia, contactos y una idea que podría convertirse en un negocio. También tienes una nómina o una cuenta que no siempre llega. Emprender cambia el control y el riesgo.",
        contextNote: "No hace falta una herencia para empezar: también se puede emprender con un local compartido, servicios o una tienda pequeña. El coste y el fracaso son reales.",
        category: "trabajo",
        priority: "major",
        minAge: 23,
        maxAge: 54,
        once: true,
        weight: 3.8,
        requirements: { hasBusiness: false },
        options: [
            {
                id: "abrir_negocio_local",
                label: "Abrir un negocio de barrio",
                description: "Un local pequeño, horario largo y clientes que vuelven.",
                cost: { shareOfGdp: 0.1 },
                check: { type: "trabajo", base: 48 },
                outcomes: {
                    success: {
                        narrative: "Abrir la persiana se convirtió en una rutina. Los primeros meses fueron de aprendizaje y caja corta; después llegaron los clientes que volvían.",
                        stats: { knowledge: 2, happiness: 3 },
                        businessStart: { kind: "comercio", name: "Negocio de barrio" },
                        flags: ["negocio_activo", "primer_negocio_propio"],
                        milestone: "Abrió su primer negocio",
                    },
                    failure: {
                        narrative: "El local no encontró suficientes clientes. Cerraste antes de que la deuda creciera y aprendiste cuánto cuesta equivocarse de barrio.",
                        stats: { happiness: -3, knowledge: 2 },
                        psychology: { stress: 6 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "abrir_servicios",
                label: "Vender servicios desde casa",
                description: "Menos inversión y más flexibilidad, pero también menos estructura.",
                cost: { shareOfGdp: 0.04 },
                check: { type: "educacion", base: 52 },
                outcomes: {
                    success: {
                        narrative: "Empezaste con un ordenador, una agenda y clientes que llegaron por recomendación. No era una gran empresa, pero el margen dependía de ti.",
                        stats: { knowledge: 3, happiness: 2 },
                        businessStart: { kind: "tecnologia", name: "Servicios profesionales" },
                        flags: ["negocio_activo", "negocio_servicios"],
                        milestone: "Creó su primer negocio de servicios",
                    },
                    failure: {
                        narrative: "Los clientes no llegaron al ritmo que necesitabas. El proyecto se quedó en un intento y volviste a buscar ingresos más previsibles.",
                        stats: { happiness: -2, knowledge: 2 },
                        psychology: { stress: 5 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "abrir_gastronomia",
                label: "Probar con gastronomía",
                description: "Un local con cocina, proveedores y un margen estrecho.",
                cost: { shareOfGdp: 0.16 },
                check: { type: "trabajo", base: 42 },
                outcomes: {
                    success: {
                        narrative: "La cocina arrancó despacio. Un plato empezó a pedirse por su nombre y la caja dejó de ser una lotería diaria.",
                        stats: { health: -2, happiness: 4 },
                        businessStart: { kind: "gastronomia", name: "Cocina propia" },
                        flags: ["negocio_activo", "negocio_gastronomia"],
                        milestone: "Abrió un negocio de gastronomía",
                    },
                    failure: {
                        narrative: "Los costes de proveedores se comieron el margen. Cerraste con una deuda pequeña y la certeza de que la cocina no era el negocio que imaginabas.",
                        stats: { happiness: -3, health: -1 },
                        psychology: { stress: 7 },
                        flags: ["negocio_quebrado"],
                    },
                },
            },
            {
                id: "seguir_sin_negocio",
                label: "Seguir con la nómina",
                description: "No arriesgar el ingreso actual y conservar la estabilidad.",
                outcomes: {
                    success: {
                        narrative: "Dejaste la idea en un cuaderno. La nómina siguió llegando y el negocio quedó como una posibilidad que no estabas dispuesto a pagar.",
                        stats: { happiness: -1, knowledge: 1 },
                        psychology: { stress: -2 },
                    },
                },
            },
        ],
    },

];
