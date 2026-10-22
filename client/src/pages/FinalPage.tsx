import { LifeFarewell } from "../components/game/LifeFarewell";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
    CoreStatKey,
    FinalPlayerResult,
    GameView,
    HistoryResponse,
    PlayerSlot,
    ScoreCategoryKey,
} from "@life-duel/shared";
import {
    APP_NAME,
    CORE_STAT_META,
    SCORE_CATEGORY_META,
    educationLabel,
    formatMoney,
    formatScore,
    stageForAge,
} from "@life-duel/shared";
import {
    ArrowLeft,
    Award,
    BookOpen,
    Bot,
    Check,
    Crown,
    Download,
    Equal,
    Flag,
    Globe2,
    HeartHandshake,
    History,
    Loader2,
    MapPin,
    RefreshCw,
    RotateCcw,
    Share2,
    Skull,
    Sparkles,
    Swords,
    Trophy,
    Wallet,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { LifeScene } from "../components/art/LifeScene";
import { Portrait } from "../components/art/Portrait";
import { ScoreChart } from "../components/game/ScoreChart";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { ErrorState, Loader } from "../components/ui/States";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useToast } from "../components/ui/ToastProvider";
import { useDemographics } from "../hooks/useDemographics";
import { useGameSocket } from "../hooks/useGameSocket";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { createResultCard, downloadBlob } from "../features/result/shareCard";
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

export function FinalPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const { countryName } = useDemographics();
    const [game, setGame] = useState<GameView | null>(null);
    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<"share" | "save" | "rematch" | "epilogue" | "export" | null>(null);
    const [epilogue, setEpilogue] = useState<string | null>(null);
    const [epilogueSource, setEpilogueSource] = useState<"deepseek" | "local" | null>(null);
    const [epilogueNotice, setEpilogueNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await ensureSession();
            const { game: loaded } = await api.getGame(id);
            setGame(loaded);
            if (loaded.final) {
                setEpilogue(loaded.me.aiNarrative);
                setEpilogueSource(loaded.me.aiNarrative ? "local" : null);
                try {
                    setHistory(await api.history(id));
                } catch {
                    setHistory(null);
                }
            }
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
        onGame: (next) => setGame(next),
        onRematch: ({ code }) => {
            toast.push("Tu rival ha iniciado una revancha. Entrando en la nueva sala…", "info");
            navigate(`/sala/${code}`);
        },
        onError: (message) => toast.push(message, "error"),
    });

    const final = game?.final ?? null;
    const players = final ? [final.players[1], final.players[2]].filter((player): player is FinalPlayerResult => Boolean(player)) : [];
    const isDuel = game?.mode === "duel";
    const winner = final?.winner ?? null;
    const winnerPlayer = final && typeof winner === "number" ? final.players[winner] : null;
    const aliases: Partial<Record<PlayerSlot, string>> = {};
    for (const player of players) aliases[player.slot] = player.alias;

    const chartPoints = useMemo(() => {
        if (!final) return [];
        const map = new Map<number, { age: number; players: Partial<Record<PlayerSlot, number>> }>();
        for (const player of players) {
            for (const point of player.scoreHistory) {
                const existing = map.get(point.age) ?? { age: point.age, players: {} };
                existing.players[player.slot] = point.score;
                map.set(point.age, existing);
            }
        }
        return [...map.values()].sort((first, second) => first.age - second.age);
    }, [final, players]);

    const economicPoints = useMemo(() => {
        if (!history) return [];
        const map = new Map<number, { age: number; players: Partial<Record<PlayerSlot, number>> }>();
        for (const turn of history.turns) {
            for (const [slot, record] of Object.entries(turn.players)) {
                if (!record) continue;
                const existing = map.get(turn.age) ?? { age: turn.age, players: {} };
                existing.players[Number(slot) as PlayerSlot] = record.economic.balance - record.economic.debt;
                map.set(turn.age, existing);
            }
        }
        return [...map.values()].sort((first, second) => first.age - second.age);
    }, [history]);

    const currencyFor = (slot: PlayerSlot) =>
        game?.me.slot === slot
            ? game.me.character.currentCurrency
            : game?.opponent?.character.currentCurrency ?? game?.me.character.currentCurrency;

    const shareCard = async (mode: "share" | "save") => {
        if (!game?.final) return;
        setBusy(mode === "share" ? "share" : "save");
        try {
            const blob = await createResultCard(game);
            const fileName = `${APP_NAME.toLowerCase().replaceAll(" ", "-")}-${game.world.birth.givenName}-${game.world.birth.year}.png`;
            if (mode === "save") {
                downloadBlob(blob, fileName);
                toast.push("Tarjeta resumen descargada.", "success");
            } else {
                const file = new File([blob], fileName, { type: "image/png" });
                const shareData: ShareData = {
                    title: "Mi resultado en LIFE DUEL",
                    text: `${game.world.birth.givenName} · ${game.world.birth.countryName}. Una vida, dos caminos.`,
                    files: [file],
                };
                if (navigator.canShare?.(shareData)) {
                    await navigator.share(shareData);
                } else {
                    downloadBlob(blob, fileName);
                    toast.push("Compartir no está disponible aquí. Hemos descargado la tarjeta.", "info");
                }
            }
        } catch (reason) {
            if (reason instanceof DOMException && reason.name === "AbortError") return;
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const exportResult = async () => {
        if (!game) return;
        setBusy("export");
        try {
            await api.downloadExport(game.id);
            toast.push("Resultado y registro completo exportados en JSON.", "success");
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const generateEpilogue = async () => {
        if (!game) return;
        setBusy("epilogue");
        try {
            const response = await api.narrative(game.id);
            setEpilogue(response.text);
            setEpilogueSource(response.source);
            setEpilogueNotice(response.notice ?? null);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const rematch = async () => {
        if (!game) return;
        setBusy("rematch");
        try {
            const { lobby } = await api.rematch(game.id, game.config);
            toast.push("Nueva revancha creada con la misma configuración.", "success");
            navigate(`/sala/${lobby.code}`);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <Loader label="Calculando el legado…" />;
    if (error || !game) {
        return (
            <div className="container-page pt-10">
                <ErrorState message={error ?? "No se pudo abrir el resultado."} onRetry={() => void load()} />
            </div>
        );
    }

    if (!final) {
        return (
            <div className="container-page pt-10">
                <Card className="mx-auto max-w-xl p-8 text-center">
                    <Swords className="mx-auto h-8 w-8 text-gold" />
                    <h1 className="mt-4 text-2xl text-parchment">Esta vida todavía no ha terminado</h1>
                    <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
                        El resultado final se calculará cuando concluya la vida o el duelo completo. Puedes volver a
                        la partida y continuar.
                    </p>
                    <Link
                        to={`/partida/${game.id}`}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-ink-950"
                    >
                        Volver a la partida
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-page pt-6 sm:pt-9">
            <PageHeader
                eyebrow="Resultado final"
                title={
                    isDuel
                        ? winner === "tie"
                            ? "Dos vidas, un empate"
                            : winnerPlayer
                                ? `${winnerPlayer.alias} gana el duelo`
                                : "El duelo ha terminado"
                        : "El balance de una vida"
                }
                description={
                    isDuel
                        ? final.reason
                        : "Una vida completa, con sus decisiones, sus sucesos y su puntuación final. Puedes guardar el registro, compartir la tarjeta o empezar otra vida."
                }
                back={
                    <Link to="/partidas" className="inline-flex items-center gap-1.5 text-xs text-parchment-dim transition hover:text-gold">
                        <ArrowLeft className="h-3.5 w-3.5" /> Mis vidas
                    </Link>
                }
                action={
                    <div className="flex flex-wrap gap-2">
                        <Badge tone={connection === "connected" ? "jade" : "amber"} dot>
                            {connection === "connected" ? "En vivo" : "Reconectando"}
                        </Badge>
                        <Badge tone="gold">
                            <Trophy className="h-3 w-3" /> Resultado bloqueado
                        </Badge>
                    </div>
                }
            />

            <Card className="relative mb-5 overflow-hidden">
                <div className="absolute inset-0">
                    <LifeScene
                        stage={stageForAge(Math.max(...players.map((player) => player.ageAtDeath), 0))}
                        seed={`final-${game.world.seedFingerprint}`}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/45" />
                <div className="relative p-6 sm:p-9">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="gold" dot>
                            El mundo compartido
                        </Badge>
                        <Badge tone="sky">
                            <MapPin className="h-3 w-3" /> {game.world.birth.countryName} · {game.world.birth.year}
                        </Badge>
                        <Badge tone="neutral">Semilla {game.world.seedFingerprint.toUpperCase().slice(0, 10)}</Badge>
                    </div>

                    {isDuel ? (
                        <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                            {([1, 2] as PlayerSlot[]).map((slot) => {
                                const player = final.players[slot];
                                if (!player) return <div key={slot} />;
                                const isWinner = winner === slot;
                                return (
                                    <div key={slot} className={slot === 2 ? "sm:text-right" : ""}>
                                        <div className={`flex items-center gap-2 ${slot === 2 ? "sm:justify-end" : ""}`}>
                                            {isWinner ? <Crown className="h-4 w-4 text-gold" /> : null}
                                            <span className="text-[0.62rem] uppercase tracking-[0.16em] text-parchment-faint">
                                                Jugador {slot}
                                            </span>
                                        </div>
                                        <p className={`mt-1 font-display text-3xl ${isWinner ? "text-gold" : "text-parchment"}`}>
                                            {player.alias}
                                        </p>
                                        <p className="mt-1 text-xs text-parchment-dim">
                                            {player.givenName} · {player.ageAtDeath} años · {player.causeOfDeath ?? "causa no determinada"}
                                        </p>
                                        <p className={`mt-2 font-display text-4xl ${isWinner ? "text-gold" : "text-parchment"}`}>
                                            {formatScore(player.score.total)}
                                            <span className="ml-1 text-xs uppercase tracking-[0.15em] text-parchment-faint">pts</span>
                                        </p>
                                    </div>
                                );
                            })}
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-ink-950/40 px-6 py-4 text-center backdrop-blur-md">
                                {winner === "tie" ? (
                                    <>
                                        <Equal className="h-5 w-5 text-parchment-faint" />
                                        <span className="mt-1 font-display text-xl text-parchment">Empate</span>
                                    </>
                                ) : (
                                    <>
                                        <Trophy className="h-5 w-5 text-gold" />
                                        <span className="mt-1 font-display text-xl text-parchment">Margen</span>
                                        <span className="text-sm font-semibold text-gold">+{final.margin.toFixed(1)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 flex flex-wrap items-end gap-6">
                            <Portrait
                                seed={`${final.players[1]?.givenName}-final`}
                                stage={stageForAge(final.players[1]?.ageAtDeath ?? 0)}
                                sex={game.world.birth.sex}
                                size="lg"
                                className="ring-2 ring-white/10"
                            />
                            <div>
                                <h2 className="text-4xl text-parchment">
                                    {final.players[1]?.givenName} {game.world.birth.surname}
                                </h2>
                                <p className="mt-1 text-sm text-parchment-dim">
                                    {final.players[1]?.ageAtDeath} años · {final.players[1]?.causeOfDeath ?? "causa no determinada"}
                                </p>
                            </div>
                            <div className="ml-auto">
                                <ProgressRing
                                    value={final.players[1]?.score.total ?? 0}
                                    size={100}
                                    color="#d8b875"
                                    sublabel="puntos"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                        <Button variant="primary" onClick={() => void shareCard("share")} loading={busy === "share"}>
                            <Share2 className="h-4 w-4" /> Compartir tarjeta
                        </Button>
                        <Button variant="secondary" onClick={() => void shareCard("save")} loading={busy === "save"}>
                            <Download className="h-4 w-4" /> Descargar tarjeta
                        </Button>
                        <Button variant="secondary" onClick={() => void exportResult()} loading={busy === "export"}>
                            <Download className="h-4 w-4" /> Guardar resultado JSON
                        </Button>
                        {isDuel ? (
                            <Button variant="soft" onClick={() => void rematch()} loading={busy === "rematch"}>
                                <RotateCcw className="h-4 w-4" /> Revancha
                            </Button>
                        ) : (
                            <Link
                                to="/nueva-vida"
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-5 text-sm font-medium text-gold-soft transition hover:bg-gold/15"
                            >
                                <RefreshCw className="h-4 w-4" /> Vivir otra vida
                            </Link>
                        )}
                    </div>
                </div>
            </Card>

            {!isDuel&&players[0]?<LifeFarewell player={players[0]}/>:null}
            {isDuel ? (
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <RoundSummary
                        label="Resultado"
                        value={winner === "tie" ? "Empate" : winnerPlayer?.alias ?? "—"}
                        hint={final.margin > 0 ? `Margen de ${final.margin.toFixed(1)} puntos` : "Diferencia mínima"}
                    />
                    <RoundSummary
                        label="Categorías ganadas"
                        value={String(Object.values(final.categoryWinners).filter((value) => value !== "tie").length)}
                        hint="7 categorías evaluadas"
                    />
                    <RoundSummary
                        label="Vidas terminadas"
                        value={String(players.length)}
                        hint={`Semilla ${game.world.seedFingerprint.slice(0, 8)}`}
                    />
                </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2">
                {players.map((player) => (
                    <FinalPlayerCard
                        key={player.slot}
                        player={player}
                        game={game}
                        countryName={countryName}
                        winner={isDuel ? winner === player.slot : null}
                    />
                ))}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <Card className="p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <History className="h-4 w-4 text-gold" />
                        <h2 className="text-xl text-parchment">Evolución de la puntuación</h2>
                    </div>
                    <ScoreChart points={chartPoints} aliases={aliases} maxAge={game.config.maxAge} />
                </Card>

                <Card className="p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gold" />
                        <h2 className="text-xl text-parchment">Evolución económica</h2>
                    </div>
                    {economicPoints.length > 1 ? (
                        <EconomicTrail points={economicPoints} aliases={aliases} currencyFor={currencyFor} />
                    ) : (
                        <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-relaxed text-parchment-faint">
                            No hay suficientes años registrados para dibujar la trayectoria económica. Las cifras
                            finales están disponibles en cada resumen individual.
                        </p>
                    )}
                </Card>
            </div>

            {isDuel ? (
                <Card className="mt-5 p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Award className="h-4 w-4 text-gold" />
                        <h2 className="text-xl text-parchment">Resultado por categorías</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[36rem] border-separate border-spacing-y-1.5 text-sm">
                            <thead>
                                <tr className="text-left text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">
                                    <th className="pb-1 font-medium">Categoría</th>
                                    <th className="pb-1 text-right font-medium">{final.players[1]?.alias ?? "Jugador 1"}</th>
                                    <th className="pb-1 text-right font-medium">{final.players[2]?.alias ?? "Jugador 2"}</th>
                                    <th className="pb-1 text-right font-medium">Ganador</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SCORE_KEYS.map((key) => {
                                    const meta = SCORE_CATEGORY_META[key];
                                    const first = final.players[1]?.score.categories[key] ?? 0;
                                    const second = final.players[2]?.score.categories[key] ?? 0;
                                    const categoryWinner = final.categoryWinners[key];
                                    return (
                                        <tr key={key} className="rounded-xl bg-white/[0.025]">
                                            <td className="rounded-l-xl px-3 py-2.5">
                                                <span className="flex items-center gap-2 text-xs text-parchment">
                                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${categoryWinner === 1 ? "text-gold" : "text-parchment-dim"}`}>
                                                {first.toFixed(1)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${categoryWinner === 2 ? "text-jade" : "text-parchment-dim"}`}>
                                                {second.toFixed(1)}
                                            </td>
                                            <td className="rounded-r-xl px-3 py-2.5 text-right text-[0.65rem] text-parchment-faint">
                                                {categoryWinner === "tie" ? "Empate" : categoryWinner ? `Jugador ${categoryWinner}` : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-[0.62rem] leading-relaxed text-parchment-faint">
                        Pesos aplicados: {Object.entries(game.config.scoringWeights).map(([key, value]) => `${SCORE_CATEGORY_META[key as ScoreCategoryKey].label} ${value} %`).join(" · ")}.
                        La puerta de bienestar y el umbral de empate de 0,25 puntos se aplican de forma uniforme.
                    </p>
                </Card>
            ) : null}

            <Card className="mt-5 overflow-hidden">
                <div className="border-b border-white/[0.07] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-gold" />
                            <h2 className="text-xl text-parchment">Epílogo de {game.me.alias}</h2>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => void generateEpilogue()} loading={busy === "epilogue"}>
                            <Bot className="h-4 w-4" /> {epilogue ? "Regenerar epílogo" : "Generar epílogo"}
                        </Button>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-parchment-faint">
                        Texto opcional generado en el servidor. Si DeepSeek no está configurado, se usa un epílogo
                        local determinista. La IA nunca modifica estadísticas ni resultados.
                    </p>
                </div>
                <div className="p-5">
                    {epilogue ? (
                        <>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-parchment-dim">{epilogue}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge tone={epilogueSource === "deepseek" ? "violet" : "jade"}>
                                    {epilogueSource === "deepseek" ? "DeepSeek" : "Narrativa local"}
                                </Badge>
                                {epilogueNotice ? <span className="text-[0.65rem] text-amber">{epilogueNotice}</span> : null}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-parchment-faint">
                            Genera un cierre narrativo breve a partir de los hechos ya registrados. No consume tokens
                            durante la partida.
                        </p>
                    )}
                </div>
            </Card>

            <div className="mt-5 flex flex-wrap gap-2">
                <Link
                    to={`/partida/${game.id}/historial`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-dim hover:text-gold"
                >
                    <BookOpen className="h-3.5 w-3.5" /> Historial completo
                </Link>
                <Link
                    to={`/partida/${game.id}/comparar`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-dim hover:text-gold"
                >
                    <Swords className="h-3.5 w-3.5" /> Comparador
                </Link>
                <Link
                    to="/partidas"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-dim hover:text-gold"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Todas mis vidas
                </Link>
            </div>
        </div>
    );
}

function RoundSummary({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <SoftCard className="p-4">
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-parchment-faint">{label}</p>
            <p className="mt-1 font-display text-xl text-parchment">{value}</p>
            <p className="mt-0.5 text-[0.62rem] text-parchment-faint">{hint}</p>
        </SoftCard>
    );
}

function FinalPlayerCard({
    player,
    game,
    countryName,
    winner,
}: {
    player: FinalPlayerResult;
    game: GameView;
    countryName: (code: string) => string;
    winner: boolean | null;
}) {
    const currency =
        player.slot === game.me.slot
            ? game.me.character.currentCurrency
            : game.opponent?.character.currentCurrency ?? game.me.character.currentCurrency;
    const stage = stageForAge(player.ageAtDeath);
    const pppCurrency = { code: "USD", symbol: "$", localPerIntlDollar: 1 };
    return (
        <Card className="overflow-hidden">
            <div className="relative h-40">
                <LifeScene stage={stage} seed={`${player.givenName}-${game.world.seedFingerprint}-final`} compact />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-950/25 to-transparent" />
                <div className="absolute inset-x-5 bottom-3 flex items-end justify-between gap-3">
                    <div className="flex items-end gap-3">
                        <Portrait seed={`${player.alias}-${player.slot}`} stage={stage} size="md" className="ring-2 ring-ink-950/70" />
                        <div className="pb-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-gold-soft">
                                    Jugador {player.slot}
                                </span>
                                {winner ? (
                                    <Badge tone="gold">
                                        <Crown className="h-3 w-3" /> Ganador
                                    </Badge>
                                ) : null}
                            </div>
                            <h2 className="text-xl text-parchment">{player.alias}</h2>
                            <p className="mt-0.5 text-xs text-parchment-dim">
                                {player.givenName} · {player.ageAtDeath} años
                            </p>
                        </div>
                    </div>
                    <ProgressRing value={player.score.total} size={68} stroke={5} color={winner ? "#d8b875" : "#54d98c"} sublabel="pts" />
                </div>
            </div>

            <div className="space-y-4 p-5">
                <p className="text-xs leading-relaxed text-parchment-dim">{player.lifeSummary}</p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(CORE_STAT_META) as CoreStatKey[]).map((key) => (
                        <div key={key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                            <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">{CORE_STAT_META[key].label}</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums text-parchment">
                                {Math.round(player.finalStats[key])}
                            </p>
                        </div>
                    ))}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.06] pt-4 text-xs">
                    <FinalField icon={<Skull className="h-3.5 w-3.5" />} label="Causa de muerte" value={player.causeOfDeath ?? "No determinada"} />
                    <FinalField icon={<Globe2 className="h-3.5 w-3.5" />} label="Países vividos" value={player.countriesLived.map(countryName).join(", ")} />
                    <FinalField icon={<BookOpen className="h-3.5 w-3.5" />} label="Educación" value={educationLabel(player.education)} />
                    <FinalField icon={<Flag className="h-3.5 w-3.5" />} label="Trayectoria" value={player.occupation ?? "Sin empleo estable"} />
                    <FinalField icon={<HeartHandshake className="h-3.5 w-3.5" />} label="Familia" value={`${player.maritalStatus} · ${player.children} hijos`} />
                    <FinalField icon={<Wallet className="h-3.5 w-3.5" />} label="Patrimonio disponible" value={formatMoney(player.finance.money, currency)} />
                    <FinalField icon={<Wallet className="h-3.5 w-3.5" />} label="Deuda final" value={formatMoney(player.finance.debt, currency)} />
                    <FinalField icon={<History className="h-3.5 w-3.5" />} label="Puntuación final" value={formatScore(player.score.total)} />
                </dl>
                {player.psychology ? (
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-gold-soft">
                                Estado emocional final
                            </p>
                            <p className="text-[0.68rem] text-parchment-dim">{player.finalMood ?? "Con luces y sombras"}</p>
                        </div>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-parchment-faint">Estrés</p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-rose">{Math.round(player.psychology.stress)}</p>
                            </div>
                            <div>
                                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-parchment-faint">Duelo</p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-rose">{Math.round(player.psychology.grief)}</p>
                            </div>
                            <div>
                                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-parchment-faint">Satisfacción</p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-jade">{Math.round(player.psychology.lifeSatisfaction)}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {player.business ? (
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-gold-soft">
                                Empresa · {player.business.active ? "en marcha" : "cerrada"}
                            </p>
                            <p className="text-xs font-medium text-parchment">{player.business.name}</p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[0.65rem] text-parchment-dim sm:grid-cols-4">
                            <span>Ingresos {formatMoney(player.business.annualRevenue, pppCurrency)} PPP</span>
                            <span>Costes {formatMoney(player.business.annualCosts, pppCurrency)} PPP</span>
                            <span>Marketing {formatMoney(player.business.marketingSpend, pppCurrency)} PPP</span>
                            <span>Reputación {Math.round(player.business.reputation)}/100</span>
                        </div>
                    </div>
                ) : null}

                {player.household ? (
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-gold-soft">
                            Origen familiar
                        </p>
                        <p className="mt-1.5 text-[0.68rem] leading-relaxed text-parchment-dim">
                            {player.household.structureLabel} · {player.household.religion} · religiosidad{" "}
                            {player.household.religiosity}/100. Ingresos familiares de infancia:{" "}
                            {formatMoney(player.household.budget.annualIncome, pppCurrency)} PPP. Apoyo familiar potencial:{" "}
                            {formatMoney(player.household.support.annualSupport, pppCurrency)} PPP.
                        </p>
                        <p className="mt-1 text-[0.6rem] leading-relaxed text-parchment-faint">
                            Préstamos activos al final: {formatMoney(player.loanBalance ?? 0, pppCurrency)} PPP. Las cifras de
                            infancia son contexto simulado y no se suman al patrimonio personal.
                        </p>
                    </div>
                ) : null}

                <div className="grid gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-gold-soft">
                            <Trophy className="h-3 w-3" /> Logros y momentos
                        </p>
                        {player.milestoneTitles.length > 0 ? (
                            <ul className="space-y-1.5">
                                {player.milestoneTitles.slice(0, 8).map((title) => (
                                    <li key={title} className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-parchment-dim">
                                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-jade" aria-hidden="true" /> {title}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[0.68rem] text-parchment-faint">Sin hitos registrados.</p>
                        )}
                    </div>
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-rose">
                            <Flag className="h-3 w-3" /> Dificultades
                        </p>
                        {player.difficulties.length > 0 ? (
                            <ul className="space-y-1.5">
                                {player.difficulties.map((difficulty) => (
                                    <li key={difficulty} className="flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-parchment-dim">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose" aria-hidden="true" /> {difficulty}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-[0.68rem] text-parchment-faint">No se registraron dificultades mayores.</p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

function FinalField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.1em] text-parchment-faint">
                <span className="text-gold/70">{icon}</span>
                {label}
            </dt>
            <dd className="mt-0.5 truncate font-medium text-parchment">{value}</dd>
        </div>
    );
}

function EconomicTrail({
    points,
    aliases,
    currencyFor,
}: {
    points: { age: number; players: Partial<Record<PlayerSlot, number>> }[];
    aliases: Partial<Record<PlayerSlot, string>>;
    currencyFor: (slot: PlayerSlot) => GameView["me"]["character"]["currentCurrency"] | undefined;
}) {
    const width = 620;
    const height = 210;
    const pad = { left: 20, right: 20, top: 18, bottom: 26 };
    const values = points.flatMap((point) => Object.values(point.players).filter((value): value is number => value !== undefined));
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);
    const maxAge = Math.max(1, ...points.map((point) => point.age));
    const colors: Record<PlayerSlot, string> = { 1: "#d8b875", 2: "#54d98c" };

    const line = (slot: PlayerSlot) => {
        const coordinates = points
            .filter((point) => point.players[slot] !== undefined)
            .map((point) => {
                const x = pad.left + (point.age / maxAge) * (width - pad.left - pad.right);
                const y = pad.top + (1 - ((point.players[slot] ?? 0) - min) / (max - min || 1)) * (height - pad.top - pad.bottom);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            });
        return coordinates.length > 0 ? `M${coordinates.join(" L")}` : "";
    };

    return (
        <div>
            <div className="mb-2 flex flex-wrap gap-3">
                {([1, 2] as PlayerSlot[]).map((slot) =>
                    aliases[slot] ? (
                        <span key={slot} className="inline-flex items-center gap-1.5 text-[0.65rem] text-parchment-dim">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors[slot] }} /> {aliases[slot]}
                        </span>
                    ) : null,
                )}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Evolución del saldo económico disponible menos deuda">
                <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="rgba(255,255,255,0.1)" />
                <line x1={pad.left} x2={width - pad.right} y1={pad.top} y2={pad.top} stroke="rgba(255,255,255,0.05)" />
                {([1, 2] as PlayerSlot[]).map((slot) => {
                    const path = line(slot);
                    return path ? (
                        <path
                            key={slot}
                            d={path}
                            fill="none"
                            stroke={colors[slot]}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : null;
                })}
                <text x={pad.left} y={height - 8} fill="rgba(141,138,128,0.8)" fontSize="9">0 años</text>
                <text x={width - pad.right} y={height - 8} textAnchor="end" fill="rgba(141,138,128,0.8)" fontSize="9">{maxAge} años</text>
            </svg>
            <div className="mt-2 grid grid-cols-2 gap-2">
                {([1, 2] as PlayerSlot[]).map((slot) => {
                    const last = [...points].reverse().find((point) => point.players[slot] !== undefined);
                    if (!last) return null;
                    const currency = currencyFor(slot);
                    return (
                        <div key={slot} className="rounded-xl border border-white/[0.07] p-2.5">
                            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-parchment-faint">{aliases[slot]}</p>
                            <p className="mt-0.5 text-xs font-semibold text-parchment">
                                {currency ? formatMoney(last.players[slot] ?? 0, currency) : (last.players[slot] ?? 0).toFixed(0)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
