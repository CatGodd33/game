import { useEffect, useState } from "react";
import type { GameConfig, ScoreCategoryKey } from "@life-duel/shared";
import {
    APP_NAME,
    APP_VERSION,
    DEFAULT_SCORE_WEIGHTS,
    SCORE_CATEGORY_META,
    formatPercent,
    sumWeights,
} from "@life-duel/shared";
import {
    BookOpen,
    Check,
    Database,
    ExternalLink,
    Gauge,
    Info,
    RotateCcw,
    Server,
    Settings2,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { GameConfigForm, weightsAreValid } from "../components/game/GameConfigForm";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { Toggle } from "../components/ui/Form";
import { LanguageToggle } from "../components/ui/LanguageToggle";
import { Loader } from "../components/ui/States";
import { useToast } from "../components/ui/ToastProvider";
import { useDemographics } from "../hooks/useDemographics";
import { usePreferencesStore } from "../features/preferences/preferencesStore";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

const SCORE_KEYS = Object.keys(SCORE_CATEGORY_META) as ScoreCategoryKey[];
const HEALTH_LABELS: Record<string, string> = {
    local: "Textos locales (sin IA)",
    "deepseek-configurado": "DeepSeek configurado",
    json: "Archivo JSON atómico",
    postgres: "PostgreSQL",
};

export function SettingsPage() {
    const toast = useToast();
    const reduceMotion = usePreferencesStore((state) => state.reduceMotion);
    const setReduceMotion = usePreferencesStore((state) => state.setReduceMotion);
    const defaultConfig = usePreferencesStore((state) => state.defaultConfig);
    const setDefaultConfig = usePreferencesStore((state) => state.setDefaultConfig);
    const resetPreferences = usePreferencesStore((state) => state.reset);
    const playerId = useSessionStore((state) => state.playerId);
    const lastAlias = useSessionStore((state) => state.lastAlias);
    const { data: demographics, loading: demographicsLoading } = useDemographics();

    const [draft, setDraft] = useState<GameConfig>(() => structuredClone(defaultConfig));
    const [health, setHealth] = useState<{ status: string; persistence: string; ai: string; version?: string } | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api
            .health()
            .then((result) => {
                if (active) setHealth(result);
            })
            .catch((reason: unknown) => {
                if (active) setHealthError(safeErrorMessage(reason));
            })
            .finally(() => {
                if (active) setHealthLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const saveDefaults = () => {
        if (!weightsAreValid(draft)) {
            toast.push("Los pesos deben sumar 100 % antes de guardar.", "error");
            return;
        }
        setDefaultConfig(draft);
        toast.push("Configuración predeterminada guardada en este navegador.", "success");
    };

    const restore = () => {
        resetPreferences();
        setDraft(structuredClone(defaultConfig));
        toast.push("Preferencias restauradas a los valores iniciales.", "info");
    };

    const total = sumWeights(draft.scoringWeights);

    return (
        <div className="container-page pt-8 sm:pt-12">
            <PageHeader
                eyebrow="Configuración"
                title="Preferencias y reglas a la vista"
                description="Los ajustes de esta pantalla son locales y afectan a las próximas partidas. La configuración de una partida ya iniciada no se puede modificar."
                action={
                    <Badge tone={health?.status === "ok" ? "jade" : "amber"} dot>
                        {healthLoading ? "Comprobando servidor" : health?.status === "ok" ? "Servidor operativo" : "Servidor no disponible"}
                    </Badge>
                }
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="space-y-5">
                    <Card className="p-5 sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Info className="h-4 w-4 text-gold" />
                            <h2 className="text-xl text-parchment">Idioma / 语言</h2>
                        </div>
                        <p className="mb-4 text-xs leading-relaxed text-parchment-dim">
                            Elige el idioma de la interfaz y de las respuestas del servidor. La simulación, la semilla y los
                            identificadores no cambian: dos jugadores pueden ver la misma vida en español y en chino.
                        </p>
                        <LanguageToggle />
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="mb-5 flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-gold" />
                            <h2 className="text-xl text-parchment">Experiencia</h2>
                        </div>
                        <div className="space-y-4">
                            <Toggle
                                checked={reduceMotion}
                                onChange={setReduceMotion}
                                label="Reducir movimiento"
                                description="Desactiva animaciones y transiciones. También se respeta la preferencia del sistema operativo."
                            />
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                <p className="flex items-center gap-1.5 text-[0.68rem] text-parchment-dim">
                                    <ShieldCheck className="h-3.5 w-3.5 text-jade" /> Accesibilidad
                                </p>
                                <p className="mt-1 text-[0.65rem] leading-relaxed text-parchment-faint">
                                    Toda la interfaz se puede recorrer con teclado. Los diálogos atrapan el foco, Escape los
                                    cierra y las barras de progreso anuncian sus valores a los lectores de pantalla.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-gold" />
                                <h2 className="text-xl text-parchment">Configuración predeterminada</h2>
                            </div>
                            <Badge tone={weightsAreValid(draft) ? "jade" : "amber"}>
                                Pesos {Math.round(total * 10) / 10} %
                            </Badge>
                        </div>
                        <p className="mb-5 text-xs leading-relaxed text-parchment-dim">
                            Se usará al abrir «Nueva vida» o «Duelo para dos». Puedes cambiarla en cada partida antes
                            de comenzar.
                        </p>
                        {demographicsLoading ? (
                            <Loader label="Cargando países…" />
                        ) : (
                            <GameConfigForm value={draft} onChange={setDraft} countries={demographics?.countries ?? []} />
                        )}
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                            <Button variant="primary" onClick={saveDefaults} disabled={!weightsAreValid(draft)}>
                                <Check className="h-4 w-4" /> Guardar predeterminados
                            </Button>
                            <Button variant="ghost" onClick={restore}>
                                <RotateCcw className="h-4 w-4" /> Restaurar
                            </Button>
                        </div>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-gold" />
                            <h2 className="text-xl text-parchment">Cómo se calcula la puntuación</h2>
                        </div>
                        <p className="text-xs leading-relaxed text-parchment-dim">
                            Cada categoría se normaliza a 0–100. La puntuación total aplica estos pesos y después una
                            puerta de bienestar: si salud o felicidad son muy bajas, el resultado se reduce hasta un
                            25 %. La longevidad se compara con la esperanza de vida del país y no recompensa vivir más
                            por una ventaja demográfica.
                        </p>
                        <div className="mt-4 space-y-2">
                            {SCORE_KEYS.map((key) => {
                                const meta = SCORE_CATEGORY_META[key];
                                const weight = draft.scoringWeights[key];
                                return (
                                    <div key={key} className="flex items-center gap-3">
                                        <span className="w-32 shrink-0 text-xs text-parchment-dim">{meta.label}</span>
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${Math.min(100, weight)}%`, backgroundColor: meta.color }}
                                            />
                                        </div>
                                        <span className="w-10 text-right text-[0.65rem] tabular-nums text-parchment-faint">{weight} %</span>
                                    </div>
                                );
                            })}
                        </div>
                        <details className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                            <summary className="cursor-pointer text-[0.68rem] text-parchment-dim">Ver pesos de referencia</summary>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {SCORE_KEYS.map((key) => (
                                    <Badge key={key} tone="neutral">
                                        {SCORE_CATEGORY_META[key].label}: {DEFAULT_SCORE_WEIGHTS[key]} %
                                    </Badge>
                                ))}
                            </div>
                            <p className="mt-2 text-[0.62rem] leading-relaxed text-parchment-faint">
                                El umbral de empate es de 0,25 puntos. Un empate no se rompe por longevidad ni por dinero.
                            </p>
                        </details>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <Database className="h-4 w-4 text-gold" />
                            <h2 className="text-xl text-parchment">Datos demográficos</h2>
                        </div>
                        {demographicsLoading ? (
                            <Loader label="Cargando fuentes…" />
                        ) : demographics ? (
                            <>
                                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                                    <DataStat label="Países" value={demographics.countries.length} />
                                    <DataStat label="Versión del conjunto" value={demographics.datasetVersion} />
                                    <DataStat label="Consultado" value={demographics.retrievedAt} />
                                </div>
                                <div className="space-y-2">
                                    {demographics.sources.map((source) => (
                                        <div key={source.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-xs font-medium text-parchment">{source.name}</p>
                                                <span className="text-[0.6rem] text-parchment-faint">Licencia: {source.license}</span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[0.62rem] text-parchment-faint">
                                                <span>Acceso: {source.accessed}</span>
                                                <a
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-sky hover:underline"
                                                >
                                                    Fuente oficial <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    {demographics.notes.map((note) => (
                                        <p key={note} className="flex items-start gap-1.5 text-[0.62rem] leading-relaxed text-parchment-faint">
                                            <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber" /> {note}
                                        </p>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-parchment-faint">No se pudieron cargar los metadatos demográficos.</p>
                        )}
                    </Card>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                    <SoftCard className="p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Server className="h-4 w-4 text-gold" />
                            <h2 className="text-base text-parchment">Servidor y persistencia</h2>
                        </div>
                        {healthLoading ? (
                            <p className="text-xs text-parchment-faint">Comprobando…</p>
                        ) : healthError ? (
                            <p className="text-xs leading-relaxed text-rose">{healthError}</p>
                        ) : (
                            <dl className="space-y-2.5 text-xs">
                                <HealthRow label="Estado" value={health?.status === "ok" ? "Operativo" : health?.status ?? "—"} tone={health?.status === "ok" ? "jade" : "amber"} />
                                <HealthRow label="Persistencia" value={HEALTH_LABELS[health?.persistence ?? ""] ?? health?.persistence ?? "—"} />
                                <HealthRow label="Narrativa" value={HEALTH_LABELS[health?.ai ?? ""] ?? health?.ai ?? "—"} />
                                <HealthRow label="Versión API" value={health?.version ?? APP_VERSION} />
                            </dl>
                        )}
                        <p className="mt-3 text-[0.62rem] leading-relaxed text-parchment-faint">
                            En local, las partidas se guardan en un archivo JSON con escritura atómica. PostgreSQL con
                            Prisma puede activarse con variables de entorno, sin cambiar el motor.
                        </p>
                    </SoftCard>

                    <SoftCard className="p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-jade" />
                            <h2 className="text-base text-parchment">Tu sesión anónima</h2>
                        </div>
                        <dl className="space-y-2 text-xs">
                            <div>
                                <dt className="text-parchment-faint">Alias</dt>
                                <dd className="mt-0.5 text-parchment">{lastAlias || "Sin alias"}</dd>
                            </div>
                            <div>
                                <dt className="text-parchment-faint">Identificador de jugador</dt>
                                <dd className="mt-0.5 truncate font-mono text-[0.62rem] text-parchment-dim">
                                    {playerId ?? "Se creará al empezar"}
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-3 text-[0.62rem] leading-relaxed text-parchment-faint">
                            No hay cuentas ni correo. El token se guarda en este navegador; si borras sus datos,
                            perderás el acceso a tus partidas antiguas. Usa la exportación JSON para conservarlas.
                        </p>
                    </SoftCard>

                    <SoftCard className="p-5">
                        <div className="mb-2 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-gold" />
                            <h2 className="text-base text-parchment">Juego limpio</h2>
                        </div>
                        <ul className="space-y-2">
                            {[
                                "El servidor posee la semilla y las estadísticas.",
                                "Las decisiones del rival no se envían antes de tiempo.",
                                "La IA nunca altera una tirada ni una estadística.",
                                "Los pesos se bloquean al comenzar la partida.",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-parchment-dim">
                                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-jade" /> {item}
                                </li>
                            ))}
                        </ul>
                    </SoftCard>

                    <p className="px-2 text-center text-[0.6rem] tracking-[0.1em] text-parchment-faint">
                        {APP_NAME} · VERSIÓN {APP_VERSION}
                    </p>
                </aside>
            </div>
        </div>
    );
}

function DataStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
            <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</p>
            <p className="mt-0.5 truncate text-xs font-medium text-parchment">{value}</p>
        </div>
    );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone?: "jade" | "amber" }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-parchment-faint">{label}</dt>
            <dd className={tone === "jade" ? "text-jade" : tone === "amber" ? "text-amber" : "text-parchment"}>
                {value}
            </dd>
        </div>
    );
}
