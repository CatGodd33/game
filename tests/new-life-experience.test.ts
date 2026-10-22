import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";
import { makeDuel, makeSolo, characterFor, TEST_CONFIG } from "./helpers.js";
import { advanceArcChapter } from "../server/src/narrative/arcs.js";
import { buildLifeMoments } from "../server/src/narrative/story-stream.js";
import { executeMobility, mobilityOptions } from "../server/src/simulation/mobility.js";
import { createRng } from "../server/src/simulation/rng.js";

describe("nuevo nacimiento y relato", () => {
    it("toda vida nueva empieza hoy y no elige una duración", () => {
        expect(DEFAULT_GAME_CONFIG.era).toBe("present");
        expect(DEFAULT_GAME_CONFIG.maxAge).toBe(105);
    });

    it("construye una corriente única con nacimiento, mundo y decisiones", () => {
        const { game, hostSlot } = makeDuel("history-stream-seed");
        const host = characterFor(game, hostSlot);
        host.manualActions = [
            {
                year: game.birth.year + 4,
                month: 2,
                action: "chronicle",
                text: "ARKANSAS-SECRET-441: en la escuela, alguien contó un secreto que cambió la forma en que mirabas a tu familia.",
            },
        ];
        game.currentYear = game.birth.year + 4;
        game.age = 4;
        const momentsForHost = buildLifeMoments(game, hostSlot);
        const momentsForGuest = buildLifeMoments(game, 2);
        expect(momentsForHost[0]?.kind).toBe("nacimiento");
        expect(momentsForHost.some((moment) => moment.text.includes("ARKANSAS-SECRET-441"))).toBe(true);
        // El diario personal del rival no se revela en el año que aún se juega.
        expect(momentsForGuest.some((moment) => moment.text.includes("ARKANSAS-SECRET-441"))).toBe(false);
        expect(new Set(momentsForHost.map((moment) => moment.id)).size).toBe(momentsForHost.length);
    });

    it("los arcos narrativos avanzan como máximo una vez por año y dejan memoria", () => {
        const game = makeSolo("arc-seed", { ...TEST_CONFIG, storyMode: true, monthlyMode: true });
        const character = characterFor(game, 1);
        character.age = 32;
        character.partnerName = "Marta";
        character.story = {
            ...(character.story ?? {
                focus: "balanced",
                relatives: [],
                companions: [],
                temperament: "curiosa",
                gift: "escuchar",
            }),
            relatives: [],
        };
        game.currentYear = game.birth.year + 32;
        let text: string | null = null;
        for (let index = 0; index < 300 && !text; index += 1) {
            text = advanceArcChapter(game, character, createRng(`arc-probe-${index}`));
        }
        expect(text).toContain("«");
        expect((character.flags ?? []).some((flag) => flag.startsWith("arco_") && flag.includes("_cap_"))).toBe(true);
        const second = advanceArcChapter(game, character, createRng("arc-same-year"));
        expect(second).toBeNull();
    });
});

describe("movilidad internacional", () => {
    it("calcula costes por destino, moneda local y modalidades familiares", () => {
        const game = makeSolo("mobility-offers", { ...TEST_CONFIG, storyMode: true, monthlyMode: true });
        const character = characterFor(game, 1);
        character.age = 25;
        character.educationLevel = "university";
        character.stats.knowledge = 80;
        character.finance.money = 2_000_000;
        character.partnerName = "Alex";
        character.children = 1;
        const result = mobilityOptions(game, character);
        expect(result.offers.length).toBeGreaterThan(20);
        expect(result.offers.some((offer) => offer.countryCode === character.currentCountry)).toBe(false);
        const offer = result.offers.find((candidate) => candidate.purpose === "study")!;
        expect(offer.familyCosts.map((cost) => cost.mode)).toEqual(["solo", "partner", "family"]);
        expect(offer.familyCosts[2]!.total).toBeGreaterThan(offer.familyCosts[0]!.total);
        expect(offer.currency.code).toBeTruthy();
        expect(offer.familyCosts[0]!.localTotal).toBeGreaterThan(0);
        expect(offer.warnings.join(" ")).toContain("PPP");
    });

    it("el servidor cobra, registra y cambia la residencia tras un traslado válido", () => {
        const game = makeSolo("mobility-move", { ...TEST_CONFIG, storyMode: true, monthlyMode: true });
        const character = characterFor(game, 1);
        character.age = 27;
        character.educationLevel = "university";
        character.stats.knowledge = 100;
        character.flags = ["idioma_ingles"];
        character.finance.money = 5_000_000;
        game.currentYear = game.birth.year + 27;
        let success = false;
        for (let attempt = 0; attempt < 40 && !success; attempt += 1) {
            const result = executeMobility(game, character, {
                optionId: "study:ITA",
                familyMode: "solo",
                idempotencyKey: `mobility-test-${attempt}`,
            });
            success = result.success;
        }
        expect(success).toBe(true);
        expect(character.currentCountry).toBe("ITA");
        expect(character.countriesLived).toContain("ITA");
        expect(character.residenceHistory?.at(-1)?.country).toBe("ITA");
        expect(character.flags).toContain("estudios_exterior");
        expect(character.finance.ledger.some((transaction) => transaction.label.includes("Italia"))).toBe(true);
        expect(character.manualActions?.some((action) => action.action === "mobility")).toBe(true);
    });

    it("rechaza una solicitud sin fondos suficientes", () => {
        const game = makeSolo("mobility-poor", { ...TEST_CONFIG, storyMode: true, monthlyMode: true });
        const character = characterFor(game, 1);
        character.age = 25;
        character.educationLevel = "university";
        character.finance.money = 0;
        game.currentYear = game.birth.year + 25;
        expect(() =>
            executeMobility(game, character, {
                optionId: "study:ITA",
                familyMode: "solo",
                idempotencyKey: "mobility-no-money",
            }),
        ).toThrow(/fondos|faltan/i);
        expect(character.currentCountry).toBe("ESP");
    });
});
