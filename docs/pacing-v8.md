# Ritmo narrativo y anti-repetición v8 (Fase 0)

Esta revisión no añade un sistema nuevo de puntuación ni cambia las reglas económicas. Ataca un problema de experiencia: una vida podía tener 50–60 elecciones, pero solo 25–30 situaciones distintas. El resto eran repeticiones de decisiones de evento, negocio o familia con el mismo texto.

## Qué cambió

### 1. El banco de variantes está conectado

Antes existía `DECISION_VARIANTS`, pero `chooseDecisionVariant` solo miraba `decision.variants`, que ninguna decisión usaba. El resultado era 0 variantes activas.

Ahora la prioridad es:

1. Variante específica del suceso (`EVENT_DECISION_VARIANTS[eventId]`).
2. Variantes declaradas en la propia decisión (`decision.variants`).
3. Banco general (`DECISION_VARIANTS[decision.id]`).

Una variante solo cambia `title`, `description` y `contextNote`. No puede cambiar opciones, costes, requisitos, probabilidades, tiradas ni efectos. Las etiquetas de opción siguen siendo las originales salvo que una variante defina `optionLabels` explícitamente.

Estado actual del banco:

- 58 situaciones con 116 variantes generales.
- 14 sucesos compartidos con 28 variantes específicas.
- 72 situaciones distintas con al menos una redacción alternativa.

### 2. La variante es del mundo, no del jugador

La semilla de la variante usa:

```text
worldSeed + turno + decisionId + eventId
```

No usa `slot` ni el país. Dos jugadores en duelo reciben la misma redacción de la situación compartida. El país puede aparecer en el texto mediante tokens (`{country}`, `{city}`), pero no cambia arbitrariamente el planteamiento del problema. Esto también evita que memorizar un título sirva para identificar una opción.

### 3. Cooldowns de evento y separación global

Las decisiones que reutilizan varios sucesos (`respuesta_crisis`, `respuesta_despido`, etc.) no tenían `cooldownYears`. Ahora tienen enfriamientos de 9–14 años:

| Decisión | Cooldown |
| --- | ---: |
| `respuesta_crisis` | 10 |
| `presupuesto_inflacion` | 9 |
| `oportunidad_curso` | 9 |
| `respuesta_despido` | 11 |
| `respuesta_desastre` | 11 |
| `respuesta_epidemia` | 14 |
| `crisis_salud` | 11 |

Además, `EVENT_DECISION_GAP_YEARS = 3` impide que una decisión de evento sea la pregunta principal dos años seguidos. El suceso del mundo puede ocurrir igualmente; simplemente se cuenta como acontecimiento compartido sin forzar otra tarjeta de decisión.

### 4. Calendario de infancia y adolescencia

El modo historia usaba estos hitos fijos:

```text
2, 6, 12, 16, 18, ...
```

La infancia quedaba prácticamente vacía entre los 2 y los 6 años. El calendario actual es:

```text
2, 4, 6, 8, 10, 12, 14, 16, 18, ...
```

Se mantienen las oportunidades contextuales, las crisis urgentes y las decisiones de recuperación. Las decisiones `focus` ya no se descartan siempre: pueden aparecer en años tranquilos si han pasado al menos tres años desde la última elección.

### 5. Menos guiones familiares idénticos

- `acuerdo_pareja` es un hito único (`once: true`); antes podía repetirse cada cuatro años.
- `crianza_dialogo` tiene cooldown de seis años.
- Las conversaciones de pareja/crianza comparten un intervalo global de cinco años.
- `prestamo_familia` ya no se fuerza en todas las vidas con apoyo familiar: aparece como hito forzado solo en el 38 % de las vidas elegibles a los 22 años.
- `cuidar_padres_mayores` ya no se fuerza a los 45 años en todas las vidas: aparece como hito forzado en el 45 % de las vidas elegibles. Sigue disponible en el catálogo general.

### 6. Empresa con más variedad y menos bucle

- El pool mensual incluye `empresa_crecer`, `empresa_contratar` y `empresa_crisis`, además de las decisiones específicas del sector.
- Una oportunidad de empresa solo puede aparecer cada cuatro años como máximo (`lastBusinessAge`).
- La probabilidad mensual es del 45 % cuando el hueco está disponible.
- Los cooldowns de las decisiones de empresa suben a 5–6 años.

## Medición

Comparación con 20 vidas automáticas, España, 85 años, modo historia + mensual, semillas `audit-v8-0..19`:

| Métrica | Antes | v8 |
| --- | ---: | ---: |
| Decisiones totales medias | 56,8 | 57,1 |
| Situaciones distintas medias | 28,4 | 40,8 |
| Años con al menos una pregunta | 35,1 | 47,5 |
| Títulos distintos medios | — | 44,0 |
| Decisiones de evento medias | — | 12,5 |
| Decisiones de empresa medias | — | 8,4 |
| Decisiones familiares medias | — | 3,4 |
| Máximo de repeticiones de una misma decisión | — | 6 |

La muestra no es una prueba estadística formal; sirve para detectar bucles y comparar revisiones. El objetivo de la Fase 0 era aumentar situaciones distintas sin inflar el número total de tarjetas. El total se mantiene prácticamente igual (57,1 frente a 56,8), pero la variedad sube de 28,4 a 40,8 situaciones distintas y el calendario juvenil es más denso. La repetición máxima es 6: ocurre sobre todo con `child_school_plan` cuando hay varios hijos, porque cada hijo recibe su propia decisión escolar; no se repite la misma pregunta para el mismo hijo.

## Pruebas

`tests/pacing-v8.test.ts` cubre:

- Variantes del banco general y estabilidad con la misma semilla.
- Misma redacción para ambos slots de un duelo.
- Variante específica de `desastre_natural` frente a `terremoto`.
- Cooldown de `respuesta_crisis`.
- Intervalo global entre decisiones de evento.
- Calendario con hitos en 2, 4, 6, 8, 10, 12, 14, 16 y 18.
- Pool de empresa y `lastBusinessAge`.
- Variantes de empresa.

## Lo que todavía no resuelve

Esto es una mejora de ritmo, no el sistema completo de dirección de vida. Siguen pendientes:

- Un `LifeBook` con personas, promesas, deudas y hilos abiertos.
- Un director de situaciones que puntúe relevancia, continuidad, novedad y tensión.
- Arcos narrativos de varias decisiones con consecuencias diferidas.
- 250–300 situaciones con varias variantes y opciones específicas por país.
- Debrief por década y biblioteca de aprendizaje.
- Presupuesto de equidad para situaciones personales en duelo.

La Fase 0 deja el motor preparado para esas capas sin romper determinismo, autoridad del servidor ni privacidad de decisiones.
