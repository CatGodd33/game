import { FastForward, Gauge, Pause, Play, Sparkles, TimerReset } from "lucide-react";
import type { GameClock, GameMode, GameSpeed } from "@life-duel/shared";
import { GAME_SPEEDS } from "@life-duel/shared";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { useCountdown } from "../../hooks/useGameSocket";

export function ClockControls({
    clock,
    mode,
    busy,
    onPause,
    onSpeed,
    onAuto,
    canAuto = true,
}: {
    clock: GameClock;
    mode: GameMode;
    busy?: boolean;
    onPause: (paused: boolean) => void;
    onSpeed: (speed: GameSpeed) => void;
    onAuto: (enabled: boolean) => void;
    canAuto?: boolean;
}) {
    const countdown = useCountdown(clock.deadlineAt);
    const paused = clock.paused;

    return (
        <div className="glass-soft rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
                <Button
                    variant={paused ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => onPause(!paused)}
                    loading={busy}
                    aria-label={paused ? "Reanudar partida" : "Pausar partida"}
                >
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {paused ? "Reanudar" : "Pausar"}
                </Button>

                <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-ink-950/50 p-1" aria-label="Velocidad">
                    <FastForward className="ml-1.5 h-3.5 w-3.5 text-parchment-faint" aria-hidden="true" />
                    {GAME_SPEEDS.map((speed) => (
                        <button
                            key={speed}
                            type="button"
                            onClick={() => onSpeed(speed)}
                            disabled={busy || paused}
                            aria-pressed={clock.speed === speed}
                            className={`rounded-lg px-2 py-1.5 text-[0.68rem] font-semibold tabular-nums transition ${clock.speed === speed
                                ? "bg-gold/15 text-gold-soft"
                                : "text-parchment-faint hover:bg-white/5 hover:text-parchment"
                                }`}
                        >
                            {speed}×
                        </button>
                    ))}
                </div>

                {countdown !== null && !paused ? (
                    <Badge tone={countdown <= 10 ? "danger" : "amber"} dot>
                        <TimerReset className="h-3 w-3" aria-hidden="true" /> {Math.floor(countdown / 60)}:
                        {String(countdown % 60).padStart(2, "0")}
                    </Badge>
                ) : null}

                <div className="ml-auto flex items-center gap-3">
                    <span className="hidden items-center gap-1.5 text-[0.68rem] text-parchment-faint sm:flex">
                        <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                        {paused ? "Reloj detenido" : "El servidor controla el reloj"}
                    </span>
                    <Badge tone={clock.speed === 1 ? "neutral" : "sky"}>{clock.speed}×</Badge>
                </div>
            </div>

            <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                <Toggle
                    checked={clock.autoDecisions}
                    onChange={onAuto}
                    disabled={busy || !canAuto}
                    label="Decisiones automáticas"
                    description={
                        mode === "duel" && !canAuto
                            ? "Solo el anfitrión puede activar o desactivar el modo automático. Tus decisiones siguen siendo tuyas."
                            : mode === "duel"
                                ? "El anfitrión decide si el servidor elige por ambos. La política es reproducible y no siempre escoge la opción perfecta."
                                : "El servidor elegirá por ti cuando llegue una decisión. Puedes desactivarlo en cualquier momento."
                    }
                />
                {clock.autoDecisions ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-jade">
                        <Sparkles className="h-3 w-3" aria-hidden="true" /> Política automática activa para esta partida.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
