import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DECISIONS } from "../server/src/simulation/decisions.js";
import { listEvents } from "../server/src/simulation/events.js";

const html = readFileSync(
    resolve(import.meta.dirname, "../client/public/mapa-decisiones.html"),
    "utf8",
);

function embeddedData(): {
    totals: {
        decisions: number;
        options: number;
        events: number;
        countries: number;
        once: number;
        cooldown: number;
        flagGated: number;
    };
    guide: {
        start: string;
        adultDecision: string;
        childhoodByFlag: Record<string, string>;
        adultByOption: Record<string, string>;
        learningByOption: Record<string, string>;
        roots: Array<{
            decisionId: string;
            label: string;
            sublabel: string;
            x: number;
            y: number;
        }>;
    };
    decisions: Array<{
        id: string;
        title: string;
        description: string;
        categoryLabel: string;
        priority: string;
        minAge: number;
        maxAge: number;
        stage: string;
        options: Array<{
            id: string;
            label: string;
            description: string;
            success: { narrative: string } | null;
        }>;
    }>;
} {
    const match = html.match(
        /<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/,
    );
    expect(match, "El HTML debe incluir los datos del mapa generados").toBeTruthy();
    return JSON.parse(match![1]);
}

describe("mapa de decisiones", () => {
    it("se genera desde el catálogo completo y no conserva marcadores de plantilla", () => {
        const data = embeddedData();
        expect(html).not.toContain("__DECISION_MAP_DATA__");
        expect(html).not.toContain("__DECISION_MAP_APP__");
        expect(html).toContain('id="map-viewport"');
        expect(html).toContain('id="constellation"');
        expect(data.decisions.map((decision) => decision.id)).toEqual(
            DECISIONS.map((decision) => decision.id),
        );
        expect(data.totals.decisions).toBe(DECISIONS.length);
        expect(data.totals.options).toBe(
            DECISIONS.reduce((sum, decision) => sum + decision.options.length, 0),
        );
        expect(data.totals.events).toBe(listEvents().length);
        expect(data.totals.once).toBe(DECISIONS.filter((decision) => decision.once).length);
        expect(data.totals.cooldown).toBe(
            DECISIONS.filter((decision) => (decision.cooldownYears ?? 0) > 0).length,
        );
        expect(data.totals.flagGated).toBe(
            DECISIONS.filter(
                (decision) =>
                    decision.requirements?.flagsAll?.length ||
                    decision.requirements?.flagsAny?.length,
            ).length,
        );
    });

    it("la rama guiada solo apunta a decisiones y opciones reales", () => {
        const data = embeddedData();
        const byId = new Map(DECISIONS.map((decision) => [decision.id, decision]));
        const ids = [
            data.guide.start,
            data.guide.adultDecision,
            ...Object.values(data.guide.childhoodByFlag),
            ...Object.values(data.guide.adultByOption),
            ...Object.values(data.guide.learningByOption),
            ...data.guide.roots.map((root) => root.decisionId),
        ];
        for (const id of ids) expect(byId.has(id), `Falta la decisión ${id}`).toBe(true);

        expect(data.guide.roots).toHaveLength(2);
        expect(data.guide.roots.map((root) => root.decisionId)).toEqual([
            data.guide.start,
            data.guide.adultDecision,
        ]);
        expect(data.guide.roots.every((root) => root.label.length > 5 && root.sublabel.length > 5)).toBe(true);

        const start = byId.get(data.guide.start)!;
        expect(start.options.map((option) => option.id)).toEqual(
            expect.arrayContaining(["observe", "explore", "comfort", "persist"]),
        );
        const adult = byId.get(data.guide.adultDecision)!;
        expect(adult.options.map((option) => option.id)).toEqual(
            expect.arrayContaining(["aprender", "comunidad", "hogar"]),
        );
        expect(
            byId.get("ruta_curso_proyecto")?.options.map((option) => option.id),
        ).toContain("acreditar");
    });

    it("cada decisión publicada conserva opciones y reglas explicables", () => {
        const data = embeddedData();
        for (const decision of data.decisions) {
            expect(decision.title.length).toBeGreaterThan(3);
            expect(decision.description.length).toBeGreaterThan(10);
            expect(decision.categoryLabel.length).toBeGreaterThan(2);
            expect(decision.stage.length).toBeGreaterThan(2);
            expect(decision.options.length).toBeGreaterThan(0);
            expect(decision.minAge).toBeLessThanOrEqual(decision.maxAge);
            for (const option of decision.options) {
                expect(option.id.length).toBeGreaterThan(0);
                expect(option.label.length).toBeGreaterThan(2);
                expect(option.success?.narrative.length).toBeGreaterThan(0);
            }
        }
    });
});
