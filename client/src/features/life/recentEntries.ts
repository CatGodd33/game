import type { LifeMoment, PlayerSlot, TurnRecord } from "@life-duel/shared";

export type EntryImportance = "alta" | "media" | "baja";

export interface RecentLifeEntry {
    id: string;
    age: number;
    year: number;
    month: number;
    text: string;
    decision: boolean;
    category?: string;
    importance?: EntryImportance;
    kind?: LifeMoment["kind"];
}

interface BuildRecentEntriesInput {
    moments: LifeMoment[];
    records: TurnRecord[];
    slot: PlayerSlot;
    manualActions: { year: number; month: number; text: string; action?: string; category?: string; importance?: EntryImportance }[];
    birthYear: number;
    /** En móvil solo se muestran cuatro escenas; el historial completo sigue disponible. */
    limit?: number;
}

const GENERIC_TEXT = /Este año no trajo una encrucijada|El entorno evoluciona|La vida siguió su curso|Continuidad/i;
const GENERIC_TITLE = /^Continuidad\b|^El mundo sigue\b/i;
const INTERESTING_KINDS = new Set<LifeMoment["kind"]>(["decision", "hito", "mundo", "salud", "migracion", "final"]);

function isInterestingMoment(moment: LifeMoment): boolean {
    if (GENERIC_TITLE.test(moment.title)) return false;
    if (GENERIC_TEXT.test(moment.text)) return false;
    if (INTERESTING_KINDS.has(moment.kind)) return true;
    // Un diario es interesante cuando cuenta algo concreto, no cuando rellena el año.
    return moment.text.trim().length > 70;
}

function newestFirst(a: RecentLifeEntry, b: RecentLifeEntry): number {
    return b.year - a.year || b.month - a.month || (a.decision === b.decision ? 0 : a.decision ? -1 : 1);
}

/**
 * Normaliza las escenas que ya entrega el servidor. No inventa eventos ni
 * mezcla la vida del rival: solo elige las entradas más recientes y útiles
 * para el resumen móvil. El historial completo conserva todo.
 */
export function buildRecentEntries({
    moments,
    records,
    slot,
    manualActions,
    birthYear,
    limit = 4,
}: BuildRecentEntriesInput): RecentLifeEntry[] {
    if (limit <= 0) return [];

    if (moments.length) {
        const interesting = moments.filter(isInterestingMoment);
        const selected = (interesting.length ? interesting : moments)
            .map((moment): RecentLifeEntry => ({
                id: moment.id,
                age: moment.age,
                year: moment.year,
                month: moment.month === undefined ? 12 : moment.month + 1,
                text: moment.kind === "diario" ? moment.text : `${moment.title}. ${moment.text}`,
                decision: moment.kind === "decision",
                category: moment.category,
                importance: moment.kind === "decision" || moment.kind === "hito" || moment.kind === "final" ? "alta" : undefined,
                kind: moment.kind,
            }))
            .sort(newestFirst);
        return selected.slice(0, limit);
    }

    const decisionTexts = manualActions.filter((action) => action.action === "decision").map((action) => action.text);
    const yearly = records.flatMap((turn, recordIndex) => {
        const record = turn.players[slot];
        if (!record) return [];
        return [
            ...(record.decisionId !== "sin_decision" && !decisionTexts.some((text) => text.startsWith(record.decisionTitle))
                ? [{
                    id: `${turn.year}-${turn.turn}-${recordIndex}-choice`,
                    age: turn.age,
                    year: turn.year,
                    month: 12,
                    text: `${record.decisionTitle}. Elegiste: ${record.optionLabel}.`,
                    decision: true,
                    category: record.decisionCategory ?? undefined,
                    importance: "alta" as const,
                    kind: "decision" as const,
                }]
                : []),
            ...record.narrative
                .filter((line) => !GENERIC_TEXT.test(line) && !decisionTexts.some((text) => text.includes(line)))
                .map((line, index) => ({
                    id: `${turn.year}-${turn.turn}-${recordIndex}-${index}`,
                    age: turn.age,
                    year: turn.year,
                    month: 12,
                    text: line,
                    decision: false,
                    category: undefined,
                    importance: undefined,
                    kind: "diario" as const,
                })),
        ];
    });
    const manual = manualActions.map((action, index) => ({
        id: `manual-${index}`,
        age: action.year - birthYear,
        year: action.year,
        month: action.month + 1,
        text: action.text,
        decision: action.action === "decision",
        category: action.category,
        importance: action.importance,
        kind: action.action === "decision" ? "decision" as const : "diario" as const,
    }));
    return [...yearly, ...manual].sort(newestFirst).slice(0, limit);
}
