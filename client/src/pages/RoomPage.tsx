import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { GameConfig, LobbyView, RoomJoinPreview } from "@life-duel/shared";
import { DIFFICULTY_META, aliasSchema, sumWeights } from "@life-duel/shared";
import {
    ArrowLeft,
    Check,
    Clipboard,
    Clock3,
    Copy,
    Crown,
    DoorOpen,
    KeyRound,
    Loader2,
    Lock,
    MapPin,
    Play,
    Settings2,
    Swords,
    UsersRound,
    Wifi,
    WifiOff,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { LifeScene } from "../components/art/LifeScene";
import { Portrait } from "../components/art/Portrait";
import { GameConfigForm, weightsAreValid } from "../components/game/GameConfigForm";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { Field, TextInput } from "../components/ui/Form";
import { Modal } from "../components/ui/Modal";
import { ErrorState, Loader } from "../components/ui/States";
import { useToast } from "../components/ui/ToastProvider";
import { useGameSocket } from "../hooks/useGameSocket";
import { useDemographics } from "../hooks/useDemographics";
import { useSessionStore } from "../features/session/sessionStore";
import { api, ApiError } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

export function RoomPage() {
    const { code: rawCode = "" } = useParams();
    const code = rawCode.toUpperCase();
    const navigate = useNavigate();
    const toast = useToast();
    const token = useSessionStore((state) => state.token);
    const lastAlias = useSessionStore((state) => state.lastAlias);
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const { data: demographics } = useDemographics();

    const [lobby, setLobby] = useState<LobbyView | null>(null);
    const [preview, setPreview] = useState<RoomJoinPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joinRequired, setJoinRequired] = useState(false);
    const [alias, setAlias] = useState(lastAlias || "");
    const [busy, setBusy] = useState<"join" | "ready" | "start" | "leave" | "config" | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [configDraft, setConfigDraft] = useState<GameConfig | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await ensureSession(alias || undefined);
            const { lobby: loaded } = await api.getLobby(code);
            setLobby(loaded);
            setJoinRequired(false);
        } catch (reason) {
            if (reason instanceof ApiError && reason.status === 403) {
                try {
                    const roomPreview = await api.previewRoom(code);
                    setPreview(roomPreview);
                    setJoinRequired(true);
                } catch (previewReason) {
                    setError(safeErrorMessage(previewReason));
                }
            } else {
                setError(
                    reason instanceof ApiError && reason.status === 404
                        ? "No existe ninguna sala con ese código. Puede haber caducado."
                        : safeErrorMessage(reason),
                );
            }
        } finally {
            setLoading(false);
        }
    }, [alias, code, ensureSession]);

    useEffect(() => {
        void load();
        // Solo se recarga al cambiar de sala; el alias se lee al entrar.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const onRoomUpdate = useCallback((next: LobbyView) => {
        setLobby(next);
    }, []);
    const onSocketError = useCallback(
        (message: string) => toast.push(message, "error"),
        [toast],
    );
    const connection = useGameSocket({
        gameId: lobby?.id,
        onRoom: onRoomUpdate,
        onError: onSocketError,
    });

    useEffect(() => {
        if (!lobby) return;
        if (lobby.status === "playing" || lobby.status === "paused") {
            navigate(`/partida/${lobby.gameId}`, { replace: true });
        } else if (lobby.status === "finished") {
            navigate(`/partida/${lobby.gameId}/final`, { replace: true });
        }
    }, [lobby, navigate]);

    useEffect(() => {
        if (lobby && !configDraft) setConfigDraft(structuredClone(lobby.config));
    }, [lobby, configDraft]);

    const me = lobby?.players.find((player) => player.slot === lobby.meSlot) ?? null;
    const opponent = lobby?.players.find((player) => player.slot !== lobby.meSlot) ?? null;
    const isHost = lobby ? lobby.meSlot === lobby.hostSlot : false;

    const inviteText = useMemo(() => {
        if (!lobby) return "";
        const url = `${window.location.origin}/sala/${lobby.code}`;
        return `Te reto a un duelo de LIFE DUEL: la misma vida, distintas decisiones. Código ${lobby.code}. Entra aquí: ${url}`;
    }, [lobby]);

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteText);
            toast.push("Invitación copiada al portapapeles.", "success");
        } catch {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = inviteText;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                textArea.remove();
                toast.push("Invitación copiada.", "success");
            } catch {
                toast.push("No se pudo copiar. Selecciona el código manualmente.", "error");
            }
        }
    };

    const joinRoom = async () => {
        const parsed = aliasSchema.safeParse(alias);
        if (!parsed.success) {
            toast.push(parsed.error.issues[0]?.message ?? "Alias no válido.", "error");
            return;
        }
        setBusy("join");
        try {
            await ensureSession(parsed.data);
            const { lobby: joined } = await api.joinRoom({ code, alias: parsed.data });
            setLobby(joined);
            setJoinRequired(false);
            toast.push("Ya estás dentro. La sala os espera.", "success");
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const toggleReady = async () => {
        if (!lobby || !me) return;
        setBusy("ready");
        try {
            const { lobby: next } = await api.ready(lobby.code, !me.ready);
            setLobby(next);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const start = async () => {
        if (!lobby) return;
        setBusy("start");
        try {
            const { game } = await api.startRoom(lobby.code);
            navigate(`/partida/${game.id}`);
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const leave = async () => {
        if (!lobby) return;
        setBusy("leave");
        try {
            await api.leave(lobby.id);
            toast.push("Has abandonado la sala.", "info");
            navigate("/partidas");
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    const saveConfig = async () => {
        if (!lobby || !configDraft) return;
        if (!weightsAreValid(configDraft)) {
            toast.push("Los pesos deben sumar 100 %.", "error");
            return;
        }
        setBusy("config");
        try {
            const { lobby: next } = await api.updateRoomConfig(lobby.code, {
                ...configDraft,
                fixedCountry: configDraft.countryMode === "fixed" ? configDraft.fixedCountry : undefined,
            });
            setLobby(next);
            setConfigDraft(structuredClone(next.config));
            setConfigOpen(false);
            toast.push("Configuración compartida actualizada.", "success");
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <Loader label="Abriendo la sala…" />;

    if (error) {
        return (
            <div className="container-page pt-10">
                <ErrorState
                    message={error}
                    onRetry={() => void load()}
                    action={
                        <Link to="/duelo?modo=unirse" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-parchment-dim">
                            Probar otro código
                        </Link>
                    }
                />
            </div>
        );
    }

    if (joinRequired) {
        return (
            <div className="container-page max-w-2xl pt-8 sm:pt-12">
                <PageHeader
                    eyebrow={`Sala ${code}`}
                    title="Te han invitado a una vida compartida"
                    description="Antes de entrar, elige el alias con el que competirás. No verás las decisiones de tu rival hasta que ambos confirméis cada año."
                    back={
                        <Link to="/duelo" className="inline-flex items-center gap-1.5 text-xs text-parchment-dim hover:text-gold">
                            <ArrowLeft className="h-3.5 w-3.5" /> Volver
                        </Link>
                    }
                />
                <Card className="overflow-hidden">
                    <div className="relative h-40">
                        <LifeScene stage="infancia" seed={`${code}-invite`} compact />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 to-transparent" />
                        <div className="absolute bottom-4 left-4 flex items-end gap-3">
                            <Portrait seed={`${code}-host`} size="md" className="ring-2 ring-ink-950/70" />
                            <div className="pb-0.5">
                                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-gold-soft">Invitación privada</p>
                                <p className="text-xl text-parchment">
                                    {preview?.birthSummary.givenName ?? "Una misma vida"} · {code}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-5 p-5 sm:p-7">
                        {preview ? (
                            <>
                                <p className="text-sm leading-relaxed text-parchment-dim">
                                    <strong className="font-medium text-parchment">{preview.hostAlias}</strong> te espera.
                                    El personaje nacerá en {preview.birthSummary.countryName} en {preview.birthSummary.year},
                                    en una familia de tipo «{preview.birthSummary.familyLabel.toLowerCase()}».
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge tone="gold">Nacimiento hoy</Badge>
                                    <Badge tone="violet">{DIFFICULTY_META[preview.config.difficulty].label}</Badge>
                                    <Badge tone="sky">Final natural</Badge>
                                    <Badge tone={preview.status === "waiting" ? "jade" : "neutral"}>
                                        {preview.status === "waiting" ? "Esperando jugador" : preview.status}
                                    </Badge>
                                </div>
                            </>
                        ) : null}
                        <Field label="Tu alias" hint="Entre 2 y 18 caracteres">
                            <TextInput
                                value={alias}
                                onChange={(event) => setAlias(event.target.value)}
                                maxLength={18}
                                placeholder="Ej. Sol"
                                autoComplete="nickname"
                            />
                        </Field>
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            onClick={() => void joinRoom()}
                            loading={busy === "join"}
                            disabled={!aliasSchema.safeParse(alias).success}
                        >
                            <Swords className="h-4 w-4" /> Entrar en el duelo
                        </Button>
                        <p className="flex items-center justify-center gap-1.5 text-[0.65rem] text-parchment-faint">
                            <Lock className="h-3 w-3" /> La sala solo admite al segundo jugador. El acceso se valida en el servidor.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    if (!lobby) return null;

    return (
        <div className="container-page pt-8 sm:pt-12">
            <PageHeader
                eyebrow={`Sala privada · ${lobby.code}`}
                title="Preparados para la misma vida"
                description="Este es el vestíbulo del duelo. La partida no comienza hasta que ambos jugadores estén listos y el anfitrión pulse comenzar."
                back={
                    <Link to="/partidas" className="inline-flex items-center gap-1.5 text-xs text-parchment-dim hover:text-gold">
                        <ArrowLeft className="h-3.5 w-3.5" /> Mis partidas
                    </Link>
                }
                action={
                    <Badge tone={connection === "connected" ? "jade" : "amber"} dot>
                        {connection === "connected" ? "Sala en vivo" : connection === "connecting" ? "Conectando" : "Reconectando"}
                    </Badge>
                }
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                <div className="space-y-5">
                    <Card className="overflow-hidden">
                        <div className="relative h-44 sm:h-56">
                            <LifeScene
                                stage="infancia"
                                seed={`${lobby.code}-${lobby.birthSummary.year}-${lobby.birthSummary.countryName}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-950/20 to-transparent" />
                            <div className="absolute left-5 top-5 flex items-center gap-2">
                                <Badge tone="gold" dot>
                                    Semilla fijada en el servidor
                                </Badge>
                            </div>
                            <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
                                <div className="flex items-end gap-3">
                                    <Portrait
                                        seed={`${lobby.id}-birth`}
                                        stage="infancia"
                                        sex={lobby.birthSummary.sex}
                                        size="lg"
                                        className="ring-2 ring-ink-950/70"
                                    />
                                    <div className="pb-1">
                                        <p className="text-[0.62rem] uppercase tracking-[0.18em] text-gold-soft">Nacimiento idéntico</p>
                                        <h2 className="text-2xl text-parchment sm:text-3xl">
                                            {lobby.birthSummary.givenName}, {lobby.birthSummary.year}
                                        </h2>
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-parchment-dim">
                                            <MapPin className="h-3.5 w-3.5" /> {lobby.birthSummary.countryName} ·{" "}
                                            {lobby.birthSummary.familyLabel}
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <Badge tone="violet">{lobby.birthSummary.sex === "female" ? "Mujer" : "Hombre"}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                            <SummaryCell label="Nacimiento" value="Hoy" />
                            <SummaryCell label="Dificultad" value={DIFFICULTY_META[lobby.config.difficulty].label} />
                            <SummaryCell
                                label="Decisiones"
                                value={lobby.config.autoDecisions ? "Automáticas · anfitrión" : "Manuales"}
                            />
                            <SummaryCell
                                label="Puntuación"
                                value={`${Math.round(sumWeights(lobby.config.scoringWeights))} %`}
                            />
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="eyebrow mb-1">Jugadores</p>
                                <h2 className="text-xl text-parchment">La mesa está servida</h2>
                            </div>
                            <Badge tone={lobby.canStart ? "jade" : "amber"}>
                                {lobby.players.length < 2 ? "Falta un jugador" : lobby.canStart ? "Todo listo" : "Marcad listo"}
                            </Badge>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {([1, 2] as const).map((slot) => {
                                const player = lobby.players.find((candidate) => candidate.slot === slot);
                                const isMe = slot === lobby.meSlot;
                                const host = slot === lobby.hostSlot;
                                return (
                                    <div
                                        key={slot}
                                        className={`rounded-2xl border p-4 ${player
                                            ? player.ready
                                                ? "border-jade/25 bg-jade/[0.035]"
                                                : "border-white/10 bg-white/[0.025]"
                                            : "border-dashed border-white/10 bg-white/[0.012]"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-parchment-faint">
                                                Jugador {slot}
                                            </span>
                                            {host ? (
                                                <Badge tone="gold">
                                                    <Crown className="h-3 w-3" /> Anfitrión
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {player ? (
                                            <>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <Portrait
                                                        seed={`${lobby.code}-player-${slot}`}
                                                        stage="adultez"
                                                        size="sm"
                                                        className="ring-1 ring-white/10"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-parchment">
                                                            {player.alias} {isMe ? <span className="text-parchment-faint">(tú)</span> : null}
                                                        </p>
                                                        <p className="mt-1 flex items-center gap-1 text-[0.65rem]">
                                                            {player.connected ? (
                                                                <span className="flex items-center gap-1 text-jade">
                                                                    <Wifi className="h-3 w-3" /> En línea
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-parchment-faint">
                                                                    <WifiOff className="h-3 w-3" /> Desconectado
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                                                    <span className="text-[0.65rem] text-parchment-faint">Estado</span>
                                                    <Badge tone={player.ready ? "jade" : "amber"}>{player.ready ? "Listo" : "Preparando"}</Badge>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="mt-4 flex items-center gap-2 text-xs text-parchment-faint">
                                                <UsersRound className="h-4 w-4" />
                                                Esperando a que alguien use el código
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            {me ? (
                                <Button
                                    variant={me.ready ? "secondary" : "primary"}
                                    onClick={() => void toggleReady()}
                                    loading={busy === "ready"}
                                    disabled={!opponent || busy !== null}
                                    className="sm:flex-1"
                                >
                                    {me.ready ? (
                                        <>
                                            <Clock3 className="h-4 w-4" /> Cancelar «listo»
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" /> Estoy listo
                                        </>
                                    )}
                                </Button>
                            ) : null}
                            {isHost ? (
                                <Button
                                    variant="primary"
                                    onClick={() => void start()}
                                    loading={busy === "start"}
                                    disabled={!lobby.canStart || busy !== null}
                                    className="sm:flex-1"
                                >
                                    <Play className="h-4 w-4" /> Comenzar duelo
                                </Button>
                            ) : (
                                <div className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-xs text-parchment-faint">
                                    El anfitrión iniciará la partida cuando ambos estéis listos.
                                </div>
                            )}
                        </div>
                        {!opponent ? (
                            <p className="mt-2 text-center text-[0.65rem] text-parchment-faint">
                                La sala espera al segundo jugador. También puedes marcar «listo» mientras llega.
                            </p>
                        ) : null}
                    </Card>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                    <SoftCard className="p-5">
                        <p className="eyebrow mb-2">Invitación</p>
                        <h2 className="text-xl text-parchment">Código de sala</h2>
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
                            <span className="font-mono text-2xl font-semibold tracking-[0.35em] text-gold-soft">{lobby.code}</span>
                            <Clipboard className="h-4 w-4 text-gold/60" aria-hidden="true" />
                        </div>
                        <Button variant="primary" className="mt-3 w-full" onClick={() => void copyInvite()}>
                            <Copy className="h-4 w-4" /> Copiar invitación
                        </Button>
                        <p className="mt-2 text-center text-[0.62rem] leading-relaxed text-parchment-faint">
                            Comparte el enlace o el código. Cada jugador debe abrirlo en su propio navegador.
                        </p>
                    </SoftCard>

                    <SoftCard className="p-5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="eyebrow mb-1">Configuración</p>
                                <h2 className="text-lg text-parchment">Vida compartida</h2>
                            </div>
                            {isHost ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setConfigDraft(structuredClone(lobby.config));
                                        setConfigOpen(true);
                                    }}
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-parchment-dim transition hover:border-gold/25 hover:text-gold"
                                    aria-label="Editar configuración de la sala"
                                >
                                    <Settings2 className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                        <dl className="mt-4 space-y-2.5">
                            <SummaryRow label="País" value={lobby.birthSummary.countryName} />
                            <SummaryRow label="Año" value={String(lobby.birthSummary.year)} />
                            <SummaryRow label="Dificultad" value={DIFFICULTY_META[lobby.config.difficulty].label} />
                            <SummaryRow
                                label="Contenido"
                                value={lobby.config.content.severity === "full" ? "Completo" : "Moderado"}
                            />
                            <SummaryRow
                                label="Decisiones auto"
                                value={lobby.config.autoDecisions ? "Solo las controla el anfitrión" : "Desactivadas"}
                            />
                            <SummaryRow
                                label="Puntuación"
                                value={`${Math.round(sumWeights(lobby.config.scoringWeights))} % de pesos`}
                            />
                        </dl>
                        {isHost ? (
                            <p className="mt-4 text-[0.62rem] leading-relaxed text-parchment-faint">
                                Si cambias la configuración, ambos deberéis volver a marcar «listo».
                            </p>
                        ) : (
                            <p className="mt-4 flex items-center gap-1 text-[0.62rem] leading-relaxed text-parchment-faint">
                                <Lock className="h-3 w-3" /> Solo el anfitrión puede modificar la configuración.
                            </p>
                        )}
                    </SoftCard>

                    <button
                        type="button"
                        onClick={() => void leave()}
                        disabled={busy !== null}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.04] px-4 py-3 text-xs text-red-300 transition hover:bg-danger/10 disabled:opacity-50"
                    >
                        <DoorOpen className="h-4 w-4" /> Abandonar sala
                    </button>
                </aside>
            </div>

            <Modal
                open={configOpen}
                onClose={() => setConfigOpen(false)}
                title="Configuración compartida"
                description="Los cambios afectan a la misma vida que viviréis ambos. Se reiniciará el estado de «listo»."
                size="lg"
                dismissible={busy !== "config"}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfigOpen(false)} disabled={busy === "config"}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => void saveConfig()}
                            loading={busy === "config"}
                            disabled={!configDraft || !weightsAreValid(configDraft)}
                        >
                            Guardar configuración
                        </Button>
                    </div>
                }
            >
                {configDraft ? (
                    <GameConfigForm
                        value={configDraft}
                        onChange={setConfigDraft}
                        countries={demographics?.countries ?? []}
                        showAuto
                        disabled={busy === "config"}
                    />
                ) : (
                    <Loader label="Preparando configuración…" />
                )}
            </Modal>
        </div>
    );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[0.6rem] uppercase tracking-[0.12em] text-parchment-faint">{label}</p>
            <p className="mt-1 text-xs font-medium text-parchment">{value}</p>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs">
            <dt className="text-parchment-faint">{label}</dt>
            <dd className="text-right font-medium text-parchment">{value}</dd>
        </div>
    );
}
