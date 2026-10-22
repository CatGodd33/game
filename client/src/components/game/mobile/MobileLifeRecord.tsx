import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, HeartPulse, Sparkles, UsersRound } from "lucide-react";
import type { RecentLifeEntry } from "../../../features/life/recentEntries";

const KIND_ICON = {
    decision: Sparkles,
    hito: Sparkles,
    salud: HeartPulse,
    migracion: BookOpen,
    mundo: BookOpen,
    final: HeartPulse,
    nacimiento: UsersRound,
    diario: BookOpen,
} as const;

export function MobileLifeRecord({
    entries,
    expandedEntry,
    onToggle,
    historyHref,
    historyError,
}: {
    entries: RecentLifeEntry[];
    expandedEntry: string | null;
    onToggle: (id: string) => void;
    historyHref: string;
    historyError: boolean;
}) {
    return (
        <section className="mobile-card mobile-record" aria-labelledby="mobile-record-title" data-testid="mobile-record">
            <header className="mobile-card-head">
                <div>
                    <p className="mobile-kicker">Life record</p>
                    <h2 id="mobile-record-title">Lo que ha pasado</h2>
                </div>
                <Link to={historyHref} className="mobile-inline-link">Ver todo <ArrowUpRight aria-hidden="true" /></Link>
            </header>

            {historyError ? (
                <p className="mobile-record-error" role="alert">
                    No se pudo cargar el diario. <Link to={historyHref}>Abrir historial</Link>
                </p>
            ) : null}

            {entries.length ? (
                <ol className="mobile-record-list">
                    {entries.map((entry) => {
                        const Icon = KIND_ICON[entry.kind ?? (entry.decision ? "decision" : "diario")];
                        const long = entry.text.length > 150;
                        const expanded = expandedEntry === entry.id;
                        return (
                            <li key={entry.id} className={`mobile-record-entry ${entry.decision ? "is-decision" : ""}`}>
                                <span className="mobile-record-icon" aria-hidden="true"><Icon /></span>
                                <div className="mobile-record-copy">
                                    <p className="mobile-record-meta">
                                        <span>Edad {entry.age}</span>
                                        <span>{entry.year}</span>
                                        {entry.category ? <b>{entry.category}</b> : null}
                                    </p>
                                    <p className={long && !expanded ? "mobile-record-excerpt" : undefined}>{entry.text}</p>
                                    {long ? (
                                        <button
                                            type="button"
                                            className="mobile-record-toggle"
                                            aria-expanded={expanded}
                                            onClick={() => onToggle(entry.id)}
                                        >
                                            {expanded ? "Leer menos" : "Leer completo"}
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <p className="mobile-empty-note">Tu historia acaba de empezar. El mundo continúa mientras creces.</p>
            )}

            <Link to={historyHref} className="mobile-record-link">
                Historial completo y exportación <ArrowUpRight aria-hidden="true" />
            </Link>
        </section>
    );
}
