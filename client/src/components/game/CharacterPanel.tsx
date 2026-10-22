import type { BirthProfile, PlayerView, WorldView } from "@life-duel/shared";
import { CORE_STAT_META } from "@life-duel/shared";
import {
    Baby,
    BriefcaseBusiness,
    GraduationCap,
    HeartHandshake,
    MapPin,
    ShieldCheck,
    Skull,
    Wallet,
} from "lucide-react";
import { LifeScene } from "../art/LifeScene";
import { Portrait } from "../art/Portrait";
import { Badge } from "../ui/Badge";
import { ProgressRing } from "../ui/ProgressRing";
import { StatBar } from "../ui/StatBar";
import { SoftCard } from "../ui/Card";
import { cn } from "../../lib/utils";
import {
    ageAndStage,
    characterStage,
    educationText,
    employmentText,
    maritalText,
    moneyText,
    mortalityText,
    riskTone,
} from "../../features/game/format";

export function CharacterPanel({
    player,
    world,
    className,
    compact = false,
    countryName,
}: {
    player: PlayerView;
    world: WorldView;
    className?: string;
    compact?: boolean;
    countryName?: (code: string) => string;
}) {
    const character = player.character;
    const stage = characterStage(character);
    const birth: BirthProfile = world.birth;
    const currentCountry = countryName?.(character.currentCountry) ?? character.currentCountry;

    return (
        <SoftCard className={cn("overflow-hidden", className)}>
            <div className={cn("relative", compact ? "h-28" : "h-44")}>
                <LifeScene stage={stage} seed={`${character.id}-${stage}`} compact />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-950/35 to-transparent" />
                <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                    <div className="flex items-end gap-3">
                        <Portrait
                            seed={character.id}
                            stage={stage}
                            sex={character.sex}
                            size={compact ? "sm" : "md"}
                            className="ring-2 ring-ink-950/70"
                        />
                        <div className="pb-0.5">
                            <p className="text-[0.6rem] uppercase tracking-[0.18em] text-gold-soft">
                                {player.isMe ? "Tu personaje" : "Rival"}
                            </p>
                            <h2 className={cn("text-parchment", compact ? "text-lg" : "text-2xl")}>
                                {birth.givenName} {birth.surname}
                            </h2>
                            <p className="mt-0.5 text-xs text-parchment-dim">{character.alias}</p>
                        </div>
                    </div>
                    <ProgressRing
                        value={player.score.total}
                        size={compact ? 62 : 80}
                        stroke={5}
                        color={player.isMe ? "#d8b875" : "#54d98c"}
                        sublabel="puntos"
                    />
                </div>
            </div>

            <div className={cn("space-y-4", compact ? "p-4" : "p-5")}>
                <div className="flex flex-wrap gap-1.5">
                    <Badge tone="gold">{ageAndStage(character.ageAtDeath ?? character.age)}</Badge>
                    <Badge tone="sky">
                        <MapPin className="h-3 w-3" aria-hidden="true" /> {currentCountry}
                    </Badge>
                    {character.alive ? (
                        <Badge tone="jade" dot>
                            Vivo
                        </Badge>
                    ) : (
                        <Badge tone="danger">
                            <Skull className="h-3 w-3" aria-hidden="true" /> Fallecido
                        </Badge>
                    )}
                    {player.hasSubmitted && !player.isMe ? <Badge tone="violet">Decisión enviada</Badge> : null}
                </div>

                {!character.alive ? (
                    <div className="rounded-xl border border-rose/20 bg-rose/[0.05] p-3 text-xs leading-relaxed text-rose">
                        Vida terminada a los {character.ageAtDeath} años. Causa: {character.causeOfDeath ?? "no determinada"}.
                    </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.keys(CORE_STAT_META) as (keyof typeof CORE_STAT_META)[]).map((key) => (
                        <StatBar key={key} stat={key} value={character.stats[key]} compact={compact} />
                    ))}
                </div>

                <div className={cn("grid gap-2 border-t border-white/[0.06] pt-4", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
                    <InfoCell
                        icon={<Wallet className="h-3.5 w-3.5" />}
                        label="Dinero disponible"
                        value={moneyText(character.finance.money, character.currentCurrency)}
                    />
                    <InfoCell
                        icon={<BriefcaseBusiness className="h-3.5 w-3.5" />}
                        label="Situación laboral"
                        value={employmentText(character.employment.status, character.employment.occupation)}
                    />
                    <InfoCell
                        icon={<GraduationCap className="h-3.5 w-3.5" />}
                        label="Educación"
                        value={educationText(character.educationLevel)}
                    />
                    <InfoCell
                        icon={<HeartHandshake className="h-3.5 w-3.5" />}
                        label="Relaciones"
                        value={`${maritalText(character.maritalStatus)}${character.children > 0 ? ` · ${character.children} hijos` : ""}`}
                    />
                    <InfoCell
                        icon={<ShieldCheck className="h-3.5 w-3.5" />}
                        label="Riesgo de mortalidad"
                        value={mortalityText(character.mortalityRisk)}
                        tone={riskTone(character.mortalityRisk)}
                    />
                    <InfoCell
                        icon={<Baby className="h-3.5 w-3.5" />}
                        label="Nivel de vida"
                        value={`${Math.round(character.livingStandard)}/100`}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-center">
                    <MiniMetric label="Ingresos/año" value={moneyText(character.finance.annualIncome, character.currentCurrency)} />
                    <MiniMetric label="Gastos/año" value={moneyText(character.finance.annualExpenses, character.currentCurrency)} />
                    <MiniMetric
                        label="Deuda"
                        value={moneyText(character.finance.debt, character.currentCurrency)}
                        warning={character.finance.debt > Math.max(1, character.finance.annualIncome * 0.8)}
                    />
                </div>
                {character.psychology ? (
                    <div className="border-t border-white/[0.06] pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[0.58rem] uppercase tracking-[0.1em] text-parchment-faint">Estado emocional</p>
                            <p className="text-[0.6rem] text-parchment-faint">Modelo aproximado</p>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            {([
                                ["Estrés", character.psychology.stress, "bg-rose"],
                                ["Duelo", character.psychology.grief, "bg-rose"],
                                ["Satisfacción", character.psychology.lifeSatisfaction, "bg-jade"],
                            ] as const).map(([label, value, color]) => (
                                <div key={label}>
                                    <p className="text-[0.55rem] uppercase tracking-[0.08em] text-parchment-faint">{label}</p>
                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                        <span className={cn("block h-full", color)} style={{ width: `${Math.max(0, Math.min(100, Math.round(value)))}%` }} />
                                    </div>
                                    <p className="mt-0.5 text-[0.65rem] font-medium tabular-nums text-parchment-dim">{Math.round(value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {character.business ? (
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[0.65rem] text-parchment-dim">
                        <span className="text-gold-soft">{character.business.active ? "Empresa en marcha" : "Empresa cerrada"}</span>
                        {" · "}{character.business.name} · reputación {Math.round(character.business.reputation)}/100
                    </div>
                ) : null}

                {character.story ? (
                    <p className="text-[0.62rem] leading-relaxed text-parchment-faint">
                        Familia: {character.story.relatives.filter((relative) => relative.alive).length} vínculos vivos ·{" "}
                        {character.story.relatives.filter((relative) => !relative.alive).length} pérdidas registradas.
                    </p>
                ) : null}
                {!compact ? (
                    <p className="text-[0.62rem] leading-relaxed text-parchment-faint">
                        Riesgo anual estimado: {character.mortalityRisk.toFixed(2)} %. La longevidad depende de la salud,
                        el entorno y las decisiones, no de un temporizador fijo.
                    </p>
                ) : null}
            </div>
        </SoftCard>
    );
}

function InfoCell({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: "jade" | "amber" | "rose" | "danger";
}) {
    const toneClass =
        tone === "jade"
            ? "text-jade"
            : tone === "amber"
                ? "text-amber"
                : tone === "rose"
                    ? "text-rose"
                    : tone === "danger"
                        ? "text-danger"
                        : "text-parchment";
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.1em] text-parchment-faint">
                <span className="text-parchment-faint">{icon}</span>
                {label}
            </p>
            <p className={cn("mt-0.5 truncate text-xs font-medium", toneClass)}>{value}</p>
        </div>
    );
}

function MiniMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
    return (
        <div>
            <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</p>
            <p className={cn("mt-0.5 truncate text-[0.72rem] font-semibold tabular-nums", warning ? "text-rose" : "text-parchment-dim")}>
                {value}
            </p>
        </div>
    );
}
