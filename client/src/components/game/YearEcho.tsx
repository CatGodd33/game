import type { CurrencyInfo, PlayerSlot, TurnRecord } from "@life-duel/shared";
import { CORE_STAT_META, formatMoney } from "@life-duel/shared";

/**
 * Resultado del último año resuelto, integrado en la página.
 * No es un modal ni exige una acción: la vida puede seguir leyéndose
 * sin cerrar ventanas. El diario conserva la versión completa.
 */
export function YearEcho({
    record,
    slot,
    currency,
}: {
    record: TurnRecord;
    slot: PlayerSlot;
    currency: CurrencyInfo;
}) {
    const player = record.players[slot];
    if (!player) return null;

    const hasDecision = player.decisionId !== "sin_decision" && player.decisionTitle !== "Sin decisión";
    const changed = Object.entries(player.statDelta).filter(([, value]) => Math.abs(value) > 0.01);
    const narrative = player.narrative.filter(
        (line) => !line.includes("Este año no trajo una encrucijada") && !line.includes("El entorno evoluciona"),
    );

    return (
        <section className="story-panel year-echo" aria-label={`Resultado del año ${record.year}`}>
            <header className="year-echo-head">
                <div>
                    <span>Año {record.year} · {record.age} años</span>
                    <h2>{hasDecision ? player.decisionTitle : "Un año cotidiano"}</h2>
                </div>
                <span className="year-echo-stamp">Lo que dejó el año</span>
            </header>

            {hasDecision ? (
                <p className="year-echo-choice">
                    Elegiste <b>{player.optionLabel}</b>
                    {player.success !== null ? (player.success ? " · salió bien" : " · no salió como esperabas") : ""}
                </p>
            ) : null}

            {narrative.length > 0 ? (
                <p className="year-echo-narrative">{narrative.slice(0, 3).join(" ")}</p>
            ) : null}

            <div className="year-echo-bottom">
                <div className="year-echo-stats">
                    {changed.map(([key, value]) => {
                        const meta = CORE_STAT_META[key as keyof typeof CORE_STAT_META];
                        return (
                            <span key={key} className={value > 0 ? "up" : "down"}>
                                {meta?.label ?? key} {value > 0 ? "+" : ""}
                                {value}
                            </span>
                        );
                    })}
                    {changed.length === 0 ? <span className="muted">Sin cambios principales.</span> : null}
                </div>
                <p className={`year-echo-money ${player.economic.net >= 0 ? "up" : "down"}`}>
                    Balance {formatMoney(player.economic.net, currency)}
                </p>
            </div>

            {player.milestones.length > 0 ? (
                <p className="year-echo-milestone">✦ {player.milestones.join(" · ")}</p>
            ) : null}
        </section>
    );
}
