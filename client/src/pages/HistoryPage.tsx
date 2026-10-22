import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type {
    CoreStatKey,
    DecisionCategory,
    EventCategory,
    GameView,
    HistoryResponse,
    LifeMoment,
    PlayerSlot,
    TurnPlayerRecord,
} from "@life-duel/shared";
import {
    CORE_STAT_META,
    DECISION_CATEGORY_META,
    EVENT_CATEGORY_META,
    formatMoney,
    formatPercent,
} from "@life-duel/shared";
import {
    ArrowDownUp,
    ArrowLeft,
    BookOpen,
    HeartPulse,
    MapPin,
    ScrollText,
    Download,
    Eye,
    Filter,
    History,
    Lock,
    Skull,
    Sparkles,
    Swords,
    UserRound,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { EventCard } from "../components/game/EventCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { ErrorState, Loader } from "../components/ui/States";
import { useToast } from "../components/ui/ToastProvider";
import { useGameSocket } from "../hooks/useGameSocket";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

type CategoryFilter = "todas" | DecisionCategory | EventCategory;
type PlayerFilter = "todos" | "1" | "2";

export function HistoryPage() {
    const { id = "" } = useParams();
    const toast = useToast();
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const [game, setGame] = useState<GameView | null>(null);
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState<CategoryFilter>("todas");
    const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("todos");
    const [sort, setSort] = useState<"recent" | "chronological">("chronological");
    const [view, setView] = useState<"relato" | "anual">("relato");
    const refreshTimer = useRef<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await ensureSession();
            const [{ game: loaded }, historyData] = await Promise.all([api.getGame(id), api.history(id)]);
            setGame(loaded);
            setHistory(historyData);
        } catch (reason) {
            setError(safeErrorMessage(reason));
        } finally {
            setLoading(false);
        }
    }, [ensureSession, id]);

    useEffect(() => {
        void load();
    }, [load]);

    const connection = useGameSocket({
        gameId: id,
        onGame: (next) => {
            setGame(next);
            if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
            refreshTimer.current = window.setTimeout(() => {
                void api.history(id).then(setHistory).catch(() => undefined);
            }, 220);
        },
    });
    useEffect(() => () => {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    }, []);


    const categoryOptions = useMemo(() => {
        const decision = Object.entries(DECISION_CATEGORY_META).map(([value, meta]) => ({
            value,
            label: meta.label,
            group: "Decisiones",
        }));
        const events = Object.entries(EVENT_CATEGORY_META).map(([value, meta]) => ({
            value,
            label: meta.label,
            group: "Sucesos",
        }));
        return [...decision, ...events];
    }, []);

    const filteredTurns = useMemo(() => {
        if (!history) return [];
        const turns = history.turns.filter((turn) => {
            const eventsMatch =
                category === "todas" ||
                turn.sharedEvents.some((event) => event.category === category);
            const decisionsMatch =
                category === "todas" ||
                Object.values(turn.players).some((record) => record?.decisionCategory === category);
            if (category !== "todas" && !eventsMatch && !decisionsMatch) return false;
            if (playerFilter !== "todos") {
                return Boolean(turn.players[Number(playerFilter) as PlayerSlot]);
            }
            return true;
        });
        return sort === "recent" ? [...turns].reverse() : turns;
    }, [history, category, playerFilter, sort]);

    const filteredMoments = useMemo(() => {
        if (!history) return [];
        const list = history.moments.filter((moment) => {
            if (category !== "todas" && moment.category !== category) return false;
            if (playerFilter !== "todos" && moment.slot && String(moment.slot) !== playerFilter) return false;
            return true;
        });
        return sort === "recent" ? [...list].reverse() : list;
    }, [history, category, playerFilter, sort]);

    const stats = useMemo(() => {
        if (!history) return { events: 0, decisions: 0 };
        let events = 0;
        let decisions = 0;
        for (const turn of history.turns) {
            events += turn.sharedEvents.length;
            decisions += Object.values(turn.players).filter(Boolean).length;
        }
        return { events, decisions };
    }, [history]);

    const exportHistory = async () => {
        try {
            await api.downloadExport(id);
            toast.push("Registro de vida exportado en JSON.", "success");
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        }
    };

    if (loading) return <Loader label="Reconstruyendo la vida…" />;
    if (error || !history || !game) {
        return (
            <div className="container-page pt-10">
                <ErrorState message={error ?? "No se pudo abrir el historial."} onRetry={() => void load()} />
            </div>
        );
    }

    const currencyFor = (slot: PlayerSlot) =>
        slot === game.me.slot
            ? game.me.character.currentCurrency
            : game.opponent?.character.currentCurrency ?? game.me.character.currentCurrency;

    return (
        <div className="container-page pt-6 sm:pt-9">
            <PageHeader
                eyebrow="Historial de vida"
                title="Todo lo que ocurrió, año a año"
                description="El diario completo de la simulación: sucesos compartidos, decisiones privadas ya reveladas, tiradas, efectos y movimientos económicos. Nada se reconstruye en el navegador."
                back={
                    <Link
                        to={game.status === "finished" ? `/partida/${game.id}/final` : `/partida/${game.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-parchment-dim transition hover:text-gold"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la partida
                    </Link>
                }
                action={
                    <div className="flex flex-wrap gap-2">
                        <Badge tone={connection === "connected" ? "jade" : "amber"} dot>
                            {connection === "connected" ? "Actualizado en vivo" : "Conexión intermitente"}
                        </Badge>
                        <Button size="sm" variant="secondary" onClick={() => void exportHistory()}>
                            <Download className="h-4 w-4" /> Exportar JSON
                        </Button>
                    </div>
                }
            />

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBox label="Años registrados" value={history.total} icon={<History className="h-4 w-4" />} />
                <StatBox label="Sucesos compartidos" value={stats.events} icon={<Sparkles className="h-4 w-4" />} />
                <StatBox label="Decisiones reveladas" value={stats.decisions} icon={<Eye className="h-4 w-4" />} />
                <StatBox
                    label="Estado"
                    value={game.status === "finished" ? "Finalizada" : "En curso"}
                    icon={<Swords className="h-4 w-4" />}
                />
            </div>

            <Card className="mb-5 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="block min-w-[10rem]">
                            <span className="mb-1 flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                <Filter className="h-3 w-3" /> Categoría
                            </span>
                            <select
                                value={category}
                                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                                className="h-9 w-full rounded-lg border border-white/12 bg-ink-950/60 px-2.5 text-xs text-parchment focus:border-gold/50 focus:outline-none"
                            >
                                <option value="todas">Todas las categorías</option>
                                {["Decisiones", "Sucesos"].map((group) => (
                                    <optgroup key={group} label={group}>
                                        {categoryOptions
                                            .filter((option) => option.group === group)
                                            .map((option) => (
                                                <option key={`${group}-${option.value}`} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                    </optgroup>
                                ))}
                            </select>
                        </label>

                        {history.playerSlots.length > 1 ? (
                            <label className="block min-w-[9rem]">
                                <span className="mb-1 flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                    <UserRound className="h-3 w-3" /> Jugador
                                </span>
                                <select
                                    value={playerFilter}
                                    onChange={(event) => setPlayerFilter(event.target.value as PlayerFilter)}
                                    className="h-9 w-full rounded-lg border border-white/12 bg-ink-950/60 px-2.5 text-xs text-parchment focus:border-gold/50 focus:outline-none"
                                >
                                    <option value="todos">Ambos jugadores</option>
                                    {history.playerSlots.map((slot) => (
                                        <option key={slot} value={String(slot)}>
                                            {slot === game.me.slot ? `${game.me.alias} (tú)` : game.opponent?.alias ?? `Jugador ${slot}`}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={() => setSort((current) => (current === "recent" ? "chronological" : "recent"))}
                        className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-[0.68rem] text-parchment-dim transition hover:border-gold/25 hover:text-gold lg:self-auto"
                    >
                        <ArrowDownUp className="h-3.5 w-3.5" />
                        {sort === "recent" ? "Más reciente primero" : "Desde el principio"}
                    </button>
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950/50 p-1" aria-label="Vista del historial">
                        <button
                            type="button"
                            onClick={() => setView("relato")}
                            aria-pressed={view === "relato"}
                            className={`rounded-lg px-3 py-1.5 text-[0.68rem] font-semibold transition ${view === "relato" ? "bg-gold/15 text-gold-soft" : "text-parchment-faint hover:text-parchment"}`}
                        >
                            Relato
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("anual")}
                            aria-pressed={view === "anual"}
                            className={`rounded-lg px-3 py-1.5 text-[0.68rem] font-semibold transition ${view === "anual" ? "bg-gold/15 text-gold-soft" : "text-parchment-faint hover:text-parchment"}`}
                        >
                            Archivo anual
                        </button>
                    </div>
                </div>
                <p className="mt-3 border-t border-white/[0.05] pt-3 text-[0.62rem] text-parchment-faint">
                    Las decisiones aparecen aquí solo después de que el servidor haya resuelto el turno. Mientras
                    un turno está pendiente, las elecciones privadas no forman parte del historial.
                </p>
            </Card>

            {view === "relato" ? (
                <StoryFeed moments={filteredMoments} />
            ) : filteredTurns.length === 0 ? (
                <Card className="p-10 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-gold" />
                    <h2 className="mt-4 text-xl text-parchment">Todavía no hay páginas en este diario</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-parchment-dim">
                        {history.turns.length === 0
                            ? "La vida acaba de comenzar. El historial se llenará cuando se resuelva el primer año."
                            : "No hay turnos que coincidan con los filtros seleccionados."}
                    </p>
                </Card>
            ) : (
                <ol className="space-y-4">
                    {filteredTurns.map((turn) => {
                        const playerRecords = Object.entries(turn.players).filter(
                            ([slot]) => playerFilter === "todos" || slot === playerFilter,
                        ) as [string, TurnPlayerRecord][];
                        return (
                            <li key={turn.turn}>
                                <Card className="overflow-hidden">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.018] px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/25 bg-gold/10 font-display text-sm text-gold">
                                                {turn.age}
                                            </span>
                                            <div>
                                                <p className="text-sm text-parchment">A los {turn.age} años</p>
                                                <p className="text-[0.65rem] text-parchment-faint">{turn.year}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[0.62rem] text-parchment-faint">
                                            <span>Turno {turn.turn + 1}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{turn.sharedEvents.length} sucesos</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{Object.values(turn.players).filter(Boolean).length} decisiones</span>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                        <div className="space-y-2.5">
                                            <p className="eyebrow">Sucesos del mundo</p>
                                            {turn.sharedEvents.length > 0 ? (
                                                turn.sharedEvents.map((event) => (
                                                    <div key={event.eventId}>
                                                        <EventCard event={event} compact />
                                                        <p className="mt-1 px-1 font-mono text-[0.55rem] text-parchment-faint/70">
                                                            ID: {event.eventId}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-parchment-faint">
                                                    Sin sucesos externos este año.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2.5">
                                            <p className="eyebrow">Decisiones y consecuencias</p>
                                            {playerRecords.map(([slot, record]) => (
                                                <HistoryRecord
                                                    key={slot}
                                                    record={record}
                                                    currency={currencyFor(Number(slot) as PlayerSlot)}
                                                    mine={Number(slot) === game.me.slot}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </li>
                        );
                    })}
                </ol>
            )}

            {history.final ? (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/[0.035] p-5 sm:flex-row">
                    <p className="flex items-center gap-2 text-sm text-parchment">
                        <Lock className="h-4 w-4 text-gold" /> El resultado final ya está calculado y es inmutable.
                    </p>
                    <Link
                        to={`/partida/${game.id}/final`}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-ink-950"
                    >
                        Ver resultado final
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

function StoryFeed({ moments }: { moments: LifeMoment[] }) {
    if (moments.length === 0) {
        return (
            <Card className="p-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-gold" />
                <h2 className="mt-4 text-xl text-parchment">La historia aún está en blanco</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-parchment-dim">
                    Cuando el mundo empiece a moverse y tomes la primera decisión, esta página se llenará sola.
                </p>
            </Card>
        );
    }

    return (
        <ol className="space-y-4" aria-label="Relato de la vida">
            {moments.map((moment) => {
                const Icon = moment.kind === "mundo"
                    ? Sparkles
                    : moment.kind === "decision"
                        ? Eye
                        : moment.kind === "salud"
                            ? HeartPulse
                            : moment.kind === "migracion"
                                ? MapPin
                                : moment.kind === "final"
                                    ? Skull
                                    : moment.kind === "hito"
                                        ? History
                                        : ScrollText;
                return (
                    <li key={moment.id}>
                        <Card className="overflow-hidden p-4 sm:p-5">
                            <div className="flex flex-wrap items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                        <span>{moment.year}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{moment.age} años</span>
                                        {moment.month !== undefined ? (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <span>{new Date(2000, moment.month, 1).toLocaleString("es", { month: "long" })}</span>
                                            </>
                                        ) : null}
                                        {moment.alias ? <Badge tone={moment.kind === "decision" ? "gold" : "neutral"}>{moment.alias}</Badge> : null}
                                        {moment.place ? <span className="normal-case tracking-normal text-parchment-faint">⌖ {moment.place}</span> : null}
                                    </div>
                                    <h3 className="mt-2 font-display text-lg leading-snug text-parchment">{moment.title}</h3>
                                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-parchment-dim">{moment.text}</p>
                                    {moment.decision ? (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <Badge tone="neutral">Elegiste: {moment.decision.optionLabel}</Badge>
                                            {moment.decision.success !== null ? (
                                                <Badge tone={moment.decision.success ? "jade" : "rose"}>
                                                    {moment.decision.success ? "Salió bien" : "No salió"}
                                                    {moment.decision.chance !== null ? ` · ${formatPercent(moment.decision.chance, 0)}` : ""}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    {moment.effects?.length ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {moment.effects.slice(0, 6).map((effect, index) => (
                                                <span key={`${effect}-${index}`} className="rounded-full border border-white/10 px-2 py-0.5 text-[0.6rem] text-parchment-faint">
                                                    {effect}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </Card>
                    </li>
                );
            })}
        </ol>
    );
}


function StatBox({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
    return (
        <SoftCard className="p-4">
            <div className="flex items-center gap-2 text-gold">{icon}</div>
            <p className="mt-2 font-display text-2xl text-parchment">{value}</p>
            <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</p>
        </SoftCard>
    );
}

function HistoryRecord({
    record,
    currency,
    mine,
}: {
    record: TurnPlayerRecord;
    currency: GameView["me"]["character"]["currentCurrency"];
    mine: boolean;
}) {
    return (
        <SoftCard className={`p-4 ${mine ? "border-gold/15" : "border-jade/15"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-[0.65rem] font-semibold uppercase tracking-[0.1em] ${mine ? "text-gold-soft" : "text-jade"}`}>
                    {record.alias}
                </span>
                <div className="flex items-center gap-1.5">
                    {record.decisionCategory ? (
                        <Badge tone="neutral">{DECISION_CATEGORY_META[record.decisionCategory].label}</Badge>
                    ) : null}
                    {record.success !== null ? (
                        <Badge tone={record.success ? "jade" : "rose"}>{record.success ? "Éxito" : "No salió"}</Badge>
                    ) : null}
                </div>
            </div>
            <p className="mt-2 text-sm text-parchment">{record.decisionTitle}</p>
            <p className="mt-0.5 text-xs text-parchment-dim">{record.optionLabel}</p>
            {record.narrative.length > 0 ? (
                <ul className="mt-2 space-y-1">
                    {record.narrative.map((line, index) => (
                        <li key={index} className={`text-[0.68rem] leading-relaxed ${/falleci|murió|muerte/i.test(line) ? "text-rose-300" : /nació|llegó a la familia/i.test(line) ? "text-emerald-300" : "text-parchment-faint"}`}>
                            {line}
                        </li>
                    ))}
                </ul>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(record.statDelta).map(([key, value]) =>
                    value ? (
                        <span
                            key={key}
                            className={`rounded-full border px-2 py-0.5 text-[0.62rem] ${value > 0 ? "border-jade/25 bg-jade/5 text-jade" : "border-rose/25 bg-rose/5 text-rose"
                                }`}
                        >
                            {CORE_STAT_META[key as CoreStatKey].label} {value > 0 ? "+" : ""}
                            {value}
                        </span>
                    ) : null,
                )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/[0.06] pt-2.5 text-[0.62rem] sm:grid-cols-3">
                <div>
                    <dt className="text-parchment-faint">Probabilidad</dt>
                    <dd className="mt-0.5 text-parchment">
                        {record.chance !== null ? formatPercent(record.chance, 0) : "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-parchment-faint">Tirada</dt>
                    <dd className="mt-0.5 font-mono text-parchment">
                        {record.roll !== null ? record.roll.toFixed(1) : "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-parchment-faint">Puntuación tras año</dt>
                    <dd className="mt-0.5 text-parchment">{record.scoreAfter.toFixed(1)}</dd>
                </div>
                <div>
                    <dt className="text-parchment-faint">Ingresos</dt>
                    <dd className="mt-0.5 text-jade">{formatMoney(record.economic.income, currency)}</dd>
                </div>
                <div>
                    <dt className="text-parchment-faint">Gastos</dt>
                    <dd className="mt-0.5 text-rose">{formatMoney(record.economic.expenses, currency)}</dd>
                </div>
                <div>
                    <dt className="text-parchment-faint">Saldo / deuda</dt>
                    <dd className="mt-0.5 text-parchment">
                        {formatMoney(record.economic.balance, currency)} · {formatMoney(record.economic.debt, currency)}
                    </dd>
                </div>
            </dl>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-2">
                <span className="font-mono text-[0.55rem] text-parchment-faint/70">decisión: {record.decisionId}</span>
                <span className="font-mono text-[0.55rem] text-parchment-faint/70">opción: {record.optionId}</span>
                {record.death ? (
                    <span className="ml-auto flex items-center gap-1 text-[0.62rem] text-rose">
                        <Skull className="h-3 w-3" /> {record.death.cause}
                    </span>
                ) : null}
            </div>
        </SoftCard>
    );
}
