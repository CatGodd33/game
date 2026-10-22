import type { DecisionDefinition } from "./decision-types.js";

/** Persistent choices unlock mutually different followups, not just new wording. */
export const LIFE_PATHS: DecisionDefinition[] = [
 {
  id:"tiempo_propio",title:"Un hueco en tu semana",description:"Entre trabajo, facturas y cuidados queda poco tiempo. ¿Qué quieres proteger durante los próximos años?",category:"familia",priority:"major",minAge:18,maxAge:70,once:true,weight:6,
  options:[
   {id:"aprender",label:"Reservar tiempo para aprender",description:"Un curso a tiempo parcial: conocimientos a cambio de esfuerzo y matrícula.",cost:{shareOfGdp:.008},outcomes:{success:{narrative:"Apartaste dos tardes para estudiar. Otras oportunidades empezaron a aparecer alrededor de esa rutina.",stats:{knowledge:3},psychology:{stress:2},flags:["ruta_aprendizaje"]}}},
   {id:"comunidad",label:"Participar en el barrio",description:"Ayudar y conocer personas sin necesidad de hacer grandes compras.",outcomes:{success:{narrative:"Empezaste a colaborar con un grupo del barrio. Las caras conocidas se convirtieron en una red de apoyo.",stats:{relationships:3,happiness:1},flags:["ruta_comunidad"]}}},
   {id:"hogar",label:"Dar prioridad al hogar",description:"Proteger el descanso y los vínculos. La carrera avanzará a otro ritmo.",outcomes:{success:{narrative:"Protegiste las tardes y recuperaste conversaciones que siempre quedaban para después.",stats:{relationships:2,happiness:2},psychology:{stress:-3},flags:["ruta_hogar"]}}},
  ],
 },
 {
  id:"ruta_curso_proyecto",title:"El curso abre una puerta",description:"Tu tutor propone convertir el proyecto final en una acreditación. Hay matrícula, horas de estudio y un resultado incierto.",category:"educacion",priority:"major",minAge:19,maxAge:65,once:true,weight:12,requirements:{flagsAll:["ruta_aprendizaje"]},
  options:[
   {id:"acreditar",label:"Preparar la acreditación",description:"Más posibilidades profesionales, pero también estrés y un coste inicial.",cost:{shareOfGdp:.025},check:{type:"educacion",base:60},outcomes:{success:{narrative:"Superaste la acreditación y pudiste presentar un proyecto propio en las entrevistas.",stats:{knowledge:5},incomeModifierDelta:.06,psychology:{stress:3},flags:["ruta_acreditada"]},failure:{narrative:"No aprobaste esta vez. Conservaste lo aprendido, aunque tuviste que reorganizar las semanas.",stats:{knowledge:2},psychology:{stress:3},flags:["ruta_reintento"]}}},
   {id:"ritmo",label:"Seguir aprendiendo sin examen",description:"Progreso más lento, con menos presión y menos gasto.",outcomes:{success:{narrative:"Elegiste un ritmo compatible con tu vida. El conocimiento siguió creciendo sin convertir cada tarde en una carrera.",stats:{knowledge:2,happiness:1},flags:["ruta_aprendizaje_lento"]}}},
   {id:"tutoria",label:"Crear un grupo de estudio",description:"Compartir tiempo y recursos en lugar de pagar más.",outcomes:{success:{narrative:"El grupo resolvió dudas, repartió apuntes y te dio amistades fuera del trabajo.",stats:{knowledge:2,relationships:3},flags:["ruta_estudio_compartido"]}}},
  ],
 },
 {
  id:"ruta_beca_exterior",title:"Una plaza de estudios en el extranjero",description:"Tu acreditación permite solicitar un programa en Alemania. La ayuda no cubre toda la instalación. Tendrás que dejar temporalmente tu empleo y reconstruir tu red.",category:"educacion",priority:"major",minAge:20,maxAge:38,once:true,weight:14,requirements:{flagsAll:["ruta_acreditada"],notCountry:["DEU"]},
  options:[
   {id:"beca",label:"Solicitar la beca y preparar la mudanza",description:"La selección es competitiva; exige ahorro y capacidad académica.",cost:{shareOfGdp:.06},check:{type:"educacion",base:48},outcomes:{success:{narrative:"La beca llegó. Te mudaste a Alemania para estudiar: cambiaron la moneda de referencia, los gastos y las personas a las que podías llamar.",employment:"student",migrateTo:{countryCode:"DEU",location:"Berlín"},stats:{knowledge:5,relationships:-3},psychology:{stress:6},flags:["estudios_exterior"]},failure:{narrative:"La beca fue para otra candidatura. Perdiste el coste de preparación, pero seguiste buscando oportunidades desde casa.",stats:{knowledge:1},psychology:{stress:2}}}},
   {id:"local",label:"Usar la acreditación en tu país",description:"Menos cambio y menos coste de instalación; crecimiento profesional gradual.",outcomes:{success:{narrative:"Presentaste la acreditación a empleadores locales y mantuviste tu red de apoyo.",incomeModifierDelta:.04,stats:{knowledge:1},flags:["carrera_local"]}}},
   {id:"esperar",label:"Esperar y construir una reserva",description:"Posponer la mudanza para no hipotecar la estabilidad del hogar.",outcomes:{success:{narrative:"Guardaste la convocatoria. Había sueños que podían esperar a tener tres meses de gastos cubiertos.",psychology:{stress:-2},flags:["exterior_pospuesto"]}}},
  ],
 },
 {
  id:"ruta_red_apoyo",title:"La red que ayudaste a construir",description:"El grupo del barrio propone organizar turnos de acompañamiento. Puedes asumir coordinación, compartir tareas o mantener tu colaboración actual.",category:"familia",priority:"major",minAge:20,maxAge:85,once:true,weight:12,requirements:{flagsAll:["ruta_comunidad"]},
  options:[
   {id:"coordinar",label:"Coordinar los turnos",description:"Más vínculos y responsabilidad. Tu semana estará más llena.",outcomes:{success:{narrative:"Te convertiste en la persona a la que todos llamaban. La confianza creció, junto con el cansancio.",stats:{relationships:5,knowledge:1},psychology:{stress:5},flags:["red_coordinacion"]}}},
   {id:"compartir",label:"Repartir la responsabilidad",description:"Menos protagonismo, pero una red sostenible.",outcomes:{success:{narrative:"Repartisteis los turnos. Cuando alguien necesitó descansar, hubo otra persona disponible.",stats:{relationships:3,happiness:2},psychology:{stress:-2},flags:["red_sostenible"]}}},
   {id:"limites",label:"Ayudar solo una tarde al mes",description:"Proteger tus límites sin abandonar a la comunidad.",outcomes:{success:{narrative:"Pusiste límites claros y cumpliste lo prometido. La colaboración encontró un lugar que cabía en tu vida.",stats:{relationships:1,happiness:2},flags:["red_limitada"]}}},
  ],
 },
 {
  id:"ruta_hogar_acuerdos",title:"Repartir lo que no sale en las facturas",description:"Limpiar, cuidar y acompañar también consume tiempo. Hablar de las tareas puede evitar que el cansancio se convierta en resentimiento.",category:"familia",priority:"major",minAge:20,maxAge:85,once:true,weight:12,requirements:{flagsAll:["ruta_hogar"],hasPartner:true},
  options:[
   {id:"repartir",label:"Acordar un reparto de cuidados",description:"Una conversación incómoda puede proteger el vínculo.",check:{type:"social",base:72},outcomes:{success:{narrative:"Pusisteis horarios sobre la mesa y repartisteis las tareas. La casa no era perfecta; la carga dejó de ser invisible.",stats:{relationships:4,happiness:2},psychology:{stress:-4},flags:["cuidados_compartidos"]},failure:{narrative:"La primera conversación terminó mal. Quedó claro lo que había que resolver, aunque haría falta más tiempo.",stats:{relationships:-1},psychology:{stress:2},flags:["cuidados_pendientes"]}}},
   {id:"ayuda",label:"Contratar ayuda puntual",description:"Alivia trabajo doméstico durante esta etapa; supone un gasto real.",cost:{shareOfGdp:.035},outcomes:{success:{narrative:"La ayuda permitió descansar unas semanas. El coste salió de la cuenta, pero ganasteis tiempo juntos.",stats:{happiness:3,relationships:1},psychology:{stress:-3},flags:["ayuda_domestica"]}}},
   {id:"simplificar",label:"Reducir compromisos y simplificar",description:"Menos actividades y expectativas, sin una compra nueva.",outcomes:{success:{narrative:"Renunciasteis a llenar cada hueco. Hubo menos planes y más aire entre ellos.",stats:{happiness:2},psychology:{stress:-3},flags:["hogar_sencillo"]}}},
  ],
 },
];

const CHILDHOOD_ROUTES = [
 { key:"curioso", title:"La caja de cosas que nadie usa", description:"En la escuela encuentras piezas, mapas y aparatos rotos. Tu curiosidad de pequeño se ha convertido en preguntas que ya puedes investigar.", options:[
  {label:"Construir algo con las piezas",description:"Probar, equivocarte y entender cómo encajan.",stats:{knowledge:3},flag:"interes_tecnico"},
  {label:"Inventar una historia sobre los objetos",description:"Imaginar sus viajes y compartir el relato.",stats:{knowledge:1,happiness:2},flag:"interes_creativo"},
  {label:"Investigar con otros compañeros",description:"Hacer preguntas juntos en lugar de resolverlas a solas.",stats:{knowledge:1,relationships:2},flag:"interes_colaborativo"},
 ]},
 { key:"aventurero",title:"Al otro lado del patio",description:"El profesor anuncia actividades fuera del aula. Te atrae explorar, pero ahora puedes elegir cómo prepararte y con quién ir.",options:[
  {label:"Entrenar para una excursión",description:"Resistencia y preparación, sin una competición obligatoria.",stats:{health:2,happiness:1},flag:"interes_deportivo"},
  {label:"Aprender a reconocer plantas y caminos",description:"La aventura también necesita observación y paciencia.",stats:{knowledge:2,health:1},flag:"interes_naturaleza"},
  {label:"Invitar a alguien que nunca participa",description:"Cambiar velocidad por compañía.",stats:{relationships:3},flag:"interes_colaborativo"},
 ]},
 { key:"empatico",title:"Una silla vacía en el recreo",description:"Un compañero nuevo pasa el recreo solo. Te acuerdas de aquella primera vez que te acercaste a alguien que lloraba.",options:[
  {label:"Sentarte a escucharle",description:"Conocer a alguien sin intentar resolver toda su vida.",stats:{relationships:3},flag:"interes_cuidados"},
  {label:"Proponer un juego en grupo",description:"Crear espacio para más de una amistad.",stats:{relationships:2,happiness:1},flag:"interes_comunidad"},
  {label:"Pedir al profesor que organice una bienvenida",description:"Compartir la responsabilidad con un adulto.",stats:{knowledge:1,relationships:2},flag:"interes_colaborativo"},
 ]},
 { key:"persistente",title:"Algo que todavía no te sale",description:"El trabajo de clase se cae una y otra vez, como aquella torre de pequeño. Ahora puedes elegir entre insistir, cambiar de método o pedir ayuda.",options:[
  {label:"Practicar un poco cada tarde",description:"Constancia sin renunciar a todo el tiempo de juego.",stats:{knowledge:3},flag:"interes_estudio"},
  {label:"Probar un diseño diferente",description:"Cambiar de estrategia también puede ser perseverar.",stats:{knowledge:2,happiness:1},flag:"interes_creativo"},
  {label:"Resolverlo con un compañero",description:"Aprender a compartir dudas y crédito.",stats:{relationships:2,knowledge:1},flag:"interes_colaborativo"},
 ]},
] as const;
export const CHILDHOOD_PATHS: DecisionDefinition[] = CHILDHOOD_ROUTES.map(route=>({
 id:`infancia_ruta_${route.key}`,title:route.title,description:route.description,category:"educacion",priority:"major",minAge:6,maxAge:10,once:true,weight:15,requirements:{flagsAll:[`infancia_${route.key}`]},
 options:route.options.map((option,i)=>({id:`camino_${i}`,label:option.label,description:option.description,outcomes:{success:{narrative:`${option.label}. ${option.description}`,stats:option.stats,flags:[option.flag]}}})),
}));
