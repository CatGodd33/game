import { describe, expect, it } from "vitest";
import { makeSolo, TEST_CONFIG } from "./helpers.js";
import { spendingOptions } from "../server/src/simulation/spending.js";
import { DECISIONS, getDecision } from "../server/src/simulation/decisions.js";

function baseGame() {
    const game = makeSolo("v23-property", { ...TEST_CONFIG, fixedCountry: "ITA" });
    const character = game.players[0]!.character!;
    character.age = 35;
    game.age = 35;
    game.currentYear = game.birth.year + 35;
    character.finance.money = 1_000_000;
    character.liveEconomy = { month: 0, statements: [], unpaid: 0, interest: 0 };
    return { game, character };
}

function home(id: string) {
    return {
        id,
        kind: "home" as const,
        name: `Vivienda ${id}`,
        value: 100_000,
        purchasedYear: 2040,
        country: "ITA",
        location: "Roma",
    };
}

describe("economía de vivienda 2.3", () => {
    it("cada vivienda adicional cuesta un 22 % más y la ficha explica la renta", () => {
        const { game, character } = baseGame();
        const first = spendingOptions(game, character).find((option) => option.id === "home")!;
        character.assets = [home("a")];
        const second = spendingOptions(game, character).find((option) => option.id === "home")!;
        character.assets = [home("a"), home("b")];
        const third = spendingOptions(game, character).find((option) => option.id === "home")!;

        expect(second.label).toContain("2ª");
        expect(third.label).toContain("3ª");
        expect(second.price / first.price).toBeCloseTo(1.22, 2);
        expect(third.price / first.price).toBeCloseTo(1.44, 2);
        expect(first.description).toContain("22 %");
    });

    it("una vivienda sin contrato ofrece alquiler y una renta bruta realista", () => {
        const { game, character } = baseGame();
        character.assets = [home("rent")];
        const rent = spendingOptions(game, character).find((option) => option.id === "rent-home-rent")!;
        expect(rent.blocked).toBeUndefined();
        expect(rent.description).toContain("Renta bruta estimada");
        expect(rent.description).toContain("2–3 %");
        expect(rent.description).toContain(String(Math.round(100_000 * 0.0045 * 12)));
    });
});

describe("crisis de empresa 2.3", () => {
    it("añade diez escenarios de negocio con requisitos y opciones", () => {
        const newIds = DECISIONS.filter((decision) => decision.id.startsWith("business_")).map((decision) => decision.id);
        expect(newIds).toEqual(expect.arrayContaining([
            "business_inspection",
            "business_supplier",
            "business_key_person",
            "business_cyber",
            "business_lease",
            "business_lawsuit",
            "business_fire",
            "business_expansion",
            "business_price_war",
            "business_tax_audit",
        ]));
        for (const id of newIds) {
            const decision = getDecision(id)!;
            expect(decision.requirements?.hasBusiness).toBe(true);
            expect(decision.options.length).toBeGreaterThanOrEqual(2);
            expect(decision.options.every((option) => option.description.length > 20)).toBe(true);
        }
    });

    it("las crisis específicas exigen el tipo de negocio correcto", () => {
        expect(getDecision("business_cyber")!.requirements?.businessKind).toContain("tecnologia");
        expect(getDecision("business_lease")!.requirements?.businessKind).toContain("gastronomia");
        expect(getDecision("business_fire")!.requirements?.businessKind).toContain("taller");
    });
});
