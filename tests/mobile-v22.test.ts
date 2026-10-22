import { describe, expect, it } from "vitest";
import type { LifeMoment } from "@life-duel/shared";
import { buildRecentEntries } from "../client/src/features/life/recentEntries.js";
import { availableFocusOptions } from "../client/src/features/life/focusOptions.js";
import { spendingCategoriesForAge, spendingOptionVisible } from "../client/src/features/life/spendingCategories.js";
import { applyManualAction, minorActionAllowed, spendingOptions } from "../server/src/simulation/spending.js";
import { makeSolo, TEST_CONFIG } from "./helpers.js";

describe("presentación móvil 2.2", () => {
    it("limita el Life Record a cuatro escenas y descarta el relleno de continuidad", () => {
        const moments: LifeMoment[] = [
            { id: "generic-1", kind: "diario", year: 2010, age: 10, title: "Continuidad", text: "Continuidad del año." },
            { id: "decision-1", kind: "decision", year: 2011, age: 11, title: "Elegiste una amistad", text: "Pasaste más tiempo con tu grupo." },
            { id: "world-1", kind: "mundo", year: 2012, age: 12, title: "Una crisis económica", text: "El país entró en recesión." },
            { id: "hit-1", kind: "hito", year: 2013, age: 13, title: "Primer verano fuera", text: "Viajaste con tu familia." },
            { id: "generic-2", kind: "diario", year: 2014, age: 14, title: "La vida siguió su curso", text: "Este año no trajo una encrucijada." },
            { id: "decision-2", kind: "decision", year: 2015, age: 15, title: "Elegiste formación", text: "Empezaste un taller." },
            { id: "health-1", kind: "salud", year: 2016, age: 16, title: "Una lesión", text: "Necesitaste reposo." },
        ];
        const entries = buildRecentEntries({
            moments,
            records: [],
            slot: 1,
            manualActions: [],
            birthYear: 2000,
        });

        expect(entries).toHaveLength(4);
        expect(entries[0]?.id).toBe("health-1");
        expect(entries.map((entry) => entry.id)).not.toContain("generic-2");
        expect(entries.every((entry) => entry.text !== "Continuidad del año.")).toBe(true);
    });

    it("respeta el límite cuando no hay escenas interesantes", () => {
        const moments: LifeMoment[] = Array.from({ length: 7 }, (_, index) => ({
            id: `daily-${index}`,
            kind: "diario" as const,
            year: 2001 + index,
            age: index,
            title: "Continuidad",
            text: "Continuidad.",
        }));
        expect(buildRecentEntries({ moments, records: [], slot: 1, manualActions: [], birthYear: 2000 })).toHaveLength(4);
    });

    it("oculta trabajo durante la infancia y no ofrece enfoque antes de los seis años", () => {
        expect(availableFocusOptions(5)).toHaveLength(0);
        const child = availableFocusOptions(10);
        expect(child.length).toBe(5);
        expect(child.some((option) => option.id === "work")).toBe(false);
        expect(availableFocusOptions(18).some((option) => option.id === "work")).toBe(true);
    });

    it("el catálogo de un menor no muestra empresa, inversión ni deuda", () => {
        const childCategories = spendingCategoriesForAge(10);
        expect(childCategories).not.toContain("empresa");
        expect(childCategories).not.toContain("finanzas");
        expect(childCategories).toContain("bienestar");
        expect(spendingCategoriesForAge(30)).toEqual(expect.arrayContaining(["empresa", "finanzas"]));

        const game = makeSolo("mobile-minor-spend", { ...TEST_CONFIG, fixedCountry: "ESP" });
        const character = game.players[0]!.character!;
        character.age = 10;
        game.age = 10;
        game.currentYear = game.birth.year + 10;
        const options = spendingOptions(game, character);
        const business = options.find((option) => option.id === "business-start")!;
        const hobby = options.find((option) => option.id === "hobby")!;
        expect(business.blocked).toContain("18");
        expect(spendingOptionVisible(business, 10)).toBe(false);
        expect(minorActionAllowed("hobby")).toBe(true);
        expect(hobby.blocked).not.toBe("Disponible al cumplir 18 años");
        expect(() => applyManualAction(game, character, { action: "business-start", idempotencyKey: "minor-company" })).toThrow(/18 años/);
    });
});
