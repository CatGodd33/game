import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CoreStatKey, GameView, PlayerSlot, TurnPlayerRecord } from "@life-duel/shared";
import { CORE_STAT_META, formatMoney, formatPercent } from "@life-duel/shared";
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BookOpen,
    Clock3,
    Eye,
    EyeOff,
    History,
    Hourglass,
    Scale,
    Skull,
    Sparkles,
    Swords,
    UsersRound,
    UserRound,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { SoloLife } from "../components/game/SoloLife";
import { DebtPanel } from "../components/game/DebtPanel";
import { FuneralPanel } from "../components/game/FuneralPanel";
import { CharacterPanel } from "../components/game/CharacterPanel";
import { ClockControls } from "../components/game/ClockControls";
import { MobilityPanel } from "../components/game/MobilityPanel";
import { LocationPanel } from "../components/game/LocationPanel";
import { ConnectionBadge, PresenceDot } from "../components/game/ConnectionBadge";
import { DecisionPanel } from "../components/game/DecisionPanel";
import { EventCard } from "../components/game/EventCard";
import { LifeTimeline } from "../components/game/LifeTimeline";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { ErrorState, Loader } from "../components/ui/States";
import { StatBar } from "../components/ui/StatBar";
import { useToast } from "../components/ui/ToastProvider";
import { useDemographics } from "../hooks/useDemographics";
import { useGameSocket } from "../hooks/useGameSocket";
import { useSessionStore } from "../features/session/sessionStore";
import { api, ApiError } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

export function GamePage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const { countryName } = useDemographics();

    const [game, setGame] = useState<GameView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [action, setAction] = useState<"pause" | "speed" | "auto" | "advance" | null>(null);
    const [debtOpen, setDebtOpen] = useState(false);
    const [funeralOpen, setFuneralOpen] = useState(false);
    const [mobilityOpen, setMobilityOpen] = useState(false);
    const idempotency = useRef(new Map<string, string>());
    const submittingRef = useRef(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await ensureSession();
            const { game: loaded } = await api.getGame(id);
            setGame(loaded);
        } catch (reason) {
            setError(
                reason instanceof ApiError && reason.status === 404
                    ? "No encontramos esta vida. Puede que el enlace no sea correcto."
                    : safeErrorMessage(reason),
            );
        } finally {
            setLoading(false);
        }
    }, [ensureSession, id]);

    useEffect(() => {
        void load();
    }, [load]);

    const onGameUpdate = useCallback((next: GameView) => setGame(current => !current || next.updatedAt >= current.updatedAt ? next : current), []);
    const onSocketError = useCallback(
        (message: string) => {
            toast.push(message, "error");
            void api
                .getGame(id)
                .then(({ game: loaded }) => setGame(loaded))
                .catch(() => undefined);
        },
        [id, toast],
    );
    const connection = useGameSocket({ gameId: id, onGame: onGameUpdate, onError: onSocketError });



    useEffect(() => {
        if (game?.status === "finished") {
            navigate(`/partida/${game.id}/final`, { replace: true });
        }
    }, [game?.status, game?.id, navigate]);

    useEffect(() => {
        if (game && game.mode !== "solo" && (game.me.character.pendingFunerals?.length ?? 0) > 0) setFuneralOpen(true);
    }, [game?.me.character.pendingFunerals?.length, game?.mode]);

    const submitDecision = async (optionId: string) => {
        if (!game?.turn.prompt || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        const keyBase = `${game.turn.number}:${game.turn.prompt.id}:${optionId}`;
        let key = idempotency.current.get(keyBase);
        if (!key) {
            key = `d${game.turn.number}:${optionId}:${crypto.randomUUID()}`.replace(/[^A-Za-z0-9:_-]/g, "");
            idempotency.current.set(keyBase, key);
        }
        try {
            const result = await api.submitDecision(game.id, {
                turn: game.turn.number,
                decisionId: game.turn.prompt.id,
                optionId,
                idempotencyKey: key,
            });
            setGame(result.game);
            if (result.duplicate) {
                toast.push("Esa decisión ya estaba registrada.", "info");
            } else if (result.waitingFor.length > 0 && !game.duel?.independent) {
                toast.push("Decisión guardada. Esperando al rival.", "success");
            } else if (game.mode === "duel" && !game.duel?.independent) {
                toast.push("Turno resuelto.", "success");
            }
        } catch (reason) {
            if (reason instanceof ApiError && (reason.status === 409 || reason.status === 400)) {
                toast.push("El turno ya cambió. Actualizando la partida.", "info");
                try {
                    setGame((await api.getGame(game.id)).game);
                } catch {
                    void load();
                }
            } else {
                toast.push(safeErrorMessage(reason), "error");
            }
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const pause = async (paused: boolean) => {
        if (!game) return;
        setAction("pause");
        try {
            const { game: next } = await api.pause(game.id, paused);
            setGame(next);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setAction(null);
        }
    };

    const changeSpeed = async (speed: GameView["config"]["speed"]) => {
        if (!game) return;
        setAction("speed");
        try {
            const { game: next } = await api.speed(game.id, speed);
            setGame(next);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setAction(null);
        }
    };

    const changeAuto = async (enabled: boolean) => {
        if (!game) return;
        setAction("auto");
        try {
            const { game: next } = await api.auto(game.id, enabled);
            setGame(next);
            if (enabled) {
                toast.push("Decisiones automáticas activadas.", "success");
            } else {
                toast.push("Decisiones automáticas desactivadas.", "info");
            }
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setAction(null);
        }
    };

    const advanceYear = async () => {
        if (!game || action) return;
        setAction("advance");
        try {
            const { game: next } = await api.advance(game.id);
            setGame(next);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
            void load();
        } finally {
            setAction(null);
        }
    };

    if (loading) return <Loader label="Abriendo esta vida…" />;
    if (error || !game) {
        return (
            <div className="container-page pt-10">
                <ErrorState
                    message={error ?? "No se pudo cargar la partida."}
                    onRetry={() => void load()}
                    action={
                        <Link to="/partidas" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-parchment-dim">
                            Ver mis partidas
                        </Link>
                    }
                />
            </div>
        );
    }

    const me = game.me;
    const opponent = game.opponent;
    const prompt = game.turn.prompt;
    const waitingOnOpponent = Boolean(prompt && me.hasSubmitted && game.mode === "duel");
    const dead = !me.character.alive;
    const paused = game.status === "paused";

    if (game.mode === "solo" || game.duel?.independent) return <SoloLife key={game.id} game={game} onGame={setGame} onDecision={optionId => void submitDecision(optionId)} submitting={submitting} countryName={countryName} />;

    return (
        <div className="container-page pt-6 sm:pt-9">
            <PageHeader
                eyebrow={`${game.mode === "duel" ? "Duelo privado" : "Vida individual"}${game.roomCode ? ` · ${game.roomCode}` : ""}`}
                title={dead ? "Una vida que ya es historia" : `Año ${game.turn.year} · ${me.character.age} años`}
                description={
                    dead
                        ? `La vida de ${game.world.birth.givenName} ha terminado. El duelo continúa hasta que la otra vida también concluya.`
                        : `Estás viviendo la vida de ${game.world.birth.givenName} ${game.world.birth.surname} en ${countryName(me.character.currentCountry)}. Turno ${game.turn.number + 1}.`
                }
                back={
                    <Link to="/partidas" className="inline-flex items-center gap-1.5 text-xs text-parchment-dim transition hover:text-gold">
                        <ArrowLeft className="h-3.5 w-3.5" /> Mis partidas
                    </Link>
                }
                action={
                    <div className="flex flex-wrap gap-2">
                        <ConnectionBadge state={connection} />
                        {paused ? <Badge tone="amber" dot>En pausa</Badge> : null}
                        <Badge tone="neutral">
                            <Scale className="h-3 w-3" /> {Math.round(me.score.total)} pts
                        </Badge>
                    </div>
                }
            />


            <div className="mb-5">
                <ClockControls
                    clock={game.clock}
                    mode={game.mode}
                    busy={action !== null}
                    canAuto={game.canControlAuto}
                    onPause={(value) => void pause(value)}
                    onSpeed={(value) => void changeSpeed(value)}
                    onAuto={(value) => void changeAuto(value)}
                />
            </div>

            {!prompt && !dead && game.status === "playing" && !game.clock.autoDecisions && game.turn.waitingFor.length === 0 ? (
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm text-parchment-dim">
                        <Hourglass className="h-4 w-4 text-gold" /> El año ha terminado. Lee el balance y continúa cuando quieras.
                    </p>
                    <Button size="sm" variant="primary" onClick={() => void advanceYear()} loading={action === "advance"} disabled={paused || action !== null}>
                        Vivir el siguiente año »
                    </Button>
                </div>
            ) : null}

            {paused ? (
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm text-amber">
                        <Hourglass className="h-4 w-4" /> La partida está en pausa. El estado y las decisiones privadas se conservan.
                    </p>
                    <Button size="sm" variant="primary" onClick={() => void pause(false)} loading={action === "pause"}>
                        Reanudar ahora
                    </Button>
                </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
                <div className="space-y-5">
                    <section aria-labelledby="world-title">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="eyebrow mb-1">El mundo este año</p>
                                <h2 id="world-title" className="text-xl text-parchment">
                                    {game.turn.year} · sucesos compartidos
                                </h2>
                            </div>
                            <Badge tone="sky" dot>
                                <UsersRound className="h-3 w-3" /> Idénticos para ambos
                            </Badge>
                        </div>
                        {game.turn.sharedEvents.length > 0 ? (
                            <div className="space-y-2.5">
                                {game.turn.sharedEvents.map((event) => (
                                    <EventCard key={event.eventId} event={event} highlight />
                                ))}
                            </div>
                        ) : (
                            <SoftCard className="flex items-start gap-3 p-4">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky/20 bg-sky/[0.07] text-sky">
                                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <div>
                                    <h3 className="text-sm text-parchment">Un año sin sobresaltos colectivos</h3>
                                    <p className="mt-1 text-xs leading-relaxed text-parchment-dim">
                                        El mundo no envía ningún gran acontecimiento este año. Las rutinas, los vínculos y
                                        las decisiones personales seguirán moviendo tu vida.
                                    </p>
                                </div>
                            </SoftCard>
                        )}
                    </section>

                    {dead ? (
                        <DeadNotice game={game} />
                    ) : prompt ? (
                        <DecisionPanel
                            prompt={prompt}
                            currency={me.character.currentCurrency}
                            submitted={me.hasSubmitted}
                            ownChoice={me.ownChoice}
                            pending={submitting}
                            disabled={paused || game.status !== "playing"}
                            onSubmit={(optionId) => submitDecision(optionId)}
                        />
                    ) : (
                        <SoftCard className="flex flex-col items-center gap-2 p-8 text-center">
                            <Clock3 className="h-6 w-6 text-gold" />
                            <h2 className="text-lg text-parchment">El siguiente año está en camino</h2>
                            <p className="max-w-md text-xs leading-relaxed text-parchment-dim">
                                No tienes una decisión pendiente en este instante. El servidor avanza el mundo y la
                                pantalla se actualizará automáticamente cuando haya algo que decidir.
                            </p>
                        </SoftCard>
                    )}

                    {waitingOnOpponent && opponent ? (
                        <SoftCard className="flex flex-col gap-3 border-violet/20 bg-violet/[0.035] p-4 sm:flex-row sm:items-center">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-parchment">Decisión registrada. Esperando a {opponent.alias}.</p>
                                <p className="mt-1 text-xs text-parchment-dim">
                                    Su elección permanece oculta. Cuando ambos respondáis, el servidor resolverá el turno
                                    y revelará las consecuencias personales.
                                </p>
                            </div>
                            <Badge tone="violet" dot>
                                {opponent.hasSubmitted ? "También ha decidido" : "Pensando"}
                            </Badge>
                        </SoftCard>
                    ) : null}

                    {opponent ? <OpponentCard game={game} /> : null}
                    {game.lastResolution ? <ResolutionCard turn={game.lastResolution} game={game} /> : null}
                </div>

                <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-24">
                    <CharacterPanel player={me} world={game.world} compact countryName={countryName} />
                    <LocationPanel character={me.character} countryName={countryName} dark />

                    <button className="story-button full" disabled={dead || me.character.age < 17} title={me.character.age < 17 ? "Disponible a partir de los 17 años" : undefined} onClick={() => setMobilityOpen(true)}>
                        Irme al extranjero · estudiar, trabajar o vivir fuera ↗
                    </button>
                    {me.character.age < 17 ? <p className="story-muted text-xs">Los proyectos internacionales se abren a los 17 años.</p> : null}
                    <button className="story-button full" onClick={() => setDebtOpen(true)}>
                        Ver todas mis deudas{me.character.finance.debt > 0 ? ` · ${formatMoney(me.character.finance.debt, me.character.currentCurrency)}` : ""} ↗
                    </button>
                    {(me.character.pendingFunerals?.length ?? 0) > 0 ? (
                        <button className="story-button full funeral-aside-button" onClick={() => setFuneralOpen(true)}>
                            Despedida pendiente · {me.character.pendingFunerals![0].relativeName} →
                        </button>
                    ) : null}

                    <SoftCard className="p-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="eyebrow mb-1">Timeline</p>
                                <h2 className="text-base text-parchment">Hitos de tu vida</h2>
                            </div>
                            <Link
                                to={`/partida/${game.id}/historial`}
                                className="text-[0.65rem] text-gold transition hover:text-gold-soft"
                            >
                                Ver todo
                            </Link>
                        </div>
                        <LifeTimeline milestones={me.character.milestones} limit={5} className="mt-4" />
                    </SoftCard>

                    <SoftCard className="p-4">
                        <p className="eyebrow mb-2">Comparador</p>
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <p className="text-[0.65rem] text-parchment-faint">Tu puntuación</p>
                                <p className="font-display text-3xl text-gold">{me.score.total.toFixed(1)}</p>
                            </div>
                            {opponent ? (
                                <div className="text-right">
                                    <p className="text-[0.65rem] text-parchment-faint">{opponent.alias}</p>
                                    <p className="font-display text-2xl text-jade">{opponent.score.total.toFixed(1)}</p>
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-3 space-y-1.5" aria-hidden="true">
                            {me.score.details.slice(0, 4).map((detail) => (
                                <div key={detail.key} className="flex items-center gap-2">
                                    <span className="w-16 truncate text-[0.6rem] text-parchment-faint">{detail.label}</span>
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            className="h-full rounded-full bg-gold/70"
                                            style={{ width: `${Math.max(0, Math.min(100, detail.value))}%` }}
                                        />
                                    </div>
                                    <span className="w-6 text-right text-[0.6rem] tabular-nums text-parchment-faint">
                                        {Math.round(detail.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Link
                            to={`/partida/${game.id}/comparar`}
                            className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-[0.68rem] text-parchment-dim transition hover:border-gold/25 hover:text-gold"
                        >
                            <span className="flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5" /> Comparación detallada
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </SoftCard>

                    <div className="grid grid-cols-2 gap-2">
                        <Link
                            to={`/partida/${game.id}/historial`}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-[0.68rem] text-parchment-dim transition hover:border-gold/25 hover:text-gold"
                        >
                            <History className="h-3.5 w-3.5" /> Historial
                        </Link>
                        <Link
                            to={`/partida/${game.id}/comparar`}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-[0.68rem] text-parchment-dim transition hover:border-gold/25 hover:text-gold"
                        >
                            <Swords className="h-3.5 w-3.5" /> Rival
                        </Link>
                    </div>

                    {game.turn.waitingFor.length > 0 ? (
                        <p className="rounded-xl border border-white/[0.06] px-3 py-2 text-center text-[0.62rem] text-parchment-faint">
                            <Clock3 className="mr-1 inline h-3 w-3" />
                            Esperando a {game.turn.waitingFor.map((slot) => `Jugador ${slot}`).join(" y ")}
                        </p>
                    ) : null}
                </aside>
            </div>
            {debtOpen ? <DebtPanel game={game} onGame={setGame} onClose={() => setDebtOpen(false)} /> : null}
            {funeralOpen && (me.character.pendingFunerals?.length ?? 0) > 0 ? <FuneralPanel game={game} onGame={setGame} onClose={() => setFuneralOpen(false)} /> : null}
            {mobilityOpen ? <MobilityPanel game={game} onGame={setGame} onClose={() => setMobilityOpen(false)} /> : null}
        </div>
    );
}

function DeadNotice({ game }: { game: GameView }) {
    const me = game.me;
    return (
        <Card className="overflow-hidden border-rose/20">
            <div className="border-b border-white/[0.07] bg-rose/[0.04] p-5">
                <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose/25 bg-rose/10 text-rose">
                        <Skull className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-rose">Vida completada</p>
                        <h2 className="mt-1 text-2xl text-parchment">
                            {game.world.birth.givenName} murió a los {me.character.ageAtDeath} años
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-parchment-dim">
                            {me.character.causeOfDeath
                                ? `Causa registrada: ${me.character.causeOfDeath}.`
                                : "La causa no pudo determinarse con precisión."}{" "}
                            {game.opponent
                                ? `La vida de ${game.opponent.alias} continúa. Podrás comparar ambos resultados cuando el duelo termine.`
                                : "El resultado final está listo."}
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                <SmallMetric label="Salud final" value={Math.round(me.character.stats.health)} />
                <SmallMetric label="Felicidad final" value={Math.round(me.character.stats.happiness)} />
                <SmallMetric label="Puntuación" value={me.score.total.toFixed(1)} />
                <SmallMetric label="Hitos" value={me.character.milestones.length} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/[0.06] p-4">
                <Link
                    to={`/partida/${game.id}/comparar`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-parchment-dim hover:text-gold"
                >
                    <Swords className="h-3.5 w-3.5" /> Ver comparación
                </Link>
                <Link
                    to={`/partida/${game.id}/historial`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-parchment-dim hover:text-gold"
                >
                    <BookOpen className="h-3.5 w-3.5" /> Repasar la vida
                </Link>
            </div>
        </Card>
    );
}

function SmallMetric({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-[0.6rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</p>
            <p className="mt-1 font-display text-xl text-parchment">{value}</p>
        </div>
    );
}

function OpponentCard({ game }: { game: GameView }) {
    const opponent = game.opponent;
    if (!opponent) return null;
    return (
        <SoftCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-jade/25 bg-jade/10 text-jade">
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-xs font-medium text-parchment">{opponent.alias}</p>
                        <PresenceDot connected={opponent.connected} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {opponent.hasSubmitted ? (
                        <Badge tone="violet" dot>
                            <EyeOff className="h-3 w-3" /> Decisión privada
                        </Badge>
                    ) : (
                        <Badge tone="amber" dot>
                            Sin responder
                        </Badge>
                    )}
                    <Badge tone="jade">{opponent.score.total.toFixed(1)} pts</Badge>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(opponent.character.stats) as CoreStatKey[]).map((key) => (
                    <StatBar key={key} stat={key} value={opponent.character.stats[key]} compact />
                ))}
            </div>
            <p className="mt-3 text-[0.62rem] text-parchment-faint">
                {opponent.character.alive
                    ? `Sigue vivo a los ${opponent.character.age} años. No puedes ver su elección pendiente.`
                    : `Su vida terminó a los ${opponent.character.ageAtDeath} años.`}
            </p>
        </SoftCard>
    );
}

function ResolutionCard({ turn, game }: { turn: NonNullable<GameView["lastResolution"]>; game: GameView }) {
    return (
        <section aria-labelledby="resolution-title">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Eye className="h-4 w-4 text-gold" aria-hidden="true" />
                <h2 id="resolution-title" className="text-lg text-parchment">
                    Lo que ocurrió a los {turn.age} años
                </h2>
                <Badge tone="neutral">{turn.year}</Badge>
                <Badge tone="jade" dot>
                    Decisiones reveladas
                </Badge>
            </div>
            <div className={`grid gap-3 ${game.opponent ? "sm:grid-cols-2" : ""}`}>
                {([1, 2] as PlayerSlot[]).map((slot) => {
                    const record = turn.players[slot];
                    if (!record) return null;
                    return (
                        <PlayerResolution
                            key={slot}
                            record={record}
                            currency={
                                slot === game.me.slot
                                    ? game.me.character.currentCurrency
                                    : game.opponent?.character.currentCurrency ?? game.me.character.currentCurrency
                            }
                            me={slot === game.me.slot}
                        />
                    );
                })}
            </div>
        </section>
    );
}

function PlayerResolution({
    record,
    currency,
    me,
}: {
    record: TurnPlayerRecord;
    currency: GameView["me"]["character"]["currentCurrency"];
    me: boolean;
}) {
    return (
        <SoftCard className={`p-4 ${me ? "border-gold/20" : "border-jade/15"}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${me ? "bg-gold" : "bg-jade"}`} aria-hidden="true" />
                    <span className="text-xs font-medium text-parchment">{record.alias}</span>
                    {me ? <span className="text-[0.6rem] text-parchment-faint">tú</span> : null}
                </div>
                <Badge tone={record.success === false ? "rose" : "neutral"}>
                    {record.chance !== null ? `${formatPercent(record.chance, 0)} de éxito` : "Decisión"}
                </Badge>
            </div>
            <p className="mt-2 text-sm text-parchment">{record.optionLabel}</p>
            {record.narrative.length > 0 ? (
                <p className="mt-1 text-xs leading-relaxed text-parchment-dim">{record.narrative.join(" ")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(record.statDelta).map(([key, value]) =>
                    value ? (
                        <span
                            key={key}
                            className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-medium ${value > 0 ? "border-jade/25 bg-jade/5 text-jade" : "border-rose/25 bg-rose/5 text-rose"
                                }`}
                        >
                            {CORE_STAT_META[key as CoreStatKey].label} {value > 0 ? "+" : ""}
                            {value}
                        </span>
                    ) : null,
                )}
                <span
                    className={`rounded-full border px-2 py-0.5 text-[0.62rem] ${record.economic.net >= 0 ? "border-jade/25 text-jade" : "border-rose/25 text-rose"
                        }`}
                >
                    Balance {formatMoney(record.economic.net, currency)}
                </span>
            </div>
            {record.death ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-rose">
                    <Skull className="h-3.5 w-3.5" /> {record.death.cause} a los {record.death.age} años.
                </p>
            ) : null}
        </SoftCard>
    );
}
