import { useEffect, useState } from "react";
import type { DecisionChoice, DecisionOptionView, DecisionPrompt, CurrencyInfo } from "@life-duel/shared";
import { DECISION_CATEGORY_META, formatCompactMoney, formatPercent } from "@life-duel/shared";
import {
    ArrowRight,
    CircleDollarSign,
    Compass,
    LoaderCircle,
    LockKeyhole,
    ShieldQuestion,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { SoftCard } from "../ui/Card";
import { riskTone } from "../../features/game/format";

export function DecisionPanel({
    prompt,
    currency,
    submitted,
    ownChoice,
    pending,
    disabled,
    onSubmit,
    solo = false,
}: {
    solo?: boolean;
    prompt: DecisionPrompt;
    currency: CurrencyInfo;
    submitted: boolean;
    ownChoice: DecisionChoice | null;
    pending: boolean;
    disabled?: boolean;
    onSubmit: (optionId: string) => Promise<void> | void;
}) {
    const [sending, setSending] = useState<string | null>(null);
    const category = DECISION_CATEGORY_META[prompt.category];
    const chosenLabel = ownChoice
        ? prompt.options.find((option) => option.id === ownChoice.optionId)?.label
        : null;

    useEffect(() => {
        setSending(null);
    }, [prompt.id]);

    const choose = async (option: DecisionOptionView) => {
        if (disabled || submitted || pending || sending) return;
        setSending(option.id);
        try {
            await onSubmit(option.id);
        } finally {
            setSending(null);
        }
    };

    if (submitted) {
        return (
            <SoftCard className="border-jade/20 bg-jade/[0.03] p-5">
                <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-jade/25 bg-jade/10 text-jade">
                        <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-jade">
                            Decisión privada registrada
                        </p>
                        <h3 className="mt-1 text-lg text-parchment">{chosenLabel ?? "Tu elección está a salvo"}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-parchment-dim">
                            {chosenLabel
                                ? "Nadie verá esta elección hasta que el turno se resuelva para ambos jugadores."
                                : "El servidor ya recibió tu decisión. Se revelará al resolver el turno."}
                        </p>
                    </div>
                </div>
            </SoftCard>
        );
    }

    return (
        <section aria-labelledby="decision-title">
            <SoftCard className="overflow-hidden border-gold/20 bg-gold/[0.025]">
                <div className="border-b border-white/[0.07] p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className="text-[0.65rem] font-semibold uppercase tracking-[0.16em]"
                                style={{ color: category.color }}
                            >
                                {category.label}
                            </span>
                            <Badge tone={prompt.source === "evento" ? "amber" : "gold"}>
                                {prompt.source === "evento" ? "Reacción al mundo" : "Decisión de vida"}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge tone="neutral">{prompt.options.length} caminos</Badge>
                        </div>
                    </div>
                    <h2 id="decision-title" className="mt-2 text-2xl text-parchment sm:text-3xl">
                        {prompt.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-parchment-dim">{prompt.description}</p>
                    {prompt.contextNote ? (
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-sky/15 bg-sky/[0.04] px-3 py-2 text-[0.68rem] leading-relaxed text-sky">
                            <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {prompt.contextNote}
                        </p>
                    ) : null}
                </div>
                <div className="space-y-2.5 p-4 sm:p-5">
                    {prompt.options.map((option, index) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => void choose(option)}
                            disabled={disabled || pending || sending !== null || submitted}
                            aria-busy={sending === option.id}
                            className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.02] p-3.5 text-left transition hover:border-gold/30 hover:bg-gold/[0.04] focus-visible:border-gold/40 disabled:cursor-not-allowed disabled:opacity-60 sm:p-4"
                        >
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-[0.68rem] font-semibold tabular-nums text-parchment-faint group-hover:border-gold/30 group-hover:text-gold">
                                {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-parchment">
                                        {option.label}
                                        {sending === option.id ? (
                                            <span className="ml-2 inline-flex items-center gap-1 text-[0.65rem] text-gold">
                                                <LoaderCircle className="h-3 w-3 animate-spin" /> Registrando…
                                            </span>
                                        ) : null}
                                    </span>
                                    {option.risk ? (
                                        <Badge tone={riskTone(option.successChance !== null ? 100 - option.successChance : 0)}>
                                            Riesgo {option.risk}
                                        </Badge>
                                    ) : null}
                                    {option.cost !== null && option.cost > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[0.65rem] text-amber">
                                            <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
                                            {formatCompactMoney(option.cost, currency)}<span className="decision-dollar-cost">≈ {new Intl.NumberFormat("es",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(option.cost)} PPP</span>
                                        </span>
                                    ) : null}
                                    {!!option.recurringCost&&<span className="decision-dollar-cost">+{new Intl.NumberFormat("es",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(option.recurringCost)} PPP/mes</span>}
                                    {option.successChance !== null ? (
                                        <span className="text-[0.65rem] text-sky">
                                            {formatPercent(option.successChance, 0)} de éxito
                                        </span>
                                    ) : null}
                                </span>
                                <span className="mt-1 block text-xs leading-relaxed text-parchment-faint">
                                    {option.description}
                                    {option.impact?.length ? (
                                        <span className="mt-1.5 flex flex-wrap gap-1">
                                            {option.impact.map((item) => (
                                                <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-0.5 text-[0.6rem] text-parchment-faint">
                                                    {item}
                                                </span>
                                            ))}
                                        </span>
                                    ) : null}
                                </span>
                                {option.requiresNote ? (
                                    <span className="mt-1.5 flex items-center gap-1 text-[0.65rem] text-parchment-faint">
                                        <ShieldQuestion className="h-3 w-3" /> {option.requiresNote}
                                    </span>
                                ) : null}
                            </span>
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-parchment-faint transition group-hover:translate-x-0.5 group-hover:text-gold" aria-hidden="true" />
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 border-t border-white/[0.06] px-5 py-3 text-[0.65rem] text-parchment-faint">
                    <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {solo ? "Tu decisión y sus consecuencias se guardarán en el diario de esta vida." : "Tu elección no se revela al rival antes de resolver el turno."}
                </div>
            </SoftCard>

        </section>
    );
}
