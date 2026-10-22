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

    return <main className="duel-page room-page-simple"><Link className="duel-back" to="/duelo">← Duelo</Link><header className="duel-intro"><span className="duel-kicker">Sala privada</span><h1>El comienzo es el mismo.<br/>El camino lo eliges tú.</h1><p>Comparte el código o la invitación. Cuando estéis listos, cada persona jugará su vida de forma independiente.</p></header>
      <div className="room-simple-grid"><section className="duel-entry-card room-invite"><span className="duel-kicker">Código para invitar</span><strong className="room-big-code">{lobby.code}</strong><button className="duel-main-button" onClick={()=>void copyInvite()}>Copiar invitación</button><div className="room-birth-note"><span>Vuestra vida inicial</span><strong>{lobby.birthSummary.givenName} · {lobby.birthSummary.countryName}</strong><small>{lobby.birthSummary.year} · {lobby.birthSummary.familyLabel}</small></div></section>
      <section className="duel-entry-card"><h2>Dos lugares, dos historias</h2><div className="room-player-list">{[me,opponent].map((p,i)=><div className="room-player" key={i}><span className="room-player-avatar">{p?.alias?.slice(0,1).toUpperCase()??"?"}</span><div><strong>{p?.alias??"Esperando a alguien"}{p?.slot===lobby.meSlot?" · tú":""}</strong><small>{p?p.ready?"Listo para comenzar":"Preparándose":"Comparte tu invitación"}</small></div><span className={p?.ready?"player-ready":"player-pending"}>{p?.ready?"✓":"○"}</span></div>)}</div>
      <button className="duel-main-button" disabled={busy!==null} onClick={()=>void toggleReady()}>{me?.ready?"✓ Estoy listo · cambiar":"Estoy listo"}</button>
      {isHost?<button className="duel-start-button" disabled={!lobby.canStart||busy!==null} onClick={()=>void start()}>{busy==="start"?"Preparando las vidas…":"Comenzar el duelo"}</button>:<p className="duel-form-note">El anfitrión iniciará cuando ambos estéis listos.</p>}
      <p className="duel-form-note">{connection==="connected"?"● Sala conectada":"Reconectando con la sala…"} · Las elecciones personales se mantienen privadas.</p><button className="duel-back" disabled={busy!==null} onClick={()=>void leave()}>Salir de la sala</button></section></div></main>;
}
