# Sistema de puntuación

## 1. Objetivo

Evitar que el ganador sea simplemente quien vive más años o quien acumula más dinero. La puntuación combina bienestar, conocimiento, relaciones, estabilidad económica, educación/logros y longevidad limitada, con una puerta de bienestar que impide compensaciones extremas.

## 2. Pesos por defecto

| Clave | Categoría | Peso |
| --- | --- | ---: |
| `health` | Salud | 20 % |
| `happiness` | Felicidad | 20 % |
| `knowledge` | Conocimiento | 15 % |
| `relationships` | Relaciones | 15 % |
| `economic` | Estabilidad económica | 15 % |
| `education` | Educación y logros | 10 % |
| `longevity` | Longevidad | 5 % |

Los pesos se configuran **antes** de iniciar la partida y deben sumar exactamente 100. Se validan en el cliente y de nuevo con Zod en el servidor. Una partida activa conserva los pesos con los que empezó.

## 3. Normalización

Cada categoría se calcula en una escala 0–100.

### Salud y felicidad
```
final = clamp(0.45 * valor_final + 0.55 * media_histórica)
```
La media histórica usa todos los snapshots anuales. Así importa no solo cómo termina la vida, sino cómo se vivió.

### Conocimiento
```
final = clamp(0.5 * media_histórica + 0.5 * max(valor_actual, mezcla_histórica))
```
La mezcla evita que un único año aislado domine el resultado.

### Relaciones
```
final = clamp(0.45 * valor_final + 0.55 * media_histórica)
```

### Estabilidad económica

Con snapshots anuales:

```
nivelIngresos = clamp(ingreso_medio / (PIB_per_cápita_PPP * 1.5), 0, 1.5)
puntosNivel   = 35 * sqrt(nivelIngresos / 1.5)

cobertura     = clamp(ingreso_medio / max(gasto_medio, 1), 0, 2)
puntosCobertura = 35 * sqrt(cobertura / 2)

mesesAhorro   = clamp(dinero_medio * 12 / max(gasto_medio, 1), 0, 24)
puntosAhorro  = 15 * min(1, mesesAhorro / 12)

deudaRelativa = clamp(deuda_media / max(ingreso_medio, 1) / ratioMáximoDeuda, 0, 1)
penalizaciónDeuda = 30 * deudaRelativa

penalizaciónInsolvencia = (años_con_dinero_negativo / años) * 12

economic = clamp(15 + puntosNivel + puntosCobertura + puntosAhorro
                 - penalizaciónDeuda - penalizaciónInsolvencia)
```

Propiedades:

- Los ingresos tienen rendimientos decrecientes.
- Cubrir gastos vale más que tener ingresos altos con gastos mayores.
- La deuda y la insolvencia penalizan.
- No se compara el dinero absoluto entre países ricos y pobres: se usa la ratio con el PIB y la cobertura.

### Educación y logros

```
rangoEducativo: none=0 … postgraduate=5
baseEducativa = (rango / 5) * 100
bonoHitos = 25 + min(1, hitos_educativos_unicos / 4) * 75
education = clamp(0.7 * baseEducativa + 0.3 * bonoHitos)
```

Solo cuentan los hitos educativos únicos. Adoptar animales, comprar bienes, donar o repetir actividades no genera logros educativos. La deuda del cálculo incluye las facturas impagadas, además de los préstamos.

### Longevidad

```
longevity = clamp(edad_final / max(30, esperanza_vida_país_sexo) * 100)
```

Se normaliza por la esperanza de vida del nacimiento. Un jugador de un país con mayor esperanza de vida no obtiene una ventaja desproporcionada solo por esa circunstancia. El peso máximo es el 5 % configurado.

## 4. Puerta de bienestar

Antes de sumar, se aplica:

```
weightedRaw = Σ (categoría_i * peso_i / 100)

wellbeingGate = 0.75 + 0.25 * ((salud + felicidad) / 200)

total = round(weightedRaw * wellbeingGate, 1)
```

Rango de la puerta: **0,75–1,00**.

Si salud y felicidad son 0, la puntuación total se multiplica por 0,75. Si ambas son 100, por 1,00. Esto limita la capacidad del dinero, el conocimiento o la longevidad para compensar un bienestar muy bajo.

## 5. Contribuciones por categoría

Para transparencia, la vista incluye `details`:

| Campo | Significado |
| --- | --- |
| `key` | Clave de categoría. |
| `label` | Nombre en español. |
| `value` | Valor normalizado 0–100. |
| `weight` | Peso configurado. |
| `contribution` | Aportación a la puntuación total, ya afectada por la puerta. |
| `detail` | Explicación de la categoría. |

La suma de contribuciones coincide con la puntuación total (salvo redondeo de presentación).

## 6. Comparación y empate

```
margen = abs(puntuación_1 - puntuación_2)
ganador = margen < 0.25 ? "empate" : puntuación_mayor
```

También se determina el ganador por cada una de las siete categorías con el mismo umbral. La pantalla final muestra margen, categorías ganadas y desglose.

Si una vida termina antes:

- su puntuación final se congela;
- el superviviente continúa y actualiza la suya;
- la comparación se realiza al cerrar el duelo.

## 7. Ejemplo ilustrativo

Dos personajes con los mismos pesos por defecto:

| Categoría | A | B |
| --- | ---: | ---: |
| Salud | 70 | 55 |
| Felicidad | 65 | 80 |
| Conocimiento | 60 | 75 |
| Relaciones | 80 | 50 |
| Economía | 45 | 85 |
| Educación | 70 | 90 |
| Longevidad | 80 | 80 |

```
A raw = 0.20*70 + 0.20*65 + 0.15*60 + 0.15*80 + 0.15*45 + 0.10*70 + 0.05*80
      = 14 + 13 + 9 + 12 + 6.75 + 7 + 4 = 65.75

B raw = 0.20*55 + 0.20*80 + 0.15*75 + 0.15*50 + 0.15*85 + 0.10*90 + 0.05*80
      = 11 + 16 + 11.25 + 7.5 + 12.75 + 9 + 4 = 71.5

A gate = 0.75 + 0.25 * ((70+65)/200) = 0.91875 → 60.4
B gate = 0.75 + 0.25 * ((55+80)/200) = 0.91875 → 65.7
```

B gana con un margen de 5,3 puntos. Si B tuviera salud 10 y felicidad 20, su puerta sería 0,7875 y la ventaja económica quedaría recortada de forma importante.

## 8. Configuración

En la pantalla de creación de vida o sala se editan los siete pesos. El botón «Equilibrar» restaura los valores por defecto. La validación exige suma 100 con tolerancia de 0,01.

El servidor guarda los pesos en `game.config.scoringWeights` y no permite cambiarlos una vez iniciada la partida. La revancha puede usar los mismos o unos nuevos.

## 9. Limitaciones

- La puntuación es una medida de diseño de juego, no una evaluación objetiva de una vida humana.
- Los parámetros (puerta, curva económica, hitos) son decisiones de diseño documentadas y configurables, no estadísticas científicas.
- Cambiar los pesos altera la comparación; por eso se bloquean durante la partida.
- El modelo realista v2 no añade categorías ni modifica los pesos: la psicología influye en salud y felicidad, y la empresa y el hogar entran en la categoría económica mediante el estado financiero real. La herencia y los funerales se reflejan en el libro mayor; no se puntúan aparte.
