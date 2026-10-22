import type { DecisionVariant } from "./decision-types.js";

/**
 * Variantes específicas del suceso compartido.
 *
 * El mismo tipo de decisión se reutiliza para varios sucesos (por ejemplo,
 * una crisis económica y una recesión comparten `respuesta_crisis`). Estas
 * variantes permiten que el texto describa el hecho que realmente ocurrió sin
 * duplicar opciones, costes ni efectos. No alteran ninguna regla del motor.
 *
 * La selección se hace con la semilla del mundo y el turno, no con el jugador:
 * en un duelo ambos leen la misma situación y compiten con la misma información.
 */
export const EVENT_DECISION_VARIANTS: Record<string, DecisionVariant[]> = {
    crisis_economica: [
        {
            title: "La oficina de empleo se llena",
            description:
                "La crisis ya no es una noticia lejana: hay conocidos que han perdido horas, comercios que cierran antes y una incertidumbre que se sienta a la mesa. Tienes que decidir cómo proteger tu presupuesto sin saber cuánto durará.",
            contextNote: "Una recesión no reparte sus efectos por igual. Tus recursos y tu red marcan el margen real de respuesta.",
        },
        {
            title: "El dinero alcanza menos",
            description:
                "Los precios suben mientras las ofertas de trabajo se vuelven más exigentes. Cada gasto cotidiano exige una pequeña negociación contigo mismo. No hay una respuesta que elimine el riesgo.",
            contextNote: "Ajustar gastos, endeudarse o buscar ingresos extra son estrategias distintas, no una solución perfecta.",
        },
    ],
    recesion: [
        {
            title: "Los pedidos dejan de sonar",
            description:
                "La actividad se enfría sin hacer ruido: menos pedidos, horarios recortados y proveedores que llaman para cobrar antes. Tu situación depende ahora de decisiones que no pueden esperar a que escampe.",
            contextNote: "En una recesión, la caja y el empleo se protegen con medidas concretas; el optimismo solo no paga facturas.",
        },
        {
            title: "La segunda ronda de recortes",
            description:
                "La primera advertencia ya pasó. Ahora la empresa habla de ajustes y en el barrio se comentan cierres. Tienes que decidir qué parte de tu vida económica intentas sostener.",
            contextNote: "La información disponible es incompleta. La decisión importa precisamente porque el futuro no está claro.",
        },
    ],
    inflacion: [
        {
            title: "La compra de cada semana",
            description:
                "El mismo carro cuesta más y algunos productos han cambiado de tamaño sin avisar. La inflación entra en la cocina antes que en los titulares. Toca revisar prioridades con números reales.",
            contextNote: "La inflación erosiona el poder de compra de forma acumulativa; una medida aislada no la compensa.",
        },
        {
            title: "El recibo de la luz",
            description:
                "La energía y la comida explican una parte cada vez mayor de la factura mensual. Puedes recortar, endeudarte o intentar aumentar ingresos, pero cada camino tiene un coste distinto.",
            contextNote: "Ajustar el presupuesto no es lo mismo que tener más margen: cambia qué riesgos puedes absorber.",
        },
    ],
    epidemia: [
        {
            title: "La ciudad cierra filas",
            description:
                "Las escuelas y algunos negocios reducen su actividad. En casa se habla de a quién visitar, cómo cuidar a los mayores y qué hacer si alguien enferma. La incertidumbre dura más que el anuncio.",
            contextNote: "Protegerte y proteger a otros puede entrar en conflicto. La información y los recursos disponibles condicionan la respuesta.",
        },
        {
            title: "La mascarilla en el bolsillo",
            description:
                "La epidemia ya forma parte de la rutina, pero no ha desaparecido. Hay que decidir cuánto riesgo asumir para mantener el trabajo, los estudios y los vínculos.",
            contextNote: "La fatiga social no elimina el riesgo; cambia la forma en que las personas lo interpretan.",
        },
    ],
    pandemia_global: [
        {
            title: "El mundo se detiene",
            description:
                "Las fronteras se cierran y el calendario se vacía de planes. Lo cotidiano se vuelve peligroso y las decisiones pequeñas adquieren un peso enorme. Nadie sabe cuánto durará.",
            contextNote: "Una pandemia es un suceso compartido, pero sus consecuencias dependen del hogar, el trabajo y la salud de cada persona.",
        },
        {
            title: "Los días que no salían en el calendario",
            description:
                "Las semanas se parecen entre sí y las noticias cambian cada mañana. Tienes que decidir cómo cuidar tu salud, tu economía y tus relaciones cuando las tres cosas compiten por el mismo margen.",
            contextNote: "La respuesta individual importa, pero no puede compensar por sí sola un shock global.",
        },
    ],
    pandemia_futura: [
        {
            title: "El nuevo virus y la vieja fatiga",
            description:
                "Los sistemas sanitarios reaccionan más rápido, pero la sociedad ya conoce el guion y desconfía de él. Una nueva alerta obliga a decidir sin la energía de la primera vez.",
            contextNote: "La experiencia previa puede proteger o volver más difícil una respuesta colectiva.",
        },
        {
            title: "La alerta que ya conocíamos",
            description:
                "La pandemia futura llega con protocolos, aplicaciones y memoriales de la anterior. El riesgo sigue siendo real, aunque las conversaciones empiecen cansadas. Tus recursos marcan lo que puedes permitirte.",
            contextNote: "La preparación no elimina la incertidumbre: cambia el margen de maniobra.",
        },
    ],
    desastre_natural: [
        {
            title: "El agua entra en casa",
            description:
                "La tormenta rompe rutinas y deja daños visibles. La reconstrucción exige dinero, tiempo y una red de apoyo que no siempre está disponible. La emergencia termina; las facturas, no.",
            contextNote: "La vivienda y la comunidad son activos de recuperación, pero también pueden convertirse en una carga.",
        },
        {
            title: "La calle después de la tormenta",
            description:
                "Los servicios de emergencia llegan, pero no alcanzan para todo. Vecinos y desconocidos organizan turnos. Tienes que decidir cómo reconstruir sin comprometer lo que aún sostiene tu vida.",
            contextNote: "La ayuda mutua no sustituye las pérdidas, pero cambia el tiempo que tarda una comunidad en volver a funcionar.",
        },
    ],
    terremoto: [
        {
            title: "Cuando la tierra deja de ser suelo",
            description:
                "El temblor dura segundos y deja una ciudad distinta. Edificios dañados, suministros cortados y personas que no aparecen. La reconstrucción empieza antes de que lleguen las ayudas.",
            contextNote: "En una catástrofe, la información y la capacidad de esperar son tan importantes como los recursos.",
        },
        {
            title: "La noche en la plaza",
            description:
                "Nadie quiere volver a entrar en casa. La calle se convierte en refugio y en lugar de encuentro. La decisión inmediata convive con una pregunta más larga: qué hacer con lo que queda.",
            contextNote: "La respuesta a un terremoto se mide en semanas y años, no solo en las primeras horas.",
        },
    ],
    oportunidad_educativa: [
        {
            title: "Una beca con fecha de caducidad",
            description:
                "El programa existe, las plazas también, pero la convocatoria no espera. Matricularse exige tiempo y dinero; dejarla pasar también tiene un coste que no aparece en la cuenta.",
            contextNote: "La formación cambia el currículum, pero no garantiza un empleo ni elimina las obligaciones presentes.",
        },
        {
            title: "La plaza que no espera",
            description:
                "Un centro ofrece una credencial con plazas limitadas. Podrías asistir, posponerlo o intentar aprender por tu cuenta. El reloj del programa no coincide con el reloj de tu vida.",
            contextNote: "Estudiar es una inversión con incertidumbre; el retorno depende del sector, el país y el tiempo disponible.",
        },
    ],
    boom_tecnologico: [
        {
            title: "La herramienta que todos quieren usar",
            description:
                "Una tecnología nueva cambia la forma de trabajar en tu sector. Quien la domina gana tiempo; quien la ignora compite con una desventaja creciente. También puede quedarse obsoleta.",
            contextNote: "Aprender una herramienta no es lo mismo que entender el problema que resuelve.",
        },
        {
            title: "Aprender el nuevo idioma del trabajo",
            description:
                "La oficina se llena de tutoriales, pruebas y conversaciones sobre automatización. Tienes una oportunidad de formarte antes de que el mercado dé por supuesto ese conocimiento.",
            contextNote: "La formación tecnológica puede abrir puertas, pero exige tiempo y un contexto que permita practicar.",
        },
    ],
    despido_colectivo: [
        {
            title: "La puerta de la fábrica",
            description:
                "El cierre se anuncia con una reunión y una lista. Hay familias que dependen de esos salarios y una ciudad que intenta reaccionar. Tu próximo paso no depende solo de tu voluntad.",
            contextNote: "Un despido colectivo reduce oportunidades disponibles a la vez para muchas personas.",
        },
        {
            title: "La lista en el tablón",
            description:
                "La empresa confirma los recortes. Tu nombre está en la conversación, aunque todavía no en el papel definitivo. Tienes que decidir cómo prepararte para el mes siguiente.",
            contextNote: "La incertidumbre laboral consume tiempo y energía incluso antes de que el despido sea efectivo.",
        },
    ],
    automatizacion: [
        {
            title: "La máquina ocupa tu mesa",
            description:
                "Un sistema nuevo hace en minutos una parte de tu trabajo. La empresa promete que nadie sobra, pero el ambiente dice otra cosa. Actualizar tus habilidades compite con cumplir el turno.",
            contextNote: "La automatización no elimina todos los empleos, pero cambia qué tareas se valoran y quién puede adaptarse.",
        },
        {
            title: "El turno que ya no existe",
            description:
                "El calendario laboral aparece con menos nombres. Tu tarea no ha desaparecido del todo: ahora la supervisa una máquina y queda menos tiempo para aprender algo distinto.",
            contextNote: "La transición tecnológica es más difícil cuando el presupuesto y el horario no dejan margen para formarse.",
        },
    ],
    ia_empleo: [
        {
            title: "El asistente que responde por ti",
            description:
                "La dirección presenta una herramienta que redacta, resume y contesta correos. Algunas tareas se aceleran; otras dejan de necesitar a una persona. El nuevo idioma profesional ya está en la mesa.",
            contextNote: "La inteligencia artificial cambia la división del trabajo, no solo la velocidad de una tarea.",
        },
        {
            title: "La reunión sobre el futuro de la oficina",
            description:
                "Todos hablan de productividad y de puestos que se transformarán. Nadie tiene un plan completo. Tienes que decidir cómo prepararte sin saber qué parte del cambio llegará primero.",
            contextNote: "En una transición tecnológica, la información fiable y la capacidad de aprender pesan más que una predicción exacta.",
        },
    ],
    crisis_sanitaria: [
        {
            title: "El cuerpo pide una pausa",
            description:
                "Un síntoma que llevabas semanas ignorando se vuelve imposible de esquivar. El diagnóstico llega con opciones distintas, tiempos de espera y una factura que todavía no conoces.",
            contextNote: "La atención médica depende del país, del seguro y de la red disponible; ninguna opción elimina la incertidumbre clínica.",
        },
        {
            title: "Una prueba que cambia la semana",
            description:
                "El resultado obliga a reorganizar el trabajo y la familia. Puedes buscar la vía más rápida, aceptar el circuito público o reducir el ritmo antes de que el cuerpo lo imponga.",
            contextNote: "Una urgencia médica es a la vez una decisión sanitaria, económica y familiar.",
        },
    ],
};
