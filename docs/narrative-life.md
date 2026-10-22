# Experiencia narrativa individual

Las nuevas vidas individuales usan `config.storyMode: true` y, por defecto, `autoDecisions: false`. El servidor avanza el reloj y **se detiene en cada decisión**; el jugador elige y la vida continúa. Puede pausar, cambiar de 1× a 16× o activar la estrategia automática durante la partida (en duelo, solo el anfitrión). No se eligen época, año ni duración: se nace hoy y la muerte la decide el modelo de mortalidad. Las partidas antiguas conservan la configuración con la que se crearon.

## Progresión

En **ritmo manual**, el servidor no crea ningún plazo ni avanza por su cuenta. En **vida en vivo**, el servidor programa el avance y lo detiene al llegar a una decisión. El resultado aparece como un **eco anual inline** (`YearEcho`). El resultado aparece como un **eco anual inline** (`YearEcho`): opción elegida, resultado de la tirada, tres líneas de crónica, cambios de estadísticas, balance económico e hitos. No hay modal ni botón «Continuar». Cuando hay una decisión pendiente, se elige con **un solo clic** y el año se resuelve en la misma acción. El avance permanece desactivado mientras la partida esté pausada o haya una decisión sin resolver.

El **modo automático** es una opción explícita. En individual lo activa el jugador; en duelo solo lo controla el anfitrión, sin voto del invitado. Solo entonces el servidor programa el siguiente año con `decisionTimerSeconds / speed`. Pausar elimina el plazo y reanudar lo restablece. Velocidades 1×–16× afectan únicamente al modo automático.

A los dos años hay una elección sobre una primera experiencia y temperamento. Los hitos fijos de infancia y adolescencia son 2, 4, 6, 8, 10, 12, 14, 16 y 18; el resto se selecciona del catálogo de 166 situaciones según contexto. Las variantes narrativas cambian la redacción por mundo y suceso, no por jugador, sin cambiar las opciones ni los efectos. Los enfoques son persistentes desde los seis años y modifican estados durante la resolución anual; no requieren confirmar una elección cada año. En crisis de empleo, deuda o salud, el selector prioriza las tres decisiones de recuperación y evita que una mala racha deje la partida sin salida.

Cada año incorpora además una **crónica de 5–6 escenas** (`chronicle.ts`): etapa vital, familia, escuela o trabajo, salud, lugar y vida interior. En el modo mensual, `monthly-story.ts` añade **una escena narrativa por mes** con contexto de infancia, estudios, empleo, desempleo, negocio, pareja, hijos, salud, deuda, duelo o vejez. Ambas son deterministas, personales y no modifican estadísticas ni economía; tampoco reproducen resúmenes contables. Su función es dar contexto y ritmo de lectura. El eco anual reúne una selección con los sucesos del mundo y las consecuencias reales; el diario y el historial conservan la versión completa.

El diario combina decisiones, consecuencias, escenas cotidianas y cambios familiares. Cada entrada se puede guardar como recuerdo en este dispositivo.

## Familia y vidas paralelas

Padres, hermanos y abuelos tienen nombre, sexo, año de nacimiento y estado de vida. El modelo puede registrar nacimientos de hermanos, hijos derivados de las decisiones y la incorporación de una pareja. Los familiares envejecen y su mortalidad usa el modelo provisional del país de nacimiento. Un fallecimiento queda registrado y se conserva en la ficha familiar; las personas fallecidas dejan de aparecer en la escena cotidiana. La escena de infancia muestra padres y hermanos; la de adultez muestra pareja actual e hijos.

Cuatro compañeros nacen con semillas independientes, países ponderados por nacimientos y el mismo año. Sus estados de vida y mortalidad evolucionan con sus propias circunstancias nacionales. Sus carreras y vínculos no se simulan con la misma profundidad que los del jugador; no se presentan empleos inventados como resultados reales.

## Arte y mapa

Los retratos y las escenas son SVG originales, dibujados con código. Apariencia y ropa se mantienen por semilla y cambian con la edad. Las paletas incluyen variedad de tonos de piel; las elecciones visuales no pretenden representar toda la diversidad de un país. La escena distingue ciudad y campo.

`client/src/data/world-map.json` contiene rutas simplificadas extraídas de Natural Earth 1:110m Admin 0 Countries, dominio público: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . El mapa destaca el país y coloca un marcador geográfico aproximado en su centro, no en una dirección personal.

## Datos y límites

Siguen disponibles 16 países de demostración. La proporción de nacimientos se normaliza entre ellos; no es una probabilidad mundial. Para nuevas vidas narrativas el quintil se distribuye uniformemente dentro de cada país. La religión se genera como contexto ficticio desde un catálogo, sin afirmar que las frecuencias sean oficiales. No se infiere religión del usuario ni se generan categorías de casta sin datos.

El proyecto dispone de mortalidad infantil del primer año y escolarización media. El certificado nombra esos indicadores correctamente: no se sustituyen por mortalidad antes de los cinco años ni por escolarización esperada. La pantalla de nacimiento ya no compara automáticamente con el país del usuario ni guarda su ubicación.

El registro se puede compartir mediante la hoja del dispositivo o descargar como PNG. Compartir requiere pulsar el botón; no se publica automáticamente.

## Hogar y familia de origen v2

El registro de nacimiento muestra un hogar más concreto que antes: estructura familiar, tenencia de la vivienda, ocupación, educación, salud e ingreso de cada progenitor, presupuesto anual, ahorros, deudas, religión, religiosidad, contexto cultural modelado y red de apoyo. También distingue a un progenitor que vive fuera del hogar y cuya cantidad aparece como **aportación externa**, no como salario cotidiano.

Cada pariente tiene salud y mortalidad propias. Cuando fallece, el diario registra la edad y la causa, se genera duelo y, si corresponde, se abre una situación de tutela. El funeral queda **pendiente de decisión**: el jugador elige ceremonia íntima, a lo grande o sin ceremonia, y solo entonces se cobra (saldo y, si falta, deuda) con efectos explícitos en felicidad, relaciones y estrés. La deuda familiar con el fallecido se condona. La herencia solo llega una vez, después de la muerte de ambos progenitores y de alcanzar la mayoría de edad; si el personaje aún es menor, la partida recuerda que está pendiente.

Los padres pueden jubilarse, perder su empleo o recuperarlo. Esos cambios actualizan sus ingresos y pueden abrir decisiones como ayudarles económicamente o cuidar de ellos en la vejez. Los hermanos, hijos y pareja también pueden enfermar y morir; su carrera profesional no se simula con la profundidad del personaje principal.

## Mente, empresa y préstamos

La ficha «Mente y carácter» muestra resiliencia, autoestima, estrés, duelo, desgaste laboral y satisfacción vital. Son un resumen del estado emocional de la simulación, no un diagnóstico. La psicología influye en salud y felicidad con un peso limitado.

La ficha «Vida material» reúne empleo, nivel de vida, crédito, préstamos, empresa y hogar de origen. Si hay un negocio, muestra ingresos, costes, marketing, reputación y empleados; si hay préstamos, su saldo. Los rasgos acumulados traducen banderas internas a lenguaje legible.

## Límites del modelo

Los datos de estructura familiar, ocupaciones, religión, apoyo y cultura son parámetros provisionales de simulación, no frecuencias oficiales. El presupuesto familiar se fija al nacer como contexto y no se renegocia cada año; la herencia es una estimación y no revaloriza activos. La poliginia solo se modela en contextos legales y religiosos compatibles y no se infiere de la persona jugadora.
