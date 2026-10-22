# Comparación con 1 in 8 Billion

Actualización: se ha incorporado una segunda fase con reloj narrativo, mapa, certificado, personajes SVG, familia dinámica, compañeros y enfoques persistentes. Detalles de la versión actual: [Experiencia narrativa](narrative-life.md).

Referencia: https://1in8b.life/en/ — v0.8.2 beta, consultada el 21 de octubre de 2026.

Se revisaron la portada, configuración de nacimiento, sorteo, certificado, identidad, panel familiar, decisiones de primera infancia, diario, mapa de vida, curva de supervivencia, estadísticas nacionales y menú de controles. No se ha auditado cada ramificación hasta cada final posible ni se dispone del algoritmo interno del original.

## Hallazgos

El proyecto existente implementaba principalmente un duelo: dos personajes parten del mismo nacimiento y compiten mediante decisiones anuales y una puntuación. Eso no equivale al futuro modo cooperativo en el que dos personas controlan una misma vida.

El original prioriza la biografía. Presenta un registro de nacimiento antes del reloj y mantiene identidad, familia y dinero visibles durante la vida. Su progreso combina tiempo continuo, enfoques anuales, decisiones puntuales y acontecimientos narrativos.

## Cambios realizados

- Inicio y configuración orientados a la experiencia individual, con año actual, pasado o futuro y ritmo seleccionable, sorteo por nacimientos o población y velocidad adicional 12×.
- Registro antes de comenzar, con la partida detenida y confirmación explícita de inicio.
- Padres con nombres, edades y ocupaciones, hermanos mayores, vivienda e ingresos familiares generados de forma determinista.
- Distinción de nacimiento urbano/rural y ficha de datos nacionales.
- Identidad, cuatro estados, patrimonio, ingresos, gastos, deuda y movimientos.
- Familia y vida, escena, decisiones, diario completo y mapa de años vividos.
- Compatibilidad de visualización con partidas anteriores sin el nuevo bloque de nacimiento.
- Corrección de clasificación de 2026 como presente, en lugar de futuro.
- Verificación de estructura de hogares y reproducibilidad de los nuevos datos.

## Diferencias pendientes: no es una réplica completa

| Área | Original observado | Estado del proyecto |
| --- | --- | --- |
| Países | 172 países y numerosos indicadores | 16 países de demostración |
| País al azar | Ponderación por nacimientos o población | Nacimientos, población, uniforme o fijo |
| Ingresos | Distribución con Gini y quintiles | Nivel familiar ponderado por grupo nacional; ingresos aproximados por nivel |
| Padres y hermanos | Envejecen y participan en acontecimientos | Familia dinámica con edades, nacimientos y fallecimientos en nuevas vidas narrativas |
| Religión | Origen religioso e historias asociadas | Contexto ficticio en certificado e identidad; sin distribución validada |
| Tiempo | Avance continuo; decisiones interrumpen el reloj | Reloj continuo en años sin decisiones; hitos detienen el reloj; modo automático opcional |
| Enfoque | Selección anual aparte de decisiones | Enfoques persistentes desde los seis años, con efectos anuales |
| Personalidad | Se forma durante la infancia | Primer temperamento influido por una decisión a los dos años, con registro posterior |
| Compañeros | Cuatro nacidos en el mismo segundo con vidas propias | Cuatro nacimientos independientes y evolución de mortalidad; sin trayectorias completas equivalentes |
| Supervivencia | Tablas de vida por edad, sexo y país | Modelo provisional de mortalidad; no se presenta como tabla real |
| Reflexiones | Pausas a los 5, 15, 30, 50 y 70 años | No implementadas |
| Gastar e invertir | Acciones económicas específicas | Economía anual y costes de decisiones, sin panel equivalente |
| Épocas | Datos históricos y proyecciones | Escenarios y eventos existentes, sin series equivalentes |
| Final | Registro, tarjeta, reflexión y memorial | Final, resumen y exportación ya existentes; sin memorial público |
| Música y temas | Música, claro/oscuro | Sin música equivalente; estética propia oscura |

No se deben anunciar probabilidades mundiales a partir de los 16 países: la ficha identifica expresamente que la proporción se refiere al conjunto disponible. Los ingresos y profesiones familiares son estimaciones ficticias, no indicadores oficiales. Para una equivalencia estadística será necesario ampliar y validar los datos con fuentes públicas, además de reproducir los sistemas de progresión pendientes.
