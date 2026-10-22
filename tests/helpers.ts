import type { CharacterState, GameConfig, GameView, PlayerSlot } from "@life-duel/shared";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";
import { randomUUID } from "node:crypto";
import {
  createDuelRoom,
  createSoloGame,
  joinDuelRoom,
  setPlayerReady,
  startDuel,
  submitDecision,
} from "../server/src/simulation/engine.js";
import type { GameStore } from "../server/src/persistence/types.js";
import type { StoredGame } from "../server/src/types/records.js";

export const TEST_CONFIG: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  era: "present",
  countryMode: "fixed",
  fixedCountry: "ESP",
  maxAge: 60,
  autoDecisions: false,
  decisionTimerSeconds: 0,
  speed: 4,
};

export class MemoryGameStore implements GameStore {
  readonly games = new Map<string, StoredGame>();

  async init(): Promise<void> {}

  async get(id: string): Promise<StoredGame | null> {
    const game = this.games.get(id);
    return game ? structuredClone(game) : null;
  }

  async findByCode(code: string): Promise<StoredGame | null> {
    for (const game of this.games.values()) {
      if (game.code === code.toUpperCase()) return structuredClone(game);
    }
    return null;
  }

  async loadAll(): Promise<StoredGame[]> {
    return [...this.games.values()].map((game) => structuredClone(game));
  }

  async save(game: StoredGame): Promise<void> {
    this.games.set(game.id, structuredClone(game));
  }

  async delete(id: string): Promise<void> {
    this.games.delete(id);
  }
}

export function makeSolo(seed = "seed-solo-test-0001", config = TEST_CONFIG): StoredGame {
  return createSoloGame(`solo-${randomUUID()}`, `player-${randomUUID()}`, "Sol", config, seed);
}

export function makeDuel(
  seed = "seed-duel-test-0001",
  config = TEST_CONFIG,
): { game: StoredGame; hostId: string; guestId: string; hostSlot: PlayerSlot; guestSlot: PlayerSlot } {
  const game = createDuelRoom(`duel-${randomUUID()}`, "ABC234", "host-player", "Anfitrión", config, seed);
  joinDuelRoom(game, "guest-player", "Invitado");
  setPlayerReady(game, 1, true);
  setPlayerReady(game, 2, true);
  startDuel(game);
  return { game, hostId: "host-player", guestId: "guest-player", hostSlot: 1, guestSlot: 2 };
}

export function pickOption(game: StoredGame, slot: PlayerSlot, mode: "first" | "last" | number = "first") {
  const prompt = game.pending?.prompts[slot];
  if (!prompt) return null;
  const option =
    typeof mode === "number"
      ? prompt.options[mode]
      : mode === "first"
        ? prompt.options[0]
        : prompt.options[prompt.options.length - 1];
  return option ? { prompt, option } : null;
}

export function submitPick(
  game: StoredGame,
  slot: PlayerSlot,
  mode: "first" | "last" | number = "first",
  key?: string,
) {
  const picked = pickOption(game, slot, mode);
  if (!picked) return null;
  return submitDecision(game, slot, {
    turn: game.pending!.turn,
    decisionId: picked.prompt.id,
    optionId: picked.option.id,
    idempotencyKey: key ?? `test-${game.pending!.turn}-${slot}-${picked.option.id}-${randomUUID()}`,
  });
}

export function characterFor(game: StoredGame, slot: PlayerSlot): CharacterState {
  const character = game.players.find((player) => player.slot === slot)?.character;
  if (!character) throw new Error(`No existe el personaje del jugador ${slot}.`);
  return character;
}

export function allInitialStats(game: StoredGame): Record<PlayerSlot, CharacterState["stats"]> {
  return {
    1: structuredClone(characterFor(game, 1).stats),
    2: structuredClone(characterFor(game, 2).stats),
  };
}

export function assertView(game: GameView): GameView {
  if (!game.me || !game.turn) throw new Error("Vista de partida incompleta.");
  return game;
}
