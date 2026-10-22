import { create } from "zustand";
import type { GameConfig } from "@life-duel/shared";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";

const PREFERENCES_KEY = "life-duel.preferences.v1";

interface StoredPreferences {
  reduceMotion?: boolean;
  defaultConfig?: Partial<GameConfig>;
}

interface PreferencesState {
  reduceMotion: boolean;
  defaultConfig: GameConfig;
  setReduceMotion: (value: boolean) => void;
  setDefaultConfig: (config: GameConfig) => void;
  reset: () => void;
}

function cloneDefaultConfig(): GameConfig {
  return structuredClone(DEFAULT_GAME_CONFIG);
}

function mergeConfig(config?: Partial<GameConfig>): GameConfig {
  const defaults = cloneDefaultConfig();
  if (!config) return defaults;
  return {
    ...defaults,
    ...config,
    scoringWeights: { ...defaults.scoringWeights, ...config.scoringWeights },
    content: { ...defaults.content, ...config.content },
  };
}

function readPreferences(): { reduceMotion: boolean; defaultConfig: GameConfig } {
  if (typeof window === "undefined") {
    return { reduceMotion: false, defaultConfig: cloneDefaultConfig() };
  }
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { reduceMotion: false, defaultConfig: cloneDefaultConfig() };
    const parsed = JSON.parse(raw) as StoredPreferences;
    return {
      reduceMotion: Boolean(parsed.reduceMotion),
      defaultConfig: mergeConfig(parsed.defaultConfig),
    };
  } catch {
    return { reduceMotion: false, defaultConfig: cloneDefaultConfig() };
  }
}

function writePreferences(state: Pick<PreferencesState, "reduceMotion" | "defaultConfig">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ reduceMotion: state.reduceMotion, defaultConfig: state.defaultConfig }),
    );
  } catch {
    // El almacenamiento puede estar bloqueado; la partida sigue funcionando.
  }
}

function applyMotionClass(reduceMotion: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", reduceMotion);
}

const initial = readPreferences();
applyMotionClass(initial.reduceMotion);

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  reduceMotion: initial.reduceMotion,
  defaultConfig: initial.defaultConfig,

  setReduceMotion: (value) => {
    applyMotionClass(value);
    const next = { reduceMotion: value, defaultConfig: get().defaultConfig };
    writePreferences(next);
    set(next);
  },

  setDefaultConfig: (config) => {
    const defaultConfig = mergeConfig(config);
    writePreferences({ reduceMotion: get().reduceMotion, defaultConfig });
    set({ defaultConfig });
  },

  reset: () => {
    applyMotionClass(false);
    const defaultConfig = cloneDefaultConfig();
    writePreferences({ reduceMotion: false, defaultConfig });
    set({ reduceMotion: false, defaultConfig });
  },
}));
