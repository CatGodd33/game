import { describe, expect, it, vi } from "vitest";
import { createSoloGame, refreshDeadline, resolveTurn, setGameSpeed, setPaused } from "../server/src/simulation/engine.js";
import { TEST_CONFIG, MemoryGameStore } from "./helpers.js";
import { storyYear } from "../server/src/simulation/story.js";
import { chronicleYear } from "../server/src/simulation/chronicle.js";
import { GameService } from "../server/src/services/gameService.js";
import type { GameConfig } from "@life-duel/shared";
const config: GameConfig = { ...TEST_CONFIG, storyMode: true, fixedYear: 2026, difficulty: "relajada", speed: 1, decisionTimerSeconds: 60 };
function life(seed = "narrative-life-test") { return createSoloGame("story-game", "story-player", "Persona", config, seed); }
describe("vida narrativa", () => {
    it("nace a edad cero sin obligar a elegir y conserva años cotidianos", () => {
        const game = life();
        expect(game.age).toBe(0);
        expect(game.pending?.prompts[1]).toBeUndefined();
        expect(game.players[0]?.character?.story?.companions).toHaveLength(4);
        resolveTurn(game);
        expect(game.age).toBe(1);
        expect(game.history[0]?.players[1]?.narrative.join(" ")).toContain("primeros cuidados");
        expect(game.pending?.prompts[1]).toBeUndefined();
        resolveTurn(game);
        expect(game.age).toBe(2);
        expect(game.pending?.prompts[1]).toBeTruthy();
        const before = game.age;
        resolveTurn(game);
        expect(game.age).toBe(before); // A decision blocks the clock.
    });
    it("avanza con Play aunque las decisiones sean manuales", () => {
        const game = life();
        setGameSpeed(game, 12);
        expect(game.pending?.deadlineAt).toBeTruthy();
        setPaused(game, true);
        expect(game.pending?.deadlineAt).toBeNull();
        setPaused(game, false);
        expect(game.pending?.deadlineAt).toBeTruthy();
        game.clock.autoDecisions = true;
        refreshDeadline(game);
        expect(game.pending?.deadlineAt).toBeTruthy();
    });
    it("produce una crónica densa, personal y reproducible", () => {
        const game = life();
        const character = game.players[0]!.character!;
        character.age = 34;
        character.employment.status = "employed";
        character.employment.occupation = "administrativa";
        character.partnerName = "Alex";
        const first = chronicleYear(game.seed, game.birth, character, game.birth.year + 34);
        const second = chronicleYear(game.seed, game.birth, character, game.birth.year + 34);
        expect(first).toEqual(second);
        expect(first.length).toBeGreaterThanOrEqual(5);
        expect(new Set(first).size).toBe(first.length);
    });

    it("mantiene familias e historias reproducibles y el enfoque tiene efecto", () => {
        const one = life(), two = life();
        expect(one.players[0]?.character?.story).toEqual(two.players[0]?.character?.story);
        const c = one.players[0]!.character!;
        const control = structuredClone(c);
        c.age = control.age = 9;
        c.story!.focus = "study";
        control.story!.focus = "balanced";
        storyYear(one.seed, one.birth, c, one.birth.year + 9, config);
        storyYear(one.seed, one.birth, control, one.birth.year + 9, config);
        expect(c.stats.knowledge).toBeGreaterThan(control.stats.knowledge);
    });
    it("avanza sin automatizar elecciones y se detiene ante una decisión", async () => {
        vi.useFakeTimers();
        const store = new MemoryGameStore(); const game = life(); await store.save(game);
        const service = new GameService(store); await service.getRecord(game.id); await service.init();
        await vi.advanceTimersByTimeAsync(180_000);
        expect((await service.getRecord(game.id))?.age).toBe(2);
        await service.shutdown();
        vi.useRealTimers();
    });
    it("no permite saltar decisiones ni cambiar el enfoque antes de los seis años", async () => {
        const store = new MemoryGameStore(); const game = life(); await store.save(game);
        const service = new GameService(store);
        await expect(service.advanceStory(game.id, "otra-persona")).rejects.toThrow();
        await expect(service.setFocus(game.id, "story-player", "study")).rejects.toThrow();
        const firstYear = await service.advanceStory(game.id, "story-player");
        expect(firstYear.turn.age).toBe(1);
        expect(firstYear.turn.prompt).toBeNull();
        const view = await service.advanceStory(game.id, "story-player");
        expect(view.turn.age).toBe(2);
        expect(view.turn.prompt).not.toBeNull();
        expect(view.turn.prompt?.options.length).toBeGreaterThanOrEqual(3);
        await expect(service.advanceStory(game.id, "story-player")).rejects.toThrow();
        await service.shutdown();
    });
    it("registra el nacimiento de un hijo como persona de la familia", () => {
        const game = life(), c = game.players[0]!.character!;
        c.age = 28; c.children = 1;
        const lines = storyYear(game.seed, game.birth, c, game.birth.year + 28, config);
        expect(c.story?.relatives.filter(r => r.role === "child")).toHaveLength(1);
        expect(lines.some(line => line.startsWith("Nació"))).toBe(true);
    });
});
