import type { CharacterState } from "@life-duel/shared";

export function relationshipMonth(c: CharacterState, year: number): number {
    return year * 12 + (c.liveEconomy?.month ?? 0);
}

/** Old saves keep their established relationship; new dates start without promises. */
export function relationshipProgress(c: CharacterState, year: number) {
    if (!c.partnerName) return undefined;
    const now = relationshipMonth(c, year);
    c.relationship ??= {
        stage: c.maritalStatus === "married" ? "married" : now - (c.partnerProfile?.sinceYear ?? year) * 12 >= 24 ? "committed" : "seeing",
        startedMonth: (c.partnerProfile?.sinceYear ?? year) * 12,
        memories: [],
        timeline: [],
    };
    const relationship = c.relationship;
    // Partidas creadas antes del diario de relación: se conserva su etapa,
    // pero se les añade la estructura necesaria para que la historia sea visible.
    relationship.timeline ??= [];
    return relationship;
}

export function relationshipHistory(c: CharacterState, year: number) {
    return relationshipProgress(c, year)?.timeline ?? [];
}

export function relationshipStageLabel(c: CharacterState, year: number): string {
    const r = relationshipProgress(c, year);
    if (!r) return "Sin pareja";
    return r.stage === "seeing"
        ? "Os estáis conociendo"
        : r.stage === "committed"
            ? "Relación estable"
            : r.stage === "engaged"
                ? "Compromiso"
                : "Matrimonio";
}

/** Texto breve que acompaña a una decisión de pareja. */
export function relationshipSummary(c: CharacterState, year: number): string | undefined {
    const r = relationshipProgress(c, year);
    if (!r) return undefined;
    const now = relationshipMonth(c, year);
    const months = Math.max(0, now - r.startedMonth);
    const time = months < 12 ? `${months} ${months === 1 ? "mes" : "meses"}` : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "año" : "años"}`;
    const recent = [...(r.timeline ?? [])].slice(-3).map(entry => entry.title);
    const history = recent.length ? ` Lo que habéis vivido: ${recent.join("; ")}.` : "";
    return `Lleváis ${time} juntos y estáis en la etapa «${relationshipStageLabel(c, year)}».${history}`;
}

export function proposalBlocked(c: CharacterState, year: number): string | undefined {
    const r = relationshipProgress(c, year);
    if (!r) return "Primero necesitas conocer a alguien";
    if (r.stage === "married" || c.maritalStatus === "married") return "Ya habéis celebrado el matrimonio";
    if (r.stage === "engaged") return "Ya hay un compromiso; falta decidir cómo celebrarlo";
    if (r.stage !== "committed") return "Primero hablad de si queréis una relación estable";
    if (!(c.flags ?? []).includes("futuro_hablado")) return "Antes de dar ese paso, hablad de lo que queréis construir juntos";
    if (relationshipMonth(c, year) - r.startedMonth < 18 || (r.timeline?.length ?? 0) < 3) return "Os falta una historia compartida antes de proponer matrimonio";
    if ((c.partnerBond ?? 65) < 50) return "Antes de comprometeros, cuidad la relación";
    return undefined;
}

export function relationshipDecision(c: CharacterState, year: number): string | undefined {
    const r = relationshipProgress(c, year);
    if (!r) return undefined;
    const now = relationshipMonth(c, year);
    if (now - (r.lastChoiceMonth ?? -1000) < 4) return undefined;
    if (r.stage === "seeing" && now - r.startedMonth >= 3 && r.memories.length >= 2) return "relationship_define";
    if (r.stage === "committed" && !(c.flags ?? []).includes("futuro_hablado") && now - r.startedMonth >= 6) return "relationship_commit";
    if (r.stage === "engaged" && now - (r.engagedMonth ?? now) >= 3) return "relationship_wedding";
    if (!proposalBlocked(c, year) && now - (r.lastChoiceMonth ?? -1000) >= 12) {
        return (r.startedMonth + c.partnerName!.length) % 2 ? "relationship_proposal_received" : "relationship_proposal";
    }
    return undefined;
}

interface RelationshipBeat {
    id: string;
    after: number;
    title: string;
    category: "cita" | "familia" | "crisis" | "hito";
    text: (c: CharacterState, year: number) => string;
}

/**
 * Las citas no son un contador: son escenas que se guardan y se muestran.
 * La propuesta de matrimonio solo puede aparecer cuando estas escenas existen.
 */
const RELATIONSHIP_BEATS: RelationshipBeat[] = [
    {
        id: "first-date",
        after: 1,
        title: "La primera cita",
        category: "cita",
        text: (c) => `${c.partnerName} y tú quedasteis en ${c.currentLocation}. La conversación tuvo silencios, una risa incómoda y una segunda invitación que ninguno quiso dejar pasar.`,
    },
    {
        id: "second-date",
        after: 3,
        title: "El segundo encuentro",
        category: "cita",
        text: (c) => `${c.partnerName} recordó un detalle de vuestra primera cita. El segundo encuentro terminó con ganas de repetir, todavía sin promesas.`,
    },
    {
        id: "honest-talk",
        after: 6,
        title: "Una conversación honesta",
        category: "familia",
        text: (c) => `Durante un paseo por ${c.currentLocation}, ${c.partnerName} te contó algo que suele guardarse. Escuchaste sin intentar arreglarlo todo; empezó a haber confianza.`,
    },
    {
        id: "family-meeting",
        after: 10,
        title: "Conocer a la familia",
        category: "familia",
        text: (c) => `Conociste a una parte de la familia de ${c.partnerName}. Hubo preguntas sobre tu trabajo, tu país y vuestros planes. No todo fue cómodo, pero ya no erais solo dos personas.`,
    },
    {
        id: "first-trip",
        after: 15,
        title: "Un viaje juntos",
        category: "cita",
        text: (c) => `${c.partnerName} y tú hicisteis un viaje pequeño. Una maleta perdida y un plan que salió mal os enseñaron cómo os tratabais cuando algo no funcionaba.`,
    },
    {
        id: "money-talk",
        after: 20,
        title: "Hablar de dinero",
        category: "familia",
        text: (c) => `Comparasteis con ${c.partnerName} lo que podéis gastar y lo que queréis ahorrar. Hubo una diferencia incómoda, pero esta vez hablasteis antes de prometer nada.`,
    },
    {
        id: "future",
        after: 26,
        title: "La conversación sobre el futuro",
        category: "hito",
        text: (c) => `${c.partnerName} preguntó dónde te imaginas viviendo dentro de unos años. Por primera vez, la conversación sobre el futuro os incluía a los dos.`,
    },
    {
        id: "crisis",
        after: 32,
        title: "Una crisis que os puso a prueba",
        category: "crisis",
        text: (c) => `Una mala racha —cansancio, dinero o una decisión familiar— tensó la relación con ${c.partnerName}. No se resolvió en una tarde; aprendisteis que cuidar también exige hablar de lo difícil.`,
    },
];

/** Memories are milestones in this actual relationship, not random wedding pretexts. */
export function relationshipMemory(c: CharacterState, year: number): string | undefined {
    const r = relationshipProgress(c, year);
    if (!r) return undefined;
    const now = relationshipMonth(c, year), elapsed = now - r.startedMonth;
    if (now - (r.lastSceneMonth ?? -1000) < 2) return undefined;
    const care = (c.manualActions ?? []).some(a => ["time-together", "gift", "travel", "birthday"].includes(a.action ?? "") && now - (a.year * 12 + a.month) <= 2);
    // Las muestras de cuidado cambian el texto de una escena, no sustituyen la historia.
    const beat = RELATIONSHIP_BEATS.find(b => elapsed >= b.after && !r.memories.includes(b.id));
    if (!beat) return undefined;
    const text = personalizeRelationshipBeat(beat.text(c, year), care);
    r.memories.push(beat.id);
    r.lastSceneMonth = now;
    r.timeline ??= [];
    if (!r.timeline.some(entry => entry.id === beat.id)) {
        r.timeline.push({ id: beat.id, title: beat.title, text, month: now, category: beat.category });
    }
    return text;
}

function personalizeRelationshipBeat(text: string, care: boolean): string {
    if (!care) return text;
    return `${text} Esa semana reservaste tiempo para estar juntos sin mirar el reloj; el gesto contó más que el plan.`;
}
