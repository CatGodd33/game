import type { CharacterState } from "@life-duel/shared";

const stages = ["Citas", "Pareja", "Compromiso", "Matrimonio"];

export function RelationshipStory({ character: c, year }: { character: CharacterState; year: number }) {
    if (!c.partnerName) return null;
    const stage = c.maritalStatus === "married" ? 3 : c.relationship?.stage === "engaged" ? 2 : c.relationship?.stage === "committed" ? 1 : 0;
    const months = Math.max(0, year * 12 + (c.liveEconomy?.month ?? 0) - (c.relationship?.startedMonth ?? (c.partnerProfile?.sinceYear ?? year) * 12));
    const timeline = c.relationship?.timeline ?? [];
    const futureTalked = (c.flags ?? []).includes("futuro_hablado");
    const readyForProposal = stage === 1 && futureTalked && months >= 18 && timeline.length >= 3 && (c.partnerBond ?? 65) >= 50;
    const hint = stage === 0
        ? "Todavía os estáis conociendo. La próxima cita puede cambiarlo todo; una boda no está sobre la mesa."
        : stage === 1 && !futureTalked
            ? "Ya sois pareja. Antes de pensar en una boda, toca hablar de convivencia, dinero y proyectos."
            : readyForProposal
                ? "Habéis construido una historia y hablado del futuro. Si queréis, podéis plantearos un compromiso."
                : stage === 2
                    ? "Habéis elegido comprometeros. La fecha, el presupuesto y la celebración se deciden después, sin prisas."
                    : "El tiempo que os dedicáis cuenta tanto como los planes. Convivir, casarse y criar son decisiones distintas.";
    return (
        <section className="story-panel relationship-story" aria-label={`Relación con ${c.partnerName}`}>
            <div className="relationship-story-heading">
                <span className="relationship-monogram" aria-hidden="true">{c.partnerName.charAt(0)}</span>
                <div>
                    <p className="story-eyebrow">Una historia compartida</p>
                    <h2>{c.partnerName} y tú</h2>
                </div>
                <span className="relationship-stage">{stage === 0 ? "Os estáis conociendo" : stage === 1 ? "Relación estable" : stages[stage]}</span>
            </div>
            <ol aria-label="Etapas de vuestra relación" className="relationship-stages">
                {stages.map((label, i) => (
                    <li key={label} className={i <= stage ? "reached" : ""} aria-current={i === stage ? "step" : undefined}>
                        <i />{label}
                    </li>
                ))}
            </ol>
            <div className="relationship-story-facts">
                <span>{months < 12 ? `${months} meses desde el primer encuentro` : `${Math.floor(months / 12)} años de historia`}</span>
                <span>{c.partnerProfile?.sharedHousehold ? "Hogar compartido" : "Cada uno mantiene su presupuesto"}</span>
                {c.partnerProfile?.country ? <span>Origen: {c.partnerProfile.country}</span> : null}
            </div>
            <p className="relationship-hint">{hint}</p>
            {timeline.length > 0 ? (
                <div className="relationship-timeline">
                    <p className="story-eyebrow">Lo que habéis vivido</p>
                    <ol>
                        {timeline.slice(-4).map((entry) => (
                            <li key={entry.id} className={`relationship-timeline-entry ${entry.category}`}>
                                <strong>{entry.title}</strong>
                                <span>{entry.text}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            ) : (
                <p className="story-muted">Aún no hay capítulos que contar. La relación empieza con gestos pequeños, no con una boda.</p>
            )}
        </section>
    );
}
