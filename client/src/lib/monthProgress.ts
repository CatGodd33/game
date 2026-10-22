/** Duración visual de un ciclo mensual; debe coincidir con la barra superior. */
export function monthProgressSeconds(
    monthlyMode: boolean,
    decisionTimerSeconds: number,
    speed: number,
): number {
    if (!monthlyMode) return Math.max(0.45, 3.2 / speed);
    return Math.max(
        0.08,
        (
            decisionTimerSeconds > 0
                ? Math.max(0.15, decisionTimerSeconds / speed)
                : Math.max(0.45, 3.2 / speed)
        ) / 12,
    );
}
