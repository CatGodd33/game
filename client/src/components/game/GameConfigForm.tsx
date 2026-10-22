import { Info, SlidersHorizontal, Sparkles } from "lucide-react";
import type { CountryOption, Difficulty, GameConfig, ScoreCategoryKey } from "@life-duel/shared";
import {
    DEFAULT_SCORE_WEIGHTS,
    DIFFICULTY_META,
    SCORE_CATEGORY_META,
    sumWeights,
} from "@life-duel/shared";
import { Field, SegmentedControl, Select, TextInput, Toggle } from "../ui/Form";
import { cn } from "../../lib/utils";

const COUNTRY_OPTIONS = [
    { value: "population" as const, label: "Población mundial", hint: "Probabilidad según población" },
    { value: "weighted" as const, label: "Aleatorio ponderado", hint: "Probabilidad según nacimientos" },
    { value: "random" as const, label: "Aleatorio uniforme", hint: "Todos los países por igual" },
    { value: "fixed" as const, label: "Elegir país", hint: "País y contexto concretos" },
];

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTY_META) as Difficulty[]).map((difficulty) => ({
    value: difficulty,
    label: DIFFICULTY_META[difficulty].label,
    hint:
        difficulty === "equilibrada"
            ? "Referencia"
            : difficulty === "relajada"
                ? "Más amable"
                : "Más dura",
}));

const SCORE_KEYS = Object.keys(SCORE_CATEGORY_META) as ScoreCategoryKey[];

export function weightsAreValid(config: GameConfig): boolean {
    return Math.abs(sumWeights(config.scoringWeights) - 100) < 0.01;
}

/**
 * Ajustes compartidos de una vida.
 *
 * La época, el año y la duración ya no se eligen: toda vida nueva empieza hoy y
 * termina según la mortalidad del personaje. El formulario se reutiliza en el
 * nacimiento, en la creación de salas y en el vestíbulo del duelo.
 */
export function GameConfigForm({
    value,
    onChange,
    countries,
    showCountry = true,
    showDifficulty = true,
    showContent = true,
    showWeights = true,
    showAuto = false,
    showInfo = true,
    compact = false,
    disabled = false,
}: {
    value: GameConfig;
    onChange: (config: GameConfig) => void;
    countries: CountryOption[];
    showCountry?: boolean;
    showDifficulty?: boolean;
    showContent?: boolean;
    showWeights?: boolean;
    showAuto?: boolean;
    showInfo?: boolean;
    compact?: boolean;
    disabled?: boolean;
}) {
    const update = <K extends keyof GameConfig>(key: K, next: GameConfig[K]) => {
        onChange({ ...value, [key]: next });
    };

    const weightTotal = sumWeights(value.scoringWeights);
    const weightBalanced = Math.abs(weightTotal - 100) < 0.01;

    const updateWeight = (key: ScoreCategoryKey, amount: number) => {
        const next = Math.max(0, Math.min(100, Number.isFinite(amount) ? amount : 0));
        onChange({
            ...value,
            scoringWeights: { ...value.scoringWeights, [key]: Math.round(next * 100) / 100 },
        });
    };

    const balanceWeights = () => {
        onChange({ ...value, scoringWeights: { ...DEFAULT_SCORE_WEIGHTS } });
    };

    return (
        <fieldset disabled={disabled} className="space-y-7">
            <div className={cn("grid gap-7", compact || (!showCountry && !showDifficulty) ? "grid-cols-1" : "lg:grid-cols-2")}>
                {showCountry ? (
                    <div className="space-y-5">
                        <Field
                            label="País de nacimiento"
                            hint={showCountry ? `${countries.length} países disponibles` : undefined}
                        >
                            <SegmentedControl
                                label="Método de país"
                                value={value.countryMode}
                                onChange={(countryMode) => {
                                    if (countryMode === "fixed") {
                                        onChange({
                                            ...value,
                                            countryMode,
                                            fixedCountry: value.fixedCountry ?? countries[0]?.code ?? "ESP",
                                        });
                                    } else {
                                        onChange({ ...value, countryMode, fixedCountry: undefined });
                                    }
                                }}
                                options={COUNTRY_OPTIONS}
                            />
                        </Field>

                        {value.countryMode === "fixed" ? (
                            <Field
                                label="País concreto"
                                hint={countries.length === 0 ? "Cargando datos…" : undefined}
                            >
                                <Select
                                    value={value.fixedCountry ?? ""}
                                    onChange={(event) => update("fixedCountry", event.target.value)}
                                    aria-label="País concreto"
                                >
                                    <option value="" disabled>
                                        Selecciona un país
                                    </option>
                                    {countries.map((country) => (
                                        <option key={country.code} value={country.code}>
                                            {country.name} · {country.region}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        ) : null}
                    </div>
                ) : null}

                {showDifficulty || showContent || showAuto ? (
                    <div className="space-y-5">
                        {showDifficulty ? (
                            <Field label="Dificultad" hint="Afecta a mortalidad y costes">
                                <SegmentedControl
                                    label="Dificultad"
                                    value={value.difficulty}
                                    onChange={(difficulty) => update("difficulty", difficulty)}
                                    options={DIFFICULTY_OPTIONS}
                                />
                            </Field>
                        ) : null}

                        {showContent ? (
                            <Field label="Contenido sensible" hint="Las enfermedades y pérdidas nunca son explícitas">
                                <Select
                                    value={value.content.severity}
                                    onChange={(event) =>
                                        update("content", {
                                            ...value.content,
                                            severity: event.target.value as "full" | "moderate",
                                        })
                                    }
                                    aria-label="Contenido sensible"
                                >
                                    <option value="full">Completo, con matices realistas</option>
                                    <option value="moderate">Moderado, menos sucesos duros</option>
                                </Select>
                            </Field>
                        ) : null}

                        {showAuto ? (
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                                <Toggle
                                    checked={value.autoDecisions}
                                    onChange={(autoDecisions) => update("autoDecisions", autoDecisions)}
                                    label="Decisiones automáticas"
                                    description="En un duelo solo el anfitrión puede activarlas o desactivarlas. El invitado conserva siempre el control de sus propias decisiones cuando están desactivadas."
                                />
                                <p className="mt-2 text-[0.68rem] leading-relaxed text-parchment-faint">
                                    La política automática es reproducible y no siempre elige la opción óptima.
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {showInfo ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                        <p className="text-xs leading-relaxed text-parchment-dim">
                            La semilla del mundo se genera una sola vez en el servidor. El país, la familia, los
                            sucesos compartidos y las oportunidades serán idénticos para ambos jugadores. Solo las
                            decisiones y sus consecuencias personales pueden divergir.
                        </p>
                    </div>
                </div>
            ) : null}

            {showWeights ? (
                <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.025]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-parchment [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-gold" aria-hidden="true" />
                            Pesos de la puntuación final
                        </span>
                        <span
                            className={cn(
                                "rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold tabular-nums",
                                weightBalanced
                                    ? "border-jade/30 bg-jade/10 text-jade"
                                    : "border-amber/30 bg-amber/10 text-amber",
                            )}
                        >
                            {weightBalanced ? "Suma 100 %" : `Suma ${Math.round(weightTotal * 10) / 10} %`}
                        </span>
                    </summary>
                    <div className="border-t border-white/[0.07] p-4">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <p className="text-xs leading-relaxed text-parchment-faint">
                                Configura el peso de cada categoría antes de empezar. No se puede cambiar durante
                                una partida activa.
                            </p>
                            <button
                                type="button"
                                onClick={balanceWeights}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gold/25 bg-gold/10 px-2.5 py-1.5 text-[0.68rem] font-semibold text-gold-soft transition hover:bg-gold/15"
                            >
                                <Sparkles className="h-3 w-3" aria-hidden="true" /> Equilibrar
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {SCORE_KEYS.map((key) => (
                                <label key={key} className="block">
                                    <span className="mb-1 flex items-center justify-between gap-2 text-[0.68rem] text-parchment-dim">
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ backgroundColor: SCORE_CATEGORY_META[key].color }}
                                            />
                                            {SCORE_CATEGORY_META[key].label}
                                        </span>
                                        <span className="text-parchment-faint">%</span>
                                    </span>
                                    <TextInput
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={value.scoringWeights[key]}
                                        onChange={(event) => updateWeight(key, Number(event.target.value))}
                                        className="h-9 px-2 text-xs tabular-nums"
                                        aria-label={`Peso de ${SCORE_CATEGORY_META[key].label}`}
                                    />
                                </label>
                            ))}
                        </div>
                        {!weightBalanced ? (
                            <p className="mt-3 text-xs text-amber" role="alert">
                                Los pesos deben sumar exactamente 100 % para comenzar.
                            </p>
                        ) : null}
                    </div>
                </details>
            ) : null}
        </fieldset>
    );
}
