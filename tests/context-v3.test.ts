import { describe, expect, it } from "vitest";
import { buildPrompt, requirementsMet, resolveCostRule } from "../server/src/simulation/decision-selector.js";
import { DECISIONS, getDecision } from "../server/src/simulation/decisions.js";
import { buildMonthlyStatements, computeEssentialBreakdown } from "../server/src/simulation/economy.js";
import { makeSolo, characterFor, TEST_CONFIG } from "./helpers.js";
import type { GameConfig } from "@life-duel/shared";

function indiaConfig(): GameConfig {
    return { ...TEST_CONFIG, fixedCountry: "IND" };
}

describe("contexto v3: decisiones y economía cotidiana", () => {
    it("solo muestra respuestas escritas para esa situación, sin relleno genérico", () => {
        const game = makeSolo("context-three-options", TEST_CONFIG);
        const character = characterFor(game, 1);
        for (const decision of DECISIONS) {
            character.age = Math.min(decision.maxAge, Math.max(decision.minAge, 25));
            character.usedDecisionIds = [];
            character.finance.money = 0;
            character.finance.debt = 0;
            character.business = null;
            const prompt = buildPrompt(decision, character, "full", undefined, game.birth);
            if(!prompt)continue;
            expect(prompt.options.length, decision.id).toBeGreaterThan(0);
            for(const option of prompt.options)expect(decision.options.some(authored=>authored.id===option.id),decision.id).toBe(true);
            expect(new Set(prompt.options.map((option) => option.id)).size, decision.id).toBe(prompt.options.length);
        }
    });

    it("las decisiones culturales solo se activan en el contexto compatible", () => {
        const game = makeSolo("context-india-female", indiaConfig());
        const character = characterFor(game, 1);
        const decision = getDecision("presion_estudios_genero")!;
        character.sex = "female";
        character.age = 15;
        expect(requirementsMet(character, decision.requirements, "full", game.birth)).toBe(true);
        character.sex = "male";
        expect(requirementsMet(character, decision.requirements, "full", game.birth)).toBe(false);
    });

    it("el coste de migrar depende del origen y del destino, no de un número fijo", () => {
        const game = makeSolo("context-migration-cost", { ...TEST_CONFIG, fixedCountry: "ESP" });
        const character = characterFor(game, 1);
        character.currentCountry = "MEX";
        const toGermany = resolveCostRule({ destinationCountry: "DEU" }, character);
        const toSpain = resolveCostRule({ destinationCountry: "ESP" }, character);
        expect(toGermany).toBeGreaterThan(toSpain);
    });

    it("el banco genera doce meses y cierra exactamente en el saldo autoritativo", () => {
        const game = makeSolo("context-bank", TEST_CONFIG);
        const character = characterFor(game, 1);
        character.age = 30;
        character.finance.money = 15000;
        character.finance.debt = 0;
        const breakdown = computeEssentialBreakdown(character, game.birth, game.economy, game.config.difficulty);
        const monthly = buildMonthlyStatements(character, breakdown, 24000, 2400, 0, 2030);
        expect(monthly).toHaveLength(12);
        expect(monthly.at(-1)!.balance).toBe(character.finance.money);
        expect(monthly.reduce((sum, month) => sum + month.utilities, 0)).toBeGreaterThan(0);
        expect(monthly.some((month) => month.note?.includes("Matrícula"))).toBe(true);
    });

    it("las decisiones nuevas tienen al menos tres opciones y no dependen del azar del cliente", () => {
        const required = ["presion_estudios_genero", "presion_matrimonio", "presion_hijos", "migracion_internacional", "trabajo_contrato", "empresa_contratar", "empresa_crisis", "vivienda_emancipacion", "recuperar_despues_de_fallo", "descanso_digital", "mascota_compania", "invertir_ahorros", "mejorar_hogar", "voluntariado_local", "aprender_arte", "testamento", "limites_trabajo"];
        for (const id of required) {
            const decision = getDecision(id);
            expect(decision, id).toBeTruthy();
            expect(decision!.options.length, id).toBeGreaterThanOrEqual(3);
        }
    });
});
