import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { GameConfig, RoomJoinPreview } from "@life-duel/shared";
import {
    DEFAULT_GAME_CONFIG,
    DIFFICULTY_META,
    aliasSchema,
    sumWeights,
} from "@life-duel/shared";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Crown,
    KeyRound,
    Loader2,
    Lock,
    Plus,
    RefreshCw,
    ShieldCheck,
    Swords,
    UsersRound,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { GameConfigForm } from "../components/game/GameConfigForm";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { Field, TextInput } from "../components/ui/Form";
import { useToast } from "../components/ui/ToastProvider";
import { useDemographics } from "../hooks/useDemographics";
import { usePreferencesStore } from "../features/preferences/preferencesStore";
import { useSessionStore } from "../features/session/sessionStore";
import { api, ApiError } from "../services/api";
import { safeErrorMessage } from "../lib/utils";
import { LifeScene } from "../components/art/LifeScene";
import { Portrait } from "../components/art/Portrait";

type Mode = "create" | "join";

function cleanCode(value: string): string {
    return value
        .toUpperCase()
        .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, "")
        .slice(0, 6);
}

function cleanConfig(config: GameConfig): GameConfig {
    return {
        ...config,
        era: "present",
        maxAge: 105,
        fixedCountry: config.countryMode === "fixed" ? config.fixedCountry : undefined,
        fixedYear:
            Number.isInteger(config.fixedYear) && (config.fixedYear ?? 0) >= 1950 && (config.fixedYear ?? 0) <= 2060
                ? config.fixedYear
                : undefined,
        scoringWeights: { ...config.scoringWeights },
        content: { ...config.content },
    };
}

export function DuelPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryCode = cleanCode(searchParams.get("codigo") ?? "");
    const initialMode: Mode = searchParams.get("modo") === "unirse" || queryCode ? "join" : "create";
    const [mode, setMode] = useState<Mode>(initialMode);
    const [alias, setAlias] = useState("");
    const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
    const [code, setCode] = useState(queryCode);
    const [preview, setPreview] = useState<RoomJoinPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const lastAlias = useSessionStore((state) => state.lastAlias);
    const ensureSession = useSessionStore((state) => state.ensureSession);
    const defaultConfig = usePreferencesStore((state) => state.defaultConfig);
    const { data: demographics, loading: demographicsLoading } = useDemographics();

    useEffect(() => {
        setAlias((current) => current || lastAlias || "");
    }, [lastAlias]);

    useEffect(() => {
        setConfig(structuredClone(defaultConfig));
    }, [defaultConfig]);

    useEffect(() => {
        if (mode !== "join") return;
        if (code.length !== 6) {
            setPreview(null);
            setPreviewError(null);
            return;
        }
        let active = true;
        setPreviewLoading(true);
        setPreviewError(null);
        const timer = window.setTimeout(() => {
            api
                .previewRoom(code)
                .then((result) => {
                    if (active) setPreview(result);
                })
                .catch((error: unknown) => {
                    if (!active) return;
                    setPreview(null);
                    setPreviewError(
                        error instanceof ApiError && error.status === 404
                            ? "No existe ninguna sala con ese código. Revisa las seis letras."
                            : safeErrorMessage(error),
                    );
                })
                .finally(() => {
                    if (active) setPreviewLoading(false);
                });
        }, 280);
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [code, mode]);

    const aliasResult = aliasSchema.safeParse(alias);
    const weightsValid = Math.abs(sumWeights(config.scoringWeights) - 100) < 0.01;

    const switchMode = (next: Mode) => {
        setMode(next);
        const params = new URLSearchParams(searchParams);
        if (next === "join") params.set("modo", "unirse");
        else params.delete("modo");
        setSearchParams(params, { replace: true });
    };

    const createDuel = async () => {
        if (!aliasResult.success) {
            toast.push(aliasResult.error.issues[0]?.message ?? "Alias no válido.", "error");
            return;
        }
        if (!weightsValid) {
            toast.push("Los pesos de puntuación deben sumar 100 %.", "error");
            return;
        }
        if (config.countryMode === "fixed" && !config.fixedCountry) {
            toast.push("Selecciona el país del nacimiento.", "error");
            return;
        }
        setBusy(true);
        try {
            await ensureSession(aliasResult.data);
            const { lobby } = await api.createRoom({ alias: aliasResult.data, config: { ...cleanConfig(config), storyMode: true } });
            toast.push("Sala creada. Comparte el código con tu rival.", "success");
            navigate(`/sala/${lobby.code}`);
        } catch (error) {
            toast.push(safeErrorMessage(error), "error");
        } finally {
            setBusy(false);
        }
    };

    const joinDuel = async () => {
        if (!aliasResult.success) {
            toast.push(aliasResult.error.issues[0]?.message ?? "Alias no válido.", "error");
            return;
        }
        if (code.length !== 6) {
            toast.push("Introduce un código de sala de 6 caracteres.", "error");
            return;
        }
        setBusy(true);
        try {
            await ensureSession(aliasResult.data);
            const { lobby } = await api.joinRoom({ code, alias: aliasResult.data });
            toast.push("Te has unido al duelo.", "success");
            navigate(`/sala/${lobby.code}`);
        } catch (error) {
            toast.push(safeErrorMessage(error), "error");
        } finally {
            setBusy(false);
        }
    };

    const configSummary = useMemo(
        () => [
            { label: "Nacimiento", value: "Hoy" },
            {
                label: "País",
                value:
                    config.countryMode === "fixed"
                        ? demographics?.countries.find((country) => country.code === config.fixedCountry)?.name ?? "Fijo"
                        : config.countryMode === "weighted"
                            ? "Sorteo ponderado"
                            : "Sorteo uniforme",
            },
            { label: "Final", value: "Lo decide la vida" },
            { label: "Dificultad", value: DIFFICULTY_META[config.difficulty].label },
            {
                label: "Decisiones automáticas",
                value: config.autoDecisions ? "Sí, las controla el anfitrión" : "No",
            },
        ],
        [config, demographics],
    );

    return (
        <div className="container-page pt-8 sm:pt-12">
            <PageHeader
                eyebrow="Duelo privado"
                title="La misma vida. Dos formas de vivirla."
                description="Crea una sala y comparte un código de seis caracteres. Ambos recibiréis el mismo nacimiento, el mismo país y los mismos acontecimientos. Ninguno verá la decisión del otro hasta que ambos hayáis confirmado."
                back={
                    <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-parchment-dim transition hover:text-gold">
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Volver al inicio
                    </Link>
                }
                action={
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => switchMode("create")}
                            aria-pressed={mode === "create"}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition ${mode === "create"
                                ? "border-gold/40 bg-gold/10 text-gold-soft"
                                : "border-white/10 text-parchment-dim hover:text-parchment"
                                }`}
                        >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Crear sala
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode("join")}
                            aria-pressed={mode === "join"}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition ${mode === "join"
                                ? "border-gold/40 bg-gold/10 text-gold-soft"
                                : "border-white/10 text-parchment-dim hover:text-parchment"
                                }`}
                        >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Unirse
                        </button>
                    </div>
                }
            />

            {mode === "create" ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                    <Card className="p-5 sm:p-7">
                        <div className="mb-6 flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                                <Crown className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-xl text-parchment">Configura la vida compartida</h2>
                                <p className="mt-0.5 text-xs text-parchment-faint">Solo tú puedes cambiar estos ajustes mientras la sala espera.</p>
                            </div>
                        </div>

                        <div className="mb-6 max-w-sm">
                            <Field label="Tu alias" hint="Entre 2 y 18 caracteres">
                                <TextInput
                                    value={alias}
                                    onChange={(event) => setAlias(event.target.value)}
                                    maxLength={18}
                                    autoComplete="nickname"
                                    placeholder="Ej. Luna"
                                />
                            </Field>
                        </div>

                        <GameConfigForm
                            value={config}
                            onChange={setConfig}
                            countries={demographics?.countries ?? []}
                            showAuto
                            disabled={busy}
                        />
                    </Card>

                    <aside className="space-y-4 lg:sticky lg:top-24">
                        <SoftCard className="overflow-hidden">
                            <div className="relative h-36">
                                <LifeScene stage="adultez" seed={`duel-hoy-${config.fixedCountry ?? "random"}`} compact />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 to-transparent" />
                                <div className="absolute bottom-3 left-4 flex items-end gap-3">
                                    <Portrait seed="duel-preview" stage="adultez" size="sm" className="ring-2 ring-ink-950/70" />
                                    <div className="pb-0.5">
                                        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-gold-soft">Sala privada</p>
                                        <p className="text-lg text-parchment">Código de 6 caracteres</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 p-5">
                                <dl className="space-y-2.5">
                                    {configSummary.map((item) => (
                                        <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                                            <dt className="text-parchment-faint">{item.label}</dt>
                                            <dd className="max-w-[58%] text-right font-medium text-parchment">{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="rounded-xl border border-jade/20 bg-jade/[0.04] p-3">
                                    <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-jade">
                                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mismo nacimiento garantizado
                                    </p>
                                    <p className="mt-1 text-[0.65rem] leading-relaxed text-parchment-faint">
                                        La semilla se crea antes de que entre el segundo jugador. No cambia cuando se une.
                                    </p>
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => void createDuel()}
                                    loading={busy}
                                    disabled={!aliasResult.success || !weightsValid || demographicsLoading}
                                >
                                    <Swords className="h-4 w-4" aria-hidden="true" /> Crear sala de duelo
                                </Button>
                                <p className="text-center text-[0.62rem] leading-relaxed text-parchment-faint">
                                    El segundo jugador puede entrar desde otro navegador o dispositivo. No compartas tu
                                    sesión: cada jugador necesita la suya.
                                </p>
                            </div>
                        </SoftCard>
                    </aside>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
                    <Card className="p-5 sm:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl border border-jade/25 bg-jade/10 text-jade">
                                <KeyRound className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                                <h2 className="text-xl text-parchment">Entrar con un código</h2>
                                <p className="mt-0.5 text-xs text-parchment-faint">Tu rival te habrá enviado seis caracteres.</p>
                            </div>
                        </div>

                        <div className="grid max-w-lg gap-4 sm:grid-cols-[1fr_1fr]">
                            <Field label="Código de sala" hint="Seis caracteres">
                                <TextInput
                                    value={code}
                                    onChange={(event) => setCode(cleanCode(event.target.value))}
                                    placeholder="ABC123"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    className="font-mono text-lg tracking-[0.35em] uppercase"
                                    aria-label="Código de sala"
                                />
                            </Field>
                            <Field label="Tu alias" hint="Visible para el anfitrión">
                                <TextInput
                                    value={alias}
                                    onChange={(event) => setAlias(event.target.value)}
                                    maxLength={18}
                                    autoComplete="nickname"
                                    placeholder="Ej. Sol"
                                />
                            </Field>
                        </div>

                        <div className="mt-5 min-h-32">
                            {previewLoading ? (
                                <div className="flex items-center gap-2 text-xs text-parchment-dim">
                                    <Loader2 className="h-4 w-4 animate-spin text-gold" /> Buscando la sala…
                                </div>
                            ) : previewError ? (
                                <div className="rounded-xl border border-rose/20 bg-rose/[0.05] p-4 text-xs leading-relaxed text-rose">
                                    {previewError}
                                </div>
                            ) : preview ? (
                                <div className="rounded-2xl border border-jade/20 bg-jade/[0.03] p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone="jade" dot>
                                            Sala encontrada
                                        </Badge>
                                        <Badge tone="gold">{preview.status === "waiting" ? "Esperando rival" : preview.status}</Badge>
                                        <span className="text-[0.65rem] text-parchment-faint">
                                            Caduca en {preview.expiresInHours} h
                                        </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3">
                                        <Portrait seed={`${preview.code}-host`} stage="adultez" size="sm" />
                                        <div>
                                            <p className="text-sm text-parchment">
                                                Anfitrión: <strong className="font-medium">{preview.hostAlias}</strong>
                                            </p>
                                            <p className="mt-0.5 text-xs text-parchment-dim">
                                                {preview.birthSummary.givenName} nacerá en {preview.birthSummary.countryName} en{" "}
                                                {preview.birthSummary.year}. Familia: {preview.birthSummary.familyLabel}.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <Badge tone="sky">Nacimiento hoy</Badge>
                                        <Badge tone="violet">{DIFFICULTY_META[preview.config.difficulty].label}</Badge>
                                        <Badge tone="neutral">La muerte decide el final</Badge>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-parchment-faint">
                                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                                    Introduce el código para ver el nacimiento compartido antes de entrar.
                                </div>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            className="mt-4"
                            onClick={() => void joinDuel()}
                            loading={busy}
                            disabled={!preview || !aliasResult.success || code.length !== 6}
                        >
                            <Check className="h-4 w-4" aria-hidden="true" /> Unirme al duelo
                        </Button>
                        <p className="mt-3 flex items-center gap-1.5 text-[0.65rem] text-parchment-faint">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Solo se permite un segundo jugador por sala. Las uniones no autorizadas se rechazan.
                        </p>
                    </Card>

                    <aside className="space-y-4">
                        <div className="glass-soft rounded-2xl p-5">
                            <p className="eyebrow mb-2">Antes de entrar</p>
                            <h3 className="text-lg text-parchment">Una sesión distinta por jugador</h3>
                            <p className="mt-2 text-xs leading-relaxed text-parchment-dim">
                                LIFE DUEL identifica a cada jugador con una sesión anónima guardada en su navegador.
                                Para probar un duelo en tu equipo, abre el segundo jugador en una ventana de
                                incógnito, otro navegador o un dispositivo diferente.
                            </p>
                            <div className="mt-4 space-y-2">
                                {["Código privado y aleatorio", "Misma semilla para ambos", "Decisiones ocultas hasta resolver"].map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-[0.7rem] text-parchment-dim">
                                        <span className="grid h-5 w-5 place-items-center rounded-full border border-jade/25 bg-jade/10 text-jade">
                                            <Check className="h-3 w-3" aria-hidden="true" />
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Link
                            to="/duelo"
                            onClick={() => switchMode("create")}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-xs text-parchment-dim transition hover:border-gold/25 hover:text-parchment"
                        >
                            <span className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-gold" /> ¿No tienes código? Crea tú la sala
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </aside>
                </div>
            )}
        </div>
    );
}
