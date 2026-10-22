import { describe, expect, it } from "vitest";
import { getDecision } from "../server/src/simulation/decisions.js";
import { buildPrompt, decisionEligible } from "../server/src/simulation/decision-selector.js";
import { advanceArcChapter } from "../server/src/narrative/arcs.js";
import { createRng, deriveSeed } from "../server/src/simulation/rng.js";
import { computeWealthPressure, computeWealthUpkeep, netWorth } from "../server/src/simulation/wealth-pressure.js";
import { getGameView } from "../server/src/services/view.js";
import { characterFor, makeDuel, makeSolo } from "./helpers.js";

describe("coherencia de edad y narrativa", () => {
    it("una epidemia a los 8 años solo ofrece decisiones de infancia", () => {
        const decision = getDecision("respuesta_epidemia");
        expect(decision).toBeTruthy();
        const { game } = makeDuel("epidemia-infancia-001");
        const child = characterFor(game, 1);
        child.age = 8;
        const prompt = buildPrompt(decision!, child, game.config.content.severity, "epidemia", game.birth);
        expect(prompt).toBeTruthy();
        expect(prompt!.options.map((option) => option.id).sort()).toEqual([
            "amigos_a_escondidas",
            "quedarse_en_casa",
            "recados_vecino",
        ]);
        const text = prompt!.options.map((option) => `${option.label} ${option.description}`).join(" ").toLowerCase();
        expect(text).not.toMatch(/nómina|mantener el trabajo|vida social|rutina/);
    });

    it("la adolescencia tiene sus propias opciones y la adultez empieza a los 18", () => {
        const decision = getDecision("respuesta_epidemia")!;
        const { game } = makeDuel("epidemia-edades-002");
        const teen = characterFor(game, 1);
        teen.age = 15;
        const teenPrompt = buildPrompt(decision, teen, game.config.content.severity, "epidemia", game.birth)!;
        expect(teenPrompt.options.map((option) => option.id)).toEqual([
            "clases_a_distancia",
            "cuidar_familiar",
            "salir_con_amigos",
        ]);

        const adult = characterFor(game, 1);
        adult.age = 25;
        const adultPrompt = buildPrompt(decision, adult, game.config.content.severity, "epidemia", game.birth)!;
        expect(adultPrompt.options.map((option) => option.id)).toEqual(["aislarse", "seguir_rutina", "cuidar_otros"]);
    });

    it("las escenas de relación no fijan Italia y el país de la pareja se sortea", () => {
        const exchange = getDecision("encuentro_intercambio");
        expect(exchange).toBeTruthy();
        expect(exchange!.description).not.toMatch(/Italia/i);
        expect(exchange!.options.every((option) => !option.description.match(/Italia/i))).toBe(true);
        expect(exchange!.options.find((option) => option.id === "conocer")?.outcomes.success.partnerCountry).toBe("RANDOM");
    });

    it("el destino del primer billete es visible a los 17 y no está fijado", () => {
        const mobility = getDecision("primer_billete");
        expect(mobility).toBeTruthy();
        expect(mobility!.minAge).toBe(17);
        expect(mobility!.options).toHaveLength(4);
        const { game } = makeDuel("primer-billete-003");
        const character = characterFor(game, 1);
        character.age = 18;
        expect(decisionEligible(mobility!, character, game.config.content.severity, false, game.birth)).toBe(true);
        expect(mobility!.options.some((option) => option.outcomes.success.migrateTo?.countryCode === "RANDOM")).toBe(true);
    });
});

describe("arcos narrativos", () => {
    it("no repite capítulos y limita el mazo a tres arcos por vida", () => {
        for (const seed of ["arcos-001", "arcos-002", "arcos-003", "arcos-004", "arcos-005"]) {
            const game = makeSolo(seed);
            const character = characterFor(game, 1);
            character.flags = [];
            character.age = 10;
            const scenes: string[] = [];
            for (let age = 10; age <= 80; age += 1) {
                game.currentYear = game.birth.year + age;
                character.age = age;
                const scene = advanceArcChapter(game, character, createRng(deriveSeed(seed, "arc-test", age)));
                if (scene) scenes.push(scene);
            }
            const started = (character.flags ?? []).filter((flag) => flag.startsWith("arco_") && flag.includes("_inicio_"));
            expect(started.length).toBeLessThanOrEqual(3);
            expect(scenes.length).toBeLessThanOrEqual(9);
            expect(new Set(scenes).size).toBe(scenes.length);
            const debtChapters = (character.flags ?? []).filter((flag) => flag.startsWith("arco_secreto_deuda_cap_"));
            expect(debtChapters.length).toBeLessThanOrEqual(3);
        }
    });

    it("la deuda familiar no aparece en todas las vidas ni antes de los diez años", () => {
        const ages: number[] = [];
        for (let index = 0; index < 40; index += 1) {
            const seed = `deuda-${index}`;
            const game = makeSolo(seed);
            const character = characterFor(game, 1);
            character.flags = [];
            for (let age = 6; age <= 30; age += 1) {
                game.currentYear = game.birth.year + age;
                character.age = age;
                advanceArcChapter(game, character, createRng(deriveSeed(seed, "debt-test", age)));
                const start = (character.flags ?? []).find((flag) => flag.startsWith("arco_secreto_deuda_inicio_"));
                if (start) {
                    ages.push(Number(start.split("_").at(-1)) - game.birth.year);
                    break;
                }
            }
        }
        expect(ages.every((age) => age >= 10)).toBe(true);
        expect(ages.length).toBeLessThan(40);
    });
});

describe("presión patrimonial", () => {
    it("calcula patrimonio, mantenimiento y una lectura visible para ambos jugadores", () => {
        const { game, hostId, guestId } = makeDuel("riqueza-001");
        const character = characterFor(game, 1);
        character.age = 42;
        character.finance.money = 180_000;
        character.finance.annualIncome = 90_000;
        character.finance.annualExpenses = 40_000;
        character.assets = [{ id: "casa-1", kind: "home", name: "Casa", value: 400_000, purchasedYear: game.birth.year + 20 }];

        expect(netWorth(character)).toBe(580_000);
        expect(computeWealthUpkeep(character)).toBeGreaterThan(0);
        const pressure = computeWealthPressure(character);
        expect(pressure.tier).toMatch(/alta|muy-alta/);
        expect(pressure.annualUpkeep).toBeGreaterThan(0);
        expect(pressure.notes.length).toBeGreaterThan(0);

        const hostView = getGameView(game, hostId);
        const guestView = getGameView(game, guestId);
        expect(hostView.me.wealthPressure.netWorth).toBe(580_000);
        expect(guestView.opponent?.wealthPressure.netWorth).toBe(580_000);
    });

    it("no cobra mantenimiento a quien todavía no tiene un patrimonio grande", () => {
        const game = makeSolo("riqueza-002");
        const character = characterFor(game, 1);
        character.finance.money = 2_000;
        character.finance.annualIncome = 18_000;
        character.finance.annualExpenses = 16_000;
        character.assets = [];
        expect(computeWealthUpkeep(character)).toBe(0);
        expect(computeWealthPressure(character).tier).toBe("baja");
    });
});
