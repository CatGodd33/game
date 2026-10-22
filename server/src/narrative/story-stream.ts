import type { LifeMoment, PlayerSlot } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { getCountry } from "../demographics/dataset.js";

const MONTHS = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

function firstSentence(text: string, fallback: string): string {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return fallback;
    const match = clean.match(/^(.{18,110}?[.!?])(?:\s|$)/);
    return match ? match[1] : clean.slice(0, 96) + (clean.length > 96 ? "…" : "");
}

function revealedToOpponent(game: StoredGame, slot: PlayerSlot, viewerSlot: PlayerSlot, year: number, month: number, currentMonth: number): boolean {
    if (game.status === "finished" || slot === viewerSlot) return true;
    if (year < game.currentYear) return true;
    return year === game.currentYear && month < currentMonth;
}

/**
 * Construye una corriente única de escenas a partir de los datos ya resueltos
 * por el servidor. No inventa sucesos ni recalcula nada: reordena y narra.
 */
export function buildLifeMoments(game: StoredGame, viewerSlot: PlayerSlot): LifeMoment[] {
    const moments: LifeMoment[] = [];
    const birth = game.birth;
    const countryName = (code: string) => {
        try {
            return code === birth.countryCode ? birth.countryName : getCountry(code).name;
        } catch {
            return code;
        }
    };

    moments.push({
        id: `birth-${game.id}`,
        kind: "nacimiento",
        year: birth.year,
        age: 0,
        title: `Nacer en ${birth.countryName}`,
        text: `${birth.givenName} ${birth.surname} nació en ${birth.location}, ${birth.countryName}, en una familia ${birth.family.label.toLowerCase()}. ${birth.family.story}`,
        place: `${birth.location}, ${birth.countryName}`,
        category: "vida",
    });

    for (const turn of game.history) {
        for (const event of turn.sharedEvents) {
            moments.push({
                id: `turn-${turn.turn}-event-${event.eventId}`,
                kind: "mundo",
                year: turn.year,
                age: turn.age,
                title: event.title,
                text: event.narrative,
                category: event.category,
                effects: event.effectsSummary,
            });
        }

        for (const [slotKey, record] of Object.entries(turn.players)) {
            if (!record) continue;
            const slot = Number(slotKey) as PlayerSlot;
            moments.push({
                id: `turn-${turn.turn}-player-${slot}-decision`,
                kind: "decision",
                year: turn.year,
                age: turn.age,
                // El cierre anual se lee al final del año, después de sus escenas mensuales.
                month: 11,
                slot,
                alias: record.alias,
                title: record.decisionTitle,
                text: record.narrative.join(" "),
                category: record.decisionCategory ?? undefined,
                decision: {
                    id: record.decisionId,
                    optionId: record.optionId,
                    optionLabel: record.optionLabel,
                    success: record.success,
                    chance: record.chance,
                    roll: record.roll,
                },
                effects: [
                    ...record.milestones,
                    ...(record.economic.net !== 0
                        ? [`Balance anual: ${record.economic.net >= 0 ? "+" : ""}${Math.round(record.economic.net)} USD PPP`]
                        : []),
                ],
            });
            if (record.death) {
                moments.push({
                    id: `turn-${turn.turn}-player-${slot}-death`,
                    kind: "final",
                    year: turn.year,
                    age: record.death.age,
                    slot,
                    alias: record.alias,
                    title: `El final de ${record.alias}`,
                    text: `${record.alias} murió a los ${record.death.age} años. Causa registrada: ${record.death.cause}.`,
                    category: "vida",
                });
            }
        }
    }

    for (const player of game.players) {
        const character = player.character;
        if (!character) continue;
        const slot = player.slot;

        for (const [index, action] of (character.manualActions ?? []).entries()) {
            if (action.action === "decision") continue;
            const month = Number.isFinite(action.month) ? action.month : undefined;
            const monthLabel = month === undefined ? "" : MONTHS[month] ?? "";
            if (!revealedToOpponent(game, slot, viewerSlot, action.year, month ?? 0, character.liveEconomy?.month ?? 0)) continue;
            moments.push({
                id: `manual-${slot}-${action.year}-${action.month}-${index}`,
                kind: "diario",
                year: action.year,
                age: action.year - birth.year,
                month,
                slot,
                alias: player.alias,
                title: firstSentence(action.text, monthLabel ? `Un día de ${monthLabel}` : "Un día de tu vida"),
                text: action.text,
                place: character.currentLocation,
                category: action.category ?? "vida",
            });
        }

        if (character.age >= game.age || game.status === "finished") {
            for (const milestone of character.milestones) {
                if (!revealedToOpponent(game, slot, viewerSlot, milestone.year, 0, character.liveEconomy?.month ?? 0) && milestone.age >= game.age) continue;
                if (milestone.title.startsWith("Nacimiento en")) continue;
                moments.push({
                    id: `milestone-${slot}-${milestone.id}`,
                    kind: "hito",
                    year: milestone.year,
                    age: milestone.age,
                    slot,
                    alias: player.alias,
                    title: milestone.title,
                    text: `Un hito que quedó en la memoria de ${player.alias}, a los ${milestone.age} años.`,
                    category: milestone.category,
                });
            }

            for (const [index, record] of character.medicalHistory.entries()) {
                if (!revealedToOpponent(game, slot, viewerSlot, record.year, 0, character.liveEconomy?.month ?? 0) && record.age >= game.age) continue;
                moments.push({
                    id: `medical-${slot}-${record.year}-${index}`,
                    kind: "salud",
                    year: record.year,
                    age: record.age,
                    slot,
                    alias: player.alias,
                    title: record.condition,
                    text: `${record.condition} (${record.severity}). ${record.note}`,
                    category: "salud",
                });
            }
        }

        if (character.currentCountry !== character.birthCountry) {
            moments.push({
                id: `residence-${slot}-${character.currentCountry}`,
                kind: "migracion",
                year: game.currentYear,
                age: character.age,
                slot,
                alias: player.alias,
                title: `Vivir en ${countryName(character.currentCountry)}`,
                text: `${player.alias} vive ahora en ${character.currentLocation}, ${countryName(character.currentCountry)}. Nació en ${countryName(character.birthCountry)}.`,
                place: character.currentLocation,
                category: "migracion",
            });
        }
    }

    const seen = new Set<string>();
    return moments
        .filter((moment) => {
            const key = `${moment.kind}-${moment.slot ?? "world"}-${moment.year}-${moment.month ?? 0}-${moment.title}-${moment.text.slice(0, 60)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((first, second) => {
            if (first.year !== second.year) return first.year - second.year;
            if ((first.month ?? 0) !== (second.month ?? 0)) return (first.month ?? 0) - (second.month ?? 0);
            return first.id.localeCompare(second.id);
        });
}
