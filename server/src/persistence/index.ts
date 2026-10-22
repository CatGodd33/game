import { config } from "../config.js";
import { JsonGameStore } from "./jsonStore.js";
import { PostgresGameStore } from "./postgresStore.js";
import type { GameStore } from "./types.js";

export async function createGameStore(): Promise<GameStore> {
  const store: GameStore =
    config.persistence === "postgres"
      ? new PostgresGameStore(config.databaseUrl ?? "")
      : new JsonGameStore();
  await store.init();
  return store;
}

export { JsonGameStore, PostgresGameStore };
export type { GameStore } from "./types.js";
