# Banco en tiempo real

La tarjeta de banco de una vida individual resume la cuenta personal y reproduce el último cierre mensual durante el mismo ciclo visual que la barra superior. No cambia ninguna regla económica.

## Principios

- El servidor sigue siendo la autoridad del saldo, la deuda, los ingresos y los gastos.
- El cliente recibe movimientos ya registrados y los presenta de forma legible; no inventa importes.
- El saldo animado se deriva del extracto (`balance`, `income`, `taxes`, vivienda, alimentación, suministros, transporte, salud, educación, otros y cuota de deuda).
- El último fotograma coincide con el saldo disponible del servidor.
- Las compras, préstamos y decisiones manuales aparecen en cuanto el servidor las confirma.
- Las partidas guardadas antiguas siguen funcionando: si no hay extracto mensual, se muestra el saldo actual y los últimos movimientos disponibles.

## Secuencia visual

1. **Nómina y otros ingresos.** Salario con el oficio, pensión, prestación, ingreso de pareja o beneficio de la empresa.
2. **Vivienda.** Alquiler o hipoteca.
3. **Gastos esenciales.** Impuestos, alimentación y suministros desglosados (electricidad, agua, gas, internet).
4. **Resto del hogar.** Transporte, salud, educación y otros.
5. **Deuda.** Cuota, intereses o nueva financiación, marcados en ámbar.

Con velocidades altas o `prefers-reduced-motion`, se muestra directamente el cierre completo para que el contenido siga siendo legible. Al pausar el reloj o abrir una decisión, la reproducción se detiene.

## Interfaz

- Saldo disponible grande y deuda siempre visible.
- Ingresos del cierre con su fuente principal.
- Exactamente **cinco movimientos recientes**; no hay lista larga ni scroll interno.
- Entradas en verde, gastos en rojo y deuda en ámbar, con signos `+`/`−` además del color.
- Iconos vectoriales por categoría.
- Enlace al historial completo para consultar la vida entera.
- Diseño responsive sin desbordamiento horizontal y áreas táctiles adecuadas.

## Vista de deudas

La tarjeta enlaza a «Tus deudas», un modal que desglosa cada préstamo activo, cada hipoteca y la deuda residual. Las filas se concilian con `finance.debt`; la interfaz nunca suma más de lo que el servidor reconoce. Desde ahí se puede pagar un importe parcial o el total de una deuda concreta. La validación de saldo, saldo pendiente e idempotencia ocurre en el servidor y el pago queda en el libro mayor.

Si muere el familiar que concedió un préstamo, la deuda se condona automáticamente y deja de aparecer. La deuda bancaria no se altera. En el duelo esta vista también está disponible, pero las compras e inversiones manuales siguen limitadas al modo individual.

Prueba de navegador: `e2e/debts.spec.ts` crea una deuda, paga 100 USD PPP y verifica la reducción contra el estado del servidor, además de comprobar el layout en 390 px. La lógica de pago se cubre en `tests/debts-funerals-diary.test.ts`.


## Límites

La reproducción es una capa de presentación. La economía se liquida de forma atómica en el servidor para mantener la coherencia del duelo, la persistencia y la puntuación. No se modifica el saldo real desde el navegador ni se simulan transacciones sub-mensuales que puedan desincronizar a los jugadores.

Las pruebas de esta capa están en `tests/bank-presentation.test.ts` y comprueban clasificación, colores, deuda, orden temporal, máximo de cinco filas y reconciliación del saldo.

La vista de deudas se apoya en `DebtPanel.tsx`; el pago dirigido se resuelve en `server/src/simulation/spending.ts` y se registra en el libro mayor. `MoneyText` evita que importes largos desborden las tarjetas.
