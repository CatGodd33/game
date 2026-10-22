import { describe, it, expect } from "vitest";
import type { MonthlyStatement } from "@life-duel/shared";
import { makeSolo, TEST_CONFIG } from "./helpers.js";
import { buildPrompt, decisionEligible } from "../server/src/simulation/decision-selector.js";
import { getDecision } from "../server/src/simulation/decisions.js";
import { monthlyStory } from "../server/src/simulation/monthly-story.js";
import {
    proposalBlocked,
    relationshipDecision,
    relationshipMemory,
    relationshipProgress,
    relationshipSummary,
} from "../server/src/simulation/relationship-progress.js";

function adult(seed = "relationship-story") {
    const game = makeSolo(seed, { ...TEST_CONFIG, storyMode: true, monthlyMode: true });
    const character = game.players[0]!.character!;
    game.age = character.age = 30;
    game.currentYear = game.birth.year + 30;
    character.partnerName = "Priya";
    character.partnerBond = 70;
    character.maritalStatus = "dating";
    character.partnerProfile = {
        country: game.birth.countryCode,
        annualIncome: 16000,
        metAt: "work",
        sinceYear: game.currentYear - 3,
        sharedHousehold: false,
    };
    character.relationship = {
        stage: "seeing",
        startedMonth: game.currentYear * 12 - 36,
        memories: [],
        timeline: [],
    };
    return { game, character };
}

describe("arco narrativo de pareja", () => {
    it("no permite una propuesta de matrimonio sin historia ni conversación sobre el futuro", () => {
        const { character } = adult();
        expect(proposalBlocked(character, 2030)).toBeTruthy();
        expect(proposalBlocked(character, 2030)).not.toMatch(/boda/i);
    });

    it("exige una historia visible antes de comprometerse", () => {
        const { game, character } = adult("relationship-gate");
        const proposal = getDecision("relationship_proposal")!;
        expect(decisionEligible(proposal, character, "full", false, game.birth)).toBe(false);

        character.relationship = {
            stage: "committed",
            startedMonth: game.currentYear * 12 - 24,
            memories: ["first-date", "honest-talk", "future"],
            timeline: [
                { id: "first-date", title: "La primera cita", text: "Quedasteis en el barrio.", month: game.currentYear * 12 - 24, category: "cita" },
                { id: "honest-talk", title: "Una conversación honesta", text: "Hablasteis de lo que esperabais.", month: game.currentYear * 12 - 18, category: "familia" },
                { id: "future", title: "La conversación sobre el futuro", text: "Os imaginasteis juntos.", month: game.currentYear * 12 - 12, category: "hito" },
            ],
        };
        character.flags = ["futuro_hablado"];
        expect(proposalBlocked(character, game.currentYear)).toBeUndefined();
        expect(decisionEligible(proposal, character, "full", false, game.birth)).toBe(true);

        const prompt = buildPrompt(proposal, character, "full", undefined, game.birth)!;
        expect(prompt.title).toContain("Priya");
        expect(prompt.description).toContain("Priya");
        expect(prompt.contextNote).toContain("La primera cita");
        expect(relationshipSummary(character, game.currentYear)).toContain("2 años");
    });

    it("el orden es relación, conversación sobre el futuro, compromiso y boda", () => {
        const { game, character } = adult("relationship-sequence");
        const now = game.currentYear * 12;
        character.relationship = {
            stage: "committed",
            startedMonth: now - 24,
            memories: ["first-date", "honest-talk", "future"],
            timeline: [
                { id: "first-date", title: "La primera cita", text: "Quedasteis.", month: now - 24, category: "cita" },
                { id: "honest-talk", title: "Una conversación honesta", text: "Hablasteis.", month: now - 18, category: "familia" },
                { id: "future", title: "La conversación sobre el futuro", text: "Os imaginasteis juntos.", month: now - 12, category: "hito" },
            ],
            lastChoiceMonth: now - 24,
        };
        character.flags = [];
        expect(relationshipDecision(character, game.currentYear)).toBe("relationship_commit");
        character.flags = ["futuro_hablado"];
        expect(relationshipDecision(character, game.currentYear)).toMatch(/^relationship_proposal/);
        character.relationship.stage = "engaged";
        character.relationship.engagedMonth = now - 4;
        expect(relationshipDecision(character, game.currentYear)).toBe("relationship_wedding");
    });

    it("la boda solo existe después de un compromiso aceptado", () => {
        const { game, character } = adult("relationship-wedding");
        const wedding = getDecision("relationship_wedding")!;
        character.relationship = {
            stage: "committed",
            startedMonth: game.currentYear * 12 - 30,
            memories: ["first-date", "honest-talk", "future"],
            timeline: [],
        };
        character.flags = ["futuro_hablado"];
        expect(decisionEligible(wedding, character, "full", false, game.birth)).toBe(false);

        character.relationship.stage = "engaged";
        character.relationship.engagedMonth = game.currentYear * 12 - 4;
        expect(decisionEligible(wedding, character, "full", false, game.birth)).toBe(true);
    });

    it("guarda las citas y los hitos para que la historia sea visible", () => {
        const { game, character } = adult("relationship-memory");
        character.relationship = {
            stage: "seeing",
            startedMonth: game.currentYear * 12 - 3,
            memories: [],
            timeline: [],
        };
        const text = relationshipMemory(character, game.currentYear);
        expect(text).toContain("Priya");
        expect(character.relationship.timeline?.length).toBe(1);
        expect(character.relationship.timeline![0]!.title).toBe("La primera cita");
        expect(character.relationship.memories).toContain("first-date");
        expect(relationshipProgress(character, game.currentYear)!.timeline!.length).toBe(1);
    });

    it("el diario selecciona cuatro escenas con categoría y sin repetir el mismo mes", () => {
        const { game, character } = adult("relationship-diary");
        character.manualActions = [];
        for (let month = 1; month <= 12; month += 1) {
            monthlyStory(game, character, { month } as unknown as MonthlyStatement);
        }
        const entries = (character.manualActions ?? []).filter(entry => entry.action === "chronicle");
        expect(entries).toHaveLength(4);
        expect(new Set(entries.map(entry => entry.month)).size).toBe(4);
        expect(entries.every(entry => Boolean(entry.category))).toBe(true);
        expect(entries.every(entry => entry.text.length > 80)).toBe(true);
    });
});
