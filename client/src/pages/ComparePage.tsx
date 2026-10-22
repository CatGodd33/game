import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type {
    CoreStatKey,
    GameView,
    HistoryResponse,
    PlayerSlot,
    ScoreCategoryKey,
    TurnPlayerRecord,
} from "@life-duel/shared";
import {
    CORE_STAT_META,
    SCORE_CATEGORY_META,
    formatMoney,
    formatPercent,
} from "@life-duel/shared";
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BookOpen,
    Crown,
    Equal,
    History,
    Skull,
    Swords,
    Trophy,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { CharacterPanel } from "../components/game/CharacterPanel";
import { ConnectionBadge } from "../components/game/ConnectionBadge";
import { ScoreChart } from "../components/game/ScoreChart";
import { Badge } from "../components/ui/Badge";
import { Card, SoftCard } from "../components/ui/Card";
import { ErrorState, Loader } from "../components/ui/States";
import { useDemographics } from "../hooks/useDemographics";
import { useGameSocket } from "../hooks/useGameSocket";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

const SCORE_KEYS: ScoreCategoryKey[] = [
    "health",
    "happiness",
    "knowledge",
    "relationships",
    "economic",
    "education",
    "longevity",
];

export function ComparePage() {
    const { id = "" } = useParams();
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const { countryName } = useDemographics();
    const [game, setGame] = useState<GameView | null>(null);
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            void api.history(id).then(setHistory).catch(() => undefined);
        },
    });

    const decisions = useMemo(() => {
        if (!history) return [];
        const rows: { age: number; slot: PlayerSlot; record: TurnPlayerRecord }[] = [];
        for (const turn of [...history.turns].reverse()) {
            for (const [slot, record] of Object.entries(turn.players)) {
                if (record) rows.push({ age: turn.age, slot: Number(slot) as PlayerSlot, record });
            }
        }
        return rows.slice(0, 10);
    }, [history]);

    if (loading) return <Loader label="Comparando ambas vidas…" />;
    if (error || !game) {
        return (
            <div className="container-page pt-10">
                <ErrorState message={error ?? "No se pudo cargar el comparador."} onRetry={() => void load()} />
            </div>
        );
    }

    const opponent = game.opponent;
    const aliases = { [game.me.slot]: game.me.alias, ...(opponent ? { [opponent.slot]: opponent.alias } : {}) } as Partial<
        Record<PlayerSlot, string>
    >;
    const difference = opponent ? game.me.score.total - opponent.score.total : 0;
    const leader =
        !opponent || Math.abs(difference) < 0.25 ? null : difference > 0 ? game.me.slot : opponent.slot;

    return (
        <div className="container-page pt-6 sm:pt-9">
            <PageHeader
                eyebrow="Comparador de vidas"
                title="Dos caminos sobre la misma semilla"
                description="Las cifras que ves son las del servidor. Las decisiones de cada jugador solo aparecen después de que el turno se haya resuelto para ambos."
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
                        <ConnectionBadge state={connection} />
                        {game.status === "finished" ? <Badge tone="gold">Resultado final</Badge> : <Badge tone="amber">En curso</Badge>}
                    </div>
                }
            />

            {!opponent ? (
                <Card className="mb-6 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="eyebrow mb-1">MODO INDIVIDUAL</p>
                        <h2 className="text-xl text-parchment">Esta vida no tiene rival todavía</h2>
                        <p className="mt-1 text-xs leading-relaxed text-parchment-dim">
                            Puedes revisar tu propia evolución. Para comparar dos trayectorias, crea un duelo y comparte
                            el código con otra persona.
                        </p>
                    </div>
                    <Link
                        to="/duelo"
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-ink-950"
                    >
                        <Swords className="h-4 w-4" /> Crear un duelo
                    </Link>
                </Card>
            ) : (
                <SoftCard className="mb-6 overflow-hidden">
                    <div className="grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="p-5">
                            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-gold-soft">Jugador {game.me.slot}</p>
                            <p className="mt-1 text-lg text-parchment">{game.me.alias}</p>
                            <p className="mt-0.5 text-xs text-parchment-faint">
                                {game.me.character.alive ? `Vivo · ${game.me.character.age} años` : `Fallecido · ${game.me.character.ageAtDeath} años`}
                            </p>
                        </div>
                        <div className="flex items-center justify-center border-y border-white/[0.06] p-4 sm:border-x sm:border-y-0">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    {leader === null ? (
                                        <Equal className="h-4 w-4 text-parchment-faint" />
                                    ) : (
                                        <Crown className="h-4 w-4 text-gold" />
                                    )}
                                    <span className="font-display text-2xl text-parchment">
                                        {leader === null ? "Empate" : `${Math.abs(difference).toFixed(1)} pts`}
                                    </span>
                                </div>
                                <p className="mt-1 text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                    {leader === null
                                        ? "Diferencia mínima"
                                        : leader === game.me.slot
                                            ? `Ventaja de ${game.me.alias}`
                                            : `Ventaja de ${opponent.alias}`}
                                </p>
                            </div>
                        </div>
                        <div className="p-5 sm:text-right">
                            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-jade">Jugador {opponent.slot}</p>
                            <p className="mt-1 text-lg text-parchment">{opponent.alias}</p>
                            <p className="mt-0.5 text-xs text-parchment-faint">
                                {opponent.character.alive
                                    ? `Vivo · ${opponent.character.age} años`
                                    : `Fallecido · ${opponent.character.ageAtDeath} años`}
                            </p>
                        </div>
                    </div>
                </SoftCard>
            )}

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ScoreTile label="Puntuación actual" me={game.me.score.total} rival={opponent?.score.total ?? null} />
                <ScoreTile
                    label="Salud"
                    me={game.me.character.stats.health}
                    rival={opponent?.character.stats.health ?? null}
                />
                <ScoreTile
                    label="Felicidad"
                    me={game.me.character.stats.happiness}
                    rival={opponent?.character.stats.happiness ?? null}
                />
                <ScoreTile
                    label="Relaciones"
                    me={game.me.character.stats.relationships}
                    rival={opponent?.character.stats.relationships ?? null}
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                <CharacterPanel player={game.me} world={game.world} countryName={countryName} />
                {opponent ? <CharacterPanel player={opponent} world={game.world} countryName={countryName} /> : null}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Card className="p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-gold" aria-hidden="true" />
                        <h2 className="text-xl text-parchment">Puntuación por categorías</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[34rem] border-separate border-spacing-y-1.5 text-sm">
                            <thead>
                                <tr className="text-left text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                    <th className="pb-1 font-medium">Categoría</th>
                                    <th className="pb-1 text-right font-medium">{game.me.alias}</th>
                                    {opponent ? <th className="pb-1 text-right font-medium">{opponent.alias}</th> : null}
                                    {opponent ? <th className="pb-1 text-right font-medium">Diferencia</th> : null}
                                </tr>
                            </thead>
                            <tbody>
                                {SCORE_KEYS.map((key) => {
                                    const meta = SCORE_CATEGORY_META[key];
                                    const mine = game.me.score.categories[key];
                                    const rival = opponent?.score.categories[key] ?? 0;
                                    const delta = mine - rival;
                                    return (
                                        <tr key={key} className="rounded-xl bg-white/[0.025]">
                                            <td className="rounded-l-xl px-3 py-2.5">
                                                <span className="flex items-center gap-2 text-xs text-parchment">
                                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                                    {meta.label}
                                                    <span className="text-[0.58rem] text-parchment-faint">{mine !== undefined ? `${game.me.score.weights[key]} %` : ""}</span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gold">{mine.toFixed(1)}</td>
                                            {opponent ? (
                                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-jade">{rival.toFixed(1)}</td>
                                            ) : null}
                                            {opponent ? (
                                                <td className={`rounded-r-xl px-3 py-2.5 text-right text-xs tabular-nums ${delta > 0 ? "text-jade" : delta < 0 ? "text-rose" : "text-parchment-faint"}`}>
                                                    {delta > 0 ? "+" : ""}
                                                    {delta.toFixed(1)}
                                                </td>
                                            ) : null}
                                        </tr>
                                    );
                                })}
                                <tr className="font-semibold">
                                    <td className="px-3 py-3 text-xs text-parchment">Puntuación total</td>
                                    <td className="px-3 py-3 text-right text-lg tabular-nums text-gold">{game.me.score.total.toFixed(1)}</td>
                                    {opponent ? (
                                        <td className="px-3 py-3 text-right text-lg tabular-nums text-jade">{opponent.score.total.toFixed(1)}</td>
                                    ) : null}
                                    {opponent ? (
                                        <td className={`px-3 py-3 text-right text-xs ${difference > 0 ? "text-jade" : difference < 0 ? "text-rose" : "text-parchment-faint"}`}>
                                            {difference > 0 ? "+" : ""}
                                            {difference.toFixed(1)}
                                        </td>
                                    ) : null}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-[0.62rem] leading-relaxed text-parchment-faint">
                        La puerta de bienestar reduce la puntuación cuando salud o felicidad son muy bajas. La
                        longevidad se relativiza por la esperanza de vida del país y solo pesa un 5 %.
                    </p>
                </Card>

                <Card className="p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gold" aria-hidden="true" />
                            <h2 className="text-xl text-parchment">Evolución</h2>
                        </div>
                        <Badge tone="neutral">Toda la vida</Badge>
                    </div>
                    <ScoreChart points={game.scoreHistory} aliases={aliases} maxAge={game.config.maxAge} />
                </Card>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gold" />
                        <h2 className="text-xl text-parchment">Economía y familia</h2>
                    </div>
                    <div className="space-y-2">
                        <CompareRow
                            label="Dinero disponible"
                            me={formatMoney(game.me.character.finance.money, game.me.character.currentCurrency)}
                            rival={
                                opponent
                                    ? formatMoney(opponent.character.finance.money, opponent.character.currentCurrency)
                                    : "—"
                            }
                        />
                        <CompareRow
                            label="Ingresos anuales"
                            me={formatMoney(game.me.character.finance.annualIncome, game.me.character.currentCurrency)}
                            rival={
                                opponent
                                    ? formatMoney(opponent.character.finance.annualIncome, opponent.character.currentCurrency)
                                    : "—"
                            }
                        />
                        <CompareRow
                            label="Deuda"
                            me={formatMoney(game.me.character.finance.debt, game.me.character.currentCurrency)}
                            rival={
                                opponent
                                    ? formatMoney(opponent.character.finance.debt, opponent.character.currentCurrency)
                                    : "—"
                            }
                        />
                        <CompareRow
                            label="Hijos"
                            me={String(game.me.character.children)}
                            rival={opponent ? String(opponent.character.children) : "—"}
                        />
                        <CompareRow
                            label="Hitos"
                            me={String(game.me.character.milestones.length)}
                            rival={opponent ? String(opponent.character.milestones.length) : "—"}
                        />
                        <CompareRow
                            label="Riesgo de mortalidad"
                            me={`${game.me.character.mortalityRisk.toFixed(2)} %`}
                            rival={opponent ? `${opponent.character.mortalityRisk.toFixed(2)} %` : "—"}
                        />
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <History className="h-4 w-4 text-gold" />
                        <h2 className="text-xl text-parchment">Decisiones reveladas</h2>
                    </div>
                    {decisions.length === 0 ? (
                        <p className="text-xs leading-relaxed text-parchment-faint">
                            Aún no se ha resuelto ningún turno. Las decisiones aparecerán aquí cuando ambos hayáis
                            confirmado.
                        </p>
                    ) : (
                        <ol className="space-y-2">
                            {decisions.map(({ age, slot, record }, index) => {
                                const mine = slot === game.me.slot;
                                return (
                                    <li
                                        key={`${age}-${slot}-${index}`}
                                        className={`rounded-xl border p-3 ${mine ? "border-gold/15 bg-gold/[0.025]" : "border-jade/15 bg-jade/[0.02]"}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${mine ? "text-gold-soft" : "text-jade"}`}>
                                                {mine ? game.me.alias : opponent?.alias ?? `Jugador ${slot}`}
                                            </span>
                                            <span className="text-[0.62rem] text-parchment-faint">{age} años</span>
                                        </div>
                                        <p className="mt-1 text-xs text-parchment">{record.optionLabel}</p>
                                        <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-relaxed text-parchment-faint">
                                            {record.narrative.join(" ") || "Sin narrativa adicional."}
                                        </p>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </Card>
            </div>

            {game.status === "finished" ? (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/[0.035] p-5 sm:flex-row">
                    <p className="text-sm text-parchment">La competición ha terminado. Consulta el resumen definitivo y la tarjeta compartible.</p>
                    <Link
                        to={`/partida/${game.id}/final`}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-ink-950"
                    >
                        <Trophy className="h-4 w-4" /> Ver resultado final <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
                <Link
                    to={`/partida/${game.id}/historial`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-dim hover:text-gold"
                >
                    <History className="h-3.5 w-3.5" /> Historial completo
                </Link>
                <Link
                    to={game.status === "finished" ? `/partida/${game.id}/final` : `/partida/${game.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-dim hover:text-gold"
                >
                    <Swords className="h-3.5 w-3.5" /> Volver al duelo
                </Link>
            </div>
        </div>
    );
}

function ScoreTile({ label, me, rival }: { label: string; me: number; rival: number | null }) {
    const leading = rival === null ? null : me > rival ? "me" : me < rival ? "rival" : "tie";
    return (
        <SoftCard className="p-4">
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                    <span className="text-[0.58rem] text-gold-soft">Tú</span>
                    <p className="font-display text-2xl text-gold">{me.toFixed(1)}</p>
                </div>
                {rival !== null ? (
                    <div className="text-right">
                        <span className="text-[0.58rem] text-jade">Rival</span>
                        <p className="font-display text-xl text-jade">{rival.toFixed(1)}</p>
                    </div>
                ) : null}
            </div>
            {leading ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                        className={`h-full rounded-full ${leading === "me" ? "bg-gold" : leading === "rival" ? "bg-jade" : "bg-parchment-faint"}`}
                        style={{ width: `${Math.min(100, ((me + 1) / Math.max(1, me + (rival ?? 0) + 2)) * 100)}%` }}
                    />
                </div>
            ) : null}
        </SoftCard>
    );
}

function CompareRow({ label, me, rival }: { label: string; me: string; rival: string }) {
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/[0.05] py-2 text-xs last:border-0">
            <span className="text-right font-medium tabular-nums text-gold">{me}</span>
            <span className="text-center text-[0.6rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</span>
            <span className="font-medium tabular-nums text-jade">{rival}</span>
        </div>
    );
}
