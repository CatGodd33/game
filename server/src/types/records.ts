import type {
    BirthProfile,
    DecisionChoice,
    DecisionPrompt,
    EconomyState,
    FinalResult,
    GameClock,
    GameConfig,
    GameMode,
    PlayerSlot,
    RoomStatus,
    ScoreBreakdown,
    SharedEventRecord,
    TurnPlayerRecord,
    TurnRecord,
    CharacterState,
} from "@life-duel/shared";
import type { LifeSnapshot } from "../simulation/scoring.js";

export interface StoredPlayer {
    playerId: string;
    character: CharacterState | null;
    slot: PlayerSlot;
    alias: string;
    ready: boolean;
    left: boolean;
    joinedAt: string;
    lastSeenAt: string;
    decisions: DecisionChoice[];
    snapshots: LifeSnapshot[];
    scoreHistory: { age: number; score: number }[];
    score: ScoreBreakdown | null;
    lastTurn: TurnPlayerRecord | null;
    aiNarrative: string | null;
    aiNarrativeSource: "deepseek" | "local" | null;
}

export interface PendingTurn {
    secondary?: Partial<Record<PlayerSlot,{key:string;relativeId?:string;primaryPrompt?:DecisionPrompt;primaryChoice?:DecisionChoice;primaryApplied?:{chance:number|null;roll:number|null;success:boolean|null}}>>;
    appliedChoices?: Partial<Record<PlayerSlot, { chance: number | null; roll: number | null; success: boolean | null }>>;
    turn: number;
    age: number;
    year: number;
    events: SharedEventRecord[];
    prompts: Partial<Record<PlayerSlot, DecisionPrompt>>;
    submitted: Partial<Record<PlayerSlot, DecisionChoice>>;
    notes: Partial<Record<PlayerSlot, string[]>>;
    deadlineAt: string | null;
    startedAt: string;
}

export interface StoredGame {
    id: string;
    mode: GameMode;
    code: string | null;
    status: RoomStatus;
    hostSlot: PlayerSlot;
    config: GameConfig;
    seed: string;
    seedFingerprint: string;
    birth: BirthProfile;
    economy: EconomyState;
    currentYear: number;
    age: number;
    turnNumber: number;
    createdAt: string;
    updatedAt: string;
    finishedAt: string | null;
    clock: GameClock;
    autoVotes: Partial<Record<PlayerSlot, boolean>>;
    players: StoredPlayer[];
    pending: PendingTurn | null;
    history: TurnRecord[];
    scoreHistory: { age: number; players: Partial<Record<PlayerSlot, number>> }[];
    final: FinalResult | null;
    idempotency: Record<
        string,
        { slot: PlayerSlot; turn: number; decisionId: string; optionId: string }
    >;
    world: {
        usedEventIds: string[];
        lastEventAges: Record<string, number>;
        turnsSinceEvent: number;
    };
    inviteExpiresAt: string;
    rematchOf: string | null;
    meta: {
        engineVersion: string;
        datasetVersion: string;
        provisionalModels: string[];
    };
}

export interface GameStoreRecord {
    game: StoredGame;
    version: number;
}
