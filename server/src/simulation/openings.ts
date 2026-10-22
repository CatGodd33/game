import type { DecisionDefinition } from "./decision-types.js";
const scenes = [
 ["lluvia","La tarde en que llovió","La lluvia golpea el tejado de tu casa en {city}. Alguien ha dejado una caja, unos lápices y una manta en el suelo.",["Investigar los sonidos de la lluvia","Dibujar lo que imaginas fuera","Invitar a alguien bajo la manta"]],
 ["mercado","Un mercado lleno de voces","En una salida con tu familia, los puestos de {city} parecen un mundo entero. Una persona te ofrece una fruta que nunca has visto.",["Mirar cómo la corta y hacer preguntas","Atravesar el pasillo para ver otro puesto","Compartirla con otro niño"]],
 ["juguete","El juguete que dejó de sonar","Tu juguete favorito ha dejado de hacer ruido. Nadie tiene tiempo de arreglarlo ahora mismo.",["Examinar las piezas una a una","Convertirlo en un juguete diferente","Seguir probando hasta hacerlo sonar"]],
 ["musica","Música al otro lado de la puerta","En casa se escucha una melodía. No entiendes las palabras, pero sabes cuándo vuelve la parte que te gusta.",["Escuchar y reconocer el ritmo","Bailar sin preocuparte por hacerlo bien","Acercarte a quien está escuchando solo"]],
 ["patio","Una tarde en el patio","Los mayores conversan mientras otros niños juegan. Tienes una pelota y varias maneras de empezar la tarde.",["Inventar una regla para el juego","Correr detrás de la pelota","Pasársela al niño que espera fuera"]],
 ["torre","Una torre que no se sostiene","Has conseguido apilar varias cosas. La última pieza siempre hace que todo se caiga.",["Cambiar el orden de las piezas","Probar una construcción completamente nueva","Volver a intentarlo con paciencia"]],
 ["foto","Personas dentro de una fotografía","Alguien abre un álbum familiar. Ves caras que conoces y otras que no, algunas en lugares lejanos.",["Señalar cada detalle para que te lo expliquen","Imaginar un viaje a esos lugares","Pedir que te hablen de las personas"]],
 ["vecindad","Una puerta que no conocías","Una familia de tu calle invita a la tuya a pasar un rato. Hay voces distintas, juguetes y un lugar nuevo.",["Observar hasta entender quién es quién","Salir a explorar la habitación","Sentarte junto a otro niño"]],
 ["comida","La receta de esa tarde","Tu casa huele a comida. Un adulto mezcla ingredientes mientras tú esperas junto a la mesa.",["Querer ver cómo se prepara todo","Inventar una receta con tus juguetes","Llevar una servilleta a quien está trabajando"]],
 ["semilla","Una cosa pequeña empieza a crecer","Alguien ha puesto una semilla en un recipiente. Cada día miráis si ha cambiado.",["Comparar las hojas nuevas","Buscar más cosas que puedan crecer","Regarla con paciencia todos los días"]],
 ["cuento","Un cuento antes de dormir","Una historia se interrumpe justo antes de que el personaje encuentre el camino de vuelta.",["Preguntar por qué se perdió","Inventar un final diferente","Buscar una manera de ayudar al personaje"]],
 ["luz","Se apagaron las luces","Una interrupción de luz deja la casa en penumbra. Hay una linterna y las voces de tu familia.",["Observar las sombras de la pared","Convertir las sombras en una aventura","Acercarte a quien parece asustado"]],
] as const;
export const OPENING_DECISIONS: DecisionDefinition[] = scenes.map(([key,title,description,labels],index)=>({
 id:`inicio_${key}`,title,description,category:"familia",priority:"major",minAge:2,maxAge:2,once:true,
 options:labels.map((label,i)=>{
  const type=i===0?"curioso":i===1?"aventurero":index%3===2?"persistente":"empatico";
  return {id:`inicio_${i}`,label,description:["Descubrir a tu ritmo.","Dar espacio a la imaginación y al movimiento.","Cuidar, conectar o insistir sin prisa."][i]!,outcomes:{success:{narrative:`${label}. Aquella tarde quedó entre los pequeños recuerdos de tu infancia.`,temperament:{curioso:"Curioso",aventurero:"Aventurero",empatico:"Empático",persistente:"Persistente"}[type],stats:i===0?{knowledge:2}:i===1?{happiness:2,health:1}:{relationships:2,happiness:1},flags:[`infancia_${type}`,`recuerdo_${key}`]}}};
 }),
}));
