import type { LifeFocus } from "@life-duel/shared";
import {
    BookOpen,
    BriefcaseBusiness,
    HeartPulse,
    Lock,
    Palette,
    Scale,
    Sparkles,
    UsersRound,
    Wallet,
} from "lucide-react";
import { availableFocusOptions } from "../../../features/life/focusOptions";

const ICONS = {
    balanced: Scale,
    study: BookOpen,
    relationships: UsersRound,
    health: HeartPulse,
    hobbies: Palette,
    work: BriefcaseBusiness,
} as const;

const STAGE_COPY: Record<string, string> = {
    early: "Los primeros años no se eligen: se descubren en familia.",
    school: "Cada año deja una huella. Elige dónde poner tu energía.",
    adult: "Tu tiempo es finito. ¿Qué quieres que crezca este año?",
    late: "La experiencia también se cuida. Decide qué merece tu atención.",
};

function stageCopy(age: number): string {
    if (age < 6) return STAGE_COPY.early!;
    if (age < 18) return STAGE_COPY.school!;
    if (age < 65) return STAGE_COPY.adult!;
    return STAGE_COPY.late!;
}

export function MobileFocusCard({
    age,
    focus,
    busy,
    onFocus,
    onSpend,
}: {
    age: number;
    focus: LifeFocus | undefined;
    busy: boolean;
    onFocus: (focus: LifeFocus) => void;
    onSpend: () => void;
}) {
    const options = availableFocusOptions(age);
    const canSpend = age >= 6;

    return (
        <section className="mobile-card mobile-focus" aria-labelledby="mobile-focus-title" data-testid="mobile-focus">
            <header className="mobile-card-head">
                <div>
                    <p className="mobile-kicker">El próximo año</p>
                    <h2 id="mobile-focus-title">¿A qué darás prioridad?</h2>
                </div>
                <Sparkles className="mobile-head-icon" aria-hidden="true" />
            </header>
            <p className="mobile-focus-copy">{stageCopy(age)}</p>

            {options.length ? (
                <div className="mobile-focus-grid" role="group" aria-label="Enfoque del año">
                    {options.map((option) => {
                        const Icon = ICONS[option.icon];
                        return (
                            <button
                                key={option.id}
                                type="button"
                                className="mobile-focus-option"
                                aria-pressed={focus === option.id}
                                disabled={busy}
                                onClick={() => onFocus(option.id)}
                            >
                                <span className="mobile-focus-icon" aria-hidden="true"><Icon /></span>
                                <span>
                                    <strong>{option.label}</strong>
                                    <small>{option.effect}</small>
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="mobile-focus-early">
                    Tu familia elige por ti lo esencial. Las pequeñas experiencias de estos años
                    se convertirán, sin que lo notes, en parte de tu carácter.
                </p>
            )}

            <button
                type="button"
                className={`mobile-spend ${canSpend ? "" : "is-locked"}`}
                disabled={busy || !canSpend}
                onClick={onSpend}
                aria-label="Gastar e invertir ↗"
                title={canSpend ? age >= 18 ? "Abrir el catálogo de gastos e inversiones" : "Decisiones de tiempo y cuidado para tu edad" : "Las primeras decisiones llegan a los 6 años"}
            >
                <span className="mobile-spend-icon" aria-hidden="true">
                    {canSpend ? <Wallet /> : <Lock />}
                </span>
                <span>
                    <strong>Gastar e invertir ↗</strong>
                    <small>{canSpend ? age >= 18 ? "Bienestar, estudios, hogar y futuro" : "Cuidarte, aprender y compartir tiempo" : "Tu familia decide por ti en estos primeros años"}</small>
                </span>
            </button>
        </section>
    );
}
