# Datos demográficos

## 1. Principio

Los datos públicos se separan del código en `data/demographics.json` y se validan con Zod al arrancar. El núcleo del juego nunca depende de una API externa, de scraping en tiempo de ejecución ni de un servicio de pago.

El conjunto incluido es una **muestra de demostración** de 14 países. Está pensado para que el juego sea ejecutable y verificable, y para que ampliarlo sea una tarea de datos, no de motor.

## 2. Fuentes

| Fuente | Uso | Licencia declarada |
| --- | --- | --- |
| Naciones Unidas, World Population Prospects 2024 | población, nacimientos, esperanza de vida, fecundidad, urbanización | CC BY 3.0 IGO |
| Banco Mundial, World Development Indicators | PIB per cápita PPP, Gini, desempleo | CC BY 4.0 |
| UN IGME, Levels & Trends in Child Mortality 2024 | mortalidad infantil | CC BY 3.0 IGO |
| OMS, Global Health Observatory | referencia sanitaria | CC BY-NC-SA 3.0 IGO |
| UNESCO Institute for Statistics | escolarización | CC BY-SA 3.0 IGO |
| PNUD, Human Development Report 2024 | años medios de escolarización | CC BY 3.0 IGO |

Cada conjunto tiene `id`, `name`, `url`, `license` y `accessed` en el propio JSON. Los indicadores registran `sourceId`, `year` y `units`.

> Los valores están redondeados y simplificados. No son una réplica exacta de las bases originales. Antes de un uso público o comercial, revisa y respeta las licencias de cada fuente.

## 3. Países incluidos

`ESP`, `MEX`, `ARG`, `BRA`, `USA`, `NGA`, `IND`, `JPN`, `DEU`, `FRA`, `ZAF`, `IDN`, `EGY`, `SWE`.

Cubren Europa, América, África, Asia y distintos grupos de ingresos, lo que permite probar el motor en contextos muy diferentes.

## 4. Campos por país

- `code`: ISO de tres letras.
- `name`, `region`.
- `incomeGroup`: alto, medio-alto, medio-bajo, bajo.
- `populationMillions`, `birthsThousands`.
- `lifeExpectancy.female` / `.male`.
- `infantMortalityPer1000`.
- `gdpPerCapitaPpp`.
- `gini` (0–100).
- `unemploymentRate` (%).
- `meanYearsSchooling`.
- `fertilityRate`.
- `urbanShare`.
- `currency`: código, símbolo, factor local por dólar internacional y marca `provisional`.
- `cities`: lista de ciudades.
- `names`: listas culturales de nombres femeninos, masculinos y apellidos.
- `derived`: coste de vida, acceso sanitario, calidad educativa, riesgo ambiental, protección social y marca `provisional`.

## 5. Uso en el motor

- **Selección de país:** ponderada por `birthsThousands` o uniforme; también fija.
- **Nacimiento:** nombres, ciudad, moneda, contexto y familia.
- **Economía:** PIB per cápita, Gini, desempleo, coste de vida, moneda.
- **Mortalidad:** esperanza de vida por sexo, mortalidad infantil, acceso sanitario.
- **Decisiones:** oportunidades educativas y laborales condicionadas por país/época.
- **Puntuación:** PIB para normalizar economía y esperanza de vida para longevidad.

La semilla decide el país; los datos deciden el contexto.

## 6. Parámetros provisionales

Los siguientes valores **no son indicadores oficiales** y están marcados como `provisional` o documentados en `notes`:

- factores de conversión PPP a moneda local (aproximaciones de poder adquisitivo, no tipos de cambio);
- índices derivados de coste de vida, acceso sanitario, calidad educativa, riesgo ambiental y protección social;
- pesos de gasto, impuestos, deuda y pensiones en `data/economy-model.json`;
- hazard de Gompertz, fragilidad, causas de muerte y multiplicadores en `data/mortality-model.json`;
- listas de nombres (ejemplos culturales, no estadística).
- parámetros de hogar, ocupaciones, religión, estructura familiar y apoyo de `data/realism-model.json`.

La interfaz y la documentación los presentan como simulación, no como datos oficiales.

## 6.1 Modelo de hogar y contexto cultural

`data/realism-model.json` es un archivo separado de `demographics.json`. Contiene:

- multiplicadores de ingreso por quintil, reparto de gasto del hogar, ahorro, deuda y activos;
- pesos de estructura familiar y tenencia de vivienda;
- costes funerarios orientativos y capacidad de apoyo familiar;
- 23 ocupaciones con educación mínima, índice salarial, formalidad, riesgo, quintiles compatibles y sesgo rural o de sexo;
- contexto por país: participación laboral femenina, brecha salarial, sistema matrimonial, poliginia legal, composición religiosa y religiosidad;
- fuentes declaradas (WDI, ILOSTAT, WPP, Women Business and the Law, Pew, OCDE), año y advertencia de uso.

El archivo tiene `status: provisional`. Sus cifras **no** son una tabla oficial de hogares, ocupaciones, religión o poliginia; son parámetros de simulación para producir variedad realista. El motor solo activa una estructura compuesta en contextos legales modelados y cuando la religión simulada es compatible (Islam; contexto consuetudinario en Sudáfrica). Nunca se infiere la religión o la situación familiar del jugador.

## 6.2 Contexto de país

`data/country-context.json` (`2026.1-contexto-pais`) añade un perfil para los mismos 14 países y un perfil `defaults` para países futuros. Cada entrada contiene:

- `monthlyShares`: proporción de vivienda, comida, suministros, transporte, salud, educación y otros dentro del gasto esencial;
- `mortgageRatePct`, `rentDepositMonths` y `migrationCostGdp`;
- `visaDifficulty` (0–100, dificultad modelada, no tasa de concesión real);
- `socialPressure` de educación, matrimonio e hijos; `expectedChildren`;
- `inheritanceNorm`: `partible`, `testamentaria` o `mixta`;
- `provisional: true` en todos los perfiles.

Fuentes declaradas en el propio archivo: Banco Mundial WDI, UN WPP, Women, Business and the Law, OCDE y UN DESA. **Los valores son parámetros de juego redondeados**, no tipos hipotecarios vigentes, tarifas de visado, alquileres de mercado ni frecuencias sociales oficiales. El motor los usa para generar un extracto mensual, calcular costes de mudanza y condicionar oportunidades; nunca para afirmar que una persona de un país debe casarse o tener hijos.

El esquema Zod vive en `server/src/simulation/country-context.ts`. Si el archivo falta o es inválido, el servidor falla de forma explícita; no inventa perfiles silenciosamente.


## 7. Cómo ampliar el dataset

1. Añade un objeto de país en `countries` con todos los campos obligatorios.
2. Usa códigos ISO de tres letras y moneda ISO de tres letras.
3. Verifica rangos: esperanza de vida 30–100, Gini 0–100, desempleo 0–100, etc.
4. Registra fuente, año, unidades y licencia del indicador.
5. Incluye nombres y apellidos culturalmente coherentes.
6. Ejecuta:

```bash
npm test
npm run typecheck
npm run sim:demo
```

El esquema de `server/src/demographics/dataset.ts` rechaza países incompletos o fuera de rango. Las pruebas de nacimiento y determinismo detectan incoherencias graves.

## 8. Cómo actualizar un indicador

- Cambia el valor y actualiza `retrievedAt` / `year` si corresponde.
- No cambies la semilla ni el formato de los campos.
- Si el cambio afecta a un modelo provisional, actualiza también su nota.
- Documenta la diferencia en el control de versiones.

## 9. API de metadatos

`GET /api/meta/demographics` devuelve versión, fecha, fuentes, notas y opciones de país. El cliente cachea esta respuesta para el selector de país y las etiquetas.

## 10. Ausencia de datos

Si falta un país o un dato obligatorio, el servidor falla de forma explícita al cargar el dataset o al validar la configuración. No se inventan valores silenciosamente. Los campos derivados sí son estimaciones declaradas y se identifican como tales.
