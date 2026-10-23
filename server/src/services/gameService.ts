import { personalLife, syncDuelRuns } from "../simulation/duel-runs.js";
import { EventEmitter } from "node:events";
import { randomInt } from "node:crypto";
import type {
    DecisionSubmittedResponse,
    GameConfig,
    LifeFocus,
    FuneralChoice,
    MobilityRequest,
    ManualPurchase,
    GameSummary,
    GameView,
    HistoryResponse,
    LobbyView,
    PlayerSlot,
    RoomJoinPreview,
} from "@life-duel/shared";
import {
    MAX_ACTIVE_GAMES_PER_PLAYER,
    ROOM_CODE_ALPHABET,
    ROOM_CODE_LENGTH,
} from "@life-duel/shared";
import { getCountry, listCountries } from "../demographics/dataset.js";
import { Errors } from "../errors.js";
import { logger } from "../logger.js";
import type { GameStore } from "../persistence/types.js";
import { createBirth } from "../simulation/birth.js";
import { executeMobility, mobilityOptions } from "../simulation/mobility.js";
import {
    autoSubmit,
    advanceMonth,
    refreshAvailableDecisions,
    canRematch,
    createDuelRoom,
    createSoloGame,
    finalizeGame,
    findPlayerByPlayerId,
    joinDuelRoom,
    markPlayerLeft,
    newGameId,
    refreshDeadline,
    resolveTurn,
    setAutomaticDecisions,
    setDecisionTimer,
    setGameSpeed,
    setPaused,
    setPlayerReady,
    startDuel,
    submitDecision,
    waitingFor,
    type SubmitDecisionInput,
} from "../simulation/engine.js";
import type { StoredGame, StoredPlayer } from "../types/records.js";
import {
    exportGameData,
    getGameView,
    getHistoryResponse,
    getLobbyView,
    getRoomPreview,
    getSummary,
} from "./view.js";

import { applyManualAction, spendingOptions } from "../simulation/spending.js";
import { resolveFuneral } from "../simulation/funerals.js";
import { createStory } from "../simulation/story.js";
import { automaticHousehold } from "../simulation/automatic-household.js";

export interface GameServiceEvents {
    "game:changed": { gameId: string };
    "room:changed": { gameId: string };
    "rematch:created": { oldGameId: string; gameId: string; code: string };
}

type Timer = ReturnType<typeof setTimeout>;

export interface PersistenceInfo {
    mode: "json" | "postgres" | "memory";
    requested: "json" | "postgres";
    degraded: boolean;
    error: string | null;
}

export class GameService {
    private readonly emitter = new EventEmitter();
    private readonly timers = new Map<string, Timer>();
    private readonly locks = new Map<string, Promise<void>>();
    private readonly presence = new Map<string, Map<PlayerSlot, Set<string>>>();
    /**
     * Estado autoritativo de la sesión. El modo individual vive solo aquí;
     * las salas de duelo se rehidratan desde el almacén al arrancar.
     */
    private readonly memory = new Map<string, StoredGame>();
    private storeHealthy = true;
    private lastStoreError: string | null = null;
    private lastStoreLogAt = 0;
    private storeCooldownUntil = 0;
    private sweepTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        private readonly store: GameStore,
        private readonly storeInfo: PersistenceInfo = {
            mode: "json",
            requested: "json",
            degraded: false,
            error: null,
        },
    ) { }

    get events(): EventEmitter {
        return this.emitter;
    }

    async init(): Promise<void> {
        await this.pruneStore();
        let games: StoredGame[] = [];
        try {
            games = this.store.loadActive ? await this.store.loadActive() : await this.store.loadAll();
        } catch (error) {
            this.markStoreFailure(error);
        }
        for (const game of games) {
            // El adaptador PostgreSQL solo devuelve salas de duelo; el almacén
            // en memoria de pruebas puede rehidratar una vida individual.
            if (game.status === "finished") continue;
            this.memory.set(game.id, game);
            if (game.independentRuns) { this.schedule(game); continue; }
            if (game.status === "playing" && (game.clock.autoDecisions || game.config.storyMode) && game.pending) {
                if (!game.pending.deadlineAt) {
                    refreshDeadline(game);
                    await this.persist(game);
                }
                this.schedule(game);
            }
        }
        this.sweepTimer = setInterval(() => void this.sweep(), 10 * 60_000);
        this.sweepTimer.unref?.();
        logger.info("Servicio de partidas inicializado.", { games: games.length, inMemory: this.memory.size });
    }

    /** Guarda una sala de duelo; el modo individual nunca toca el almacén. */
    private async persist(game: StoredGame): Promise<void> {
        this.memory.set(game.id, game);
        if (game.mode !== "duel") return;
        // Cortacircuitos: si la base acaba de fallar, no se reintenta en cada
        // turno (cada intento puede tardar segundos). Se reintenta al minuto.
        if (Date.now() < this.storeCooldownUntil) return;
        try {
            await this.store.save(game);
            this.storeHealthy = true;
            this.lastStoreError = null;
        } catch (error) {
            this.storeCooldownUntil = Date.now() + 60_000;
            this.markStoreFailure(error);
        }
    }

    private markStoreFailure(error: unknown): void {
        this.storeHealthy = false;
        this.lastStoreError = error instanceof Error ? error.message : "Error desconocido de persistencia.";
        if (Date.now() - this.lastStoreLogAt > 60_000) {
            this.lastStoreLogAt = Date.now();
            logger.warn("Persistencia no disponible; se continúa en memoria.", {
                error: this.lastStoreError,
            });
        }
    }

    private async findGameByCode(code: string): Promise<StoredGame | null> {
        const normalized = code.toUpperCase();
        for (const game of this.memory.values()) {
            if (game.code === normalized) return game;
        }
        try {
            const stored = await this.store.findByCode(normalized);
            if (stored) this.memory.set(stored.id, stored);
            return stored;
        } catch (error) {
            this.markStoreFailure(error);
            return null;
        }
    }

    getPersistenceInfo(): PersistenceInfo & { healthy: boolean; gamesInMemory: number } {
        return {
            ...this.storeInfo,
            degraded: this.storeInfo.degraded || !this.storeHealthy,
            error: this.lastStoreError ?? this.storeInfo.error,
            healthy: this.storeHealthy,
            gamesInMemory: this.memory.size,
        };
    }

    /** Limpia filas antiguas y partidas de memoria sin tocar las activas. */
    private async pruneStore(): Promise<void> {
        try {
            await this.store.prune?.({
                solo: true,
                finishedBefore: new Date(Date.now() - 24 * 3600_000),
                waitingBefore: new Date(Date.now() - 48 * 3600_000),
            });
        } catch (error) {
            this.markStoreFailure(error);
        }
    }

    private async sweep(): Promise<void> {
        const now = Date.now();
        for (const [id, game] of this.memory) {
            if (this.presence.has(id)) continue;
            const age = now - Date.parse(game.updatedAt);
            const expired =
                game.mode === "solo"
                    ? age > 6 * 3600_000
                    : game.status === "finished" && age > 2 * 3600_000;
            if (expired) this.memory.delete(id);
        }
        if (this.memory.size > 400) {
            const removable = [...this.memory.entries()]
                .filter(([id]) => !this.presence.has(id))
                .sort((first, second) => first[1].updatedAt.localeCompare(second[1].updatedAt));
            for (const [id] of removable.slice(0, this.memory.size - 400)) this.memory.delete(id);
        }
        await this.pruneStore();
    }

    getConnectedSlots(gameId: string): Set<PlayerSlot> {
        return this.connectedSlots(gameId);
    }

    private connectedSlots(gameId: string): Set<PlayerSlot> {
        return new Set(this.presence.get(gameId)?.keys() ?? []);
    }

    private async withLock<T>(gameId: string, task: () => Promise<T>): Promise<T> {
        const previous = this.locks.get(gameId) ?? Promise.resolve();
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const queued = previous.then(() => gate).catch(() => gate);
        this.locks.set(gameId, queued);
        await previous.catch(() => undefined);
        try {
            return await task();
        } finally {
            release();
            if (this.locks.get(gameId) === queued) this.locks.delete(gameId);
        }
    }

    private emitChange(game: StoredGame): void {
        this.emitter.emit("game:changed", { gameId: game.id });
        if (game.mode === "duel" && (game.status === "waiting" || game.status === "ready")) {
            this.emitter.emit("room:changed", { gameId: game.id });
        }
        if (game.mode === "duel" && game.status === "finished") {
            this.emitter.emit("room:changed", { gameId: game.id });
        }
    }

    private schedule(game: StoredGame): void {
        const existing = this.timers.get(game.id);
        if (existing) {
            clearTimeout(existing);
            this.timers.delete(game.id);
        }
        if (game.independentRuns) {
            const deadlines = Object.values(game.independentRuns).filter(run => run?.status === "playing" && run.pending && (run.clock.autoDecisions || waitingFor(run).length === 0)).map(run => Date.parse(run!.pending!.deadlineAt ?? new Date(Date.now() + 500).toISOString()));
            if (!deadlines.length || game.status === "finished") return;
            const timer = setTimeout(() => { void this.runAutoTurn(game.id); }, Math.max(0, Math.min(...deadlines) - Date.now()));
            timer.unref?.(); this.timers.set(game.id, timer); return;
        }
        if (
            game.status !== "playing" ||
            !game.pending ||
            (!game.clock.autoDecisions && !(game.mode === "solo" && game.config.storyMode && waitingFor(game).length === 0))
        ) {
            return;
        }
        const deadline = game.pending.deadlineAt
            ? new Date(game.pending.deadlineAt).getTime()
            : Date.now() + 500;
        const delay = Math.max(0, deadline - Date.now());
        const timer = setTimeout(() => {
            void this.runAutoTurn(game.id);
        }, delay);
        timer.unref?.();
        this.timers.set(game.id, timer);
    }

    private async runAutoTurn(gameId: string): Promise<void> {
        this.timers.delete(gameId);
        await this.withLock(gameId, async () => {
            const game = await this.getRecord(gameId);
            if (game?.independentRuns) {
                for (const run of Object.values(game.independentRuns)) {
                    if (!run || run.status !== "playing" || !run.pending) continue;
                    if (!run.clock.autoDecisions && waitingFor(run).length) continue;
                    if (run.pending.deadlineAt && Date.parse(run.pending.deadlineAt) > Date.now() + 2) continue;
                    if (run.clock.autoDecisions) { if (!waitingFor(run).length) automaticHousehold(run); for (const slot of waitingFor(run)) autoSubmit(run, slot); }
                    if (!waitingFor(run).length) advanceMonth(run);
                }
                syncDuelRuns(game); await this.persist(game); this.emitChange(game); this.schedule(game); return;
            }
            if (!game || game.status !== "playing" || !game.pending) return;
            if (!game.clock.autoDecisions && !(game.mode === "solo" && game.config.storyMode && waitingFor(game).length === 0)) return;
            if (game.config.monthlyMode && game.clock.autoDecisions && waitingFor(game).length === 0) automaticHousehold(game);
            const initialTurn = game.pending.turn;
            let guard = 0;
            while (waitingFor(game).length > 0 && guard < 4) {
                const slot = waitingFor(game)[0];
                if (!slot) break;
                const submitted = autoSubmit(game, slot);
                guard += 1;
                if (!submitted) break;
                if (game.pending && game.pending.turn !== initialTurn) break;
            }
            if (waitingFor(game).length === 0 && game.pending?.turn === initialTurn) {
                if (game.config.monthlyMode) advanceMonth(game); else resolveTurn(game);
            }
            await this.persist(game);
            this.emitChange(game);
            this.schedule(game);
        }).catch((error: unknown) => {
            logger.error("Error en el reloj automático", {
                gameId,
                error: error instanceof Error ? error.message : "desconocido",
            });
        });
    }

    private validateConfig(config: GameConfig): void {
        if (config.monthlyMode && !config.storyMode) throw Errors.validation("El reloj mensual requiere el modo historia.");
        const countries = new Set(listCountries().map((country) => country.code));
        if (config.countryMode === "fixed") {
            if (!config.fixedCountry || !countries.has(config.fixedCountry)) {
                throw Errors.validation("El país seleccionado no está disponible en el conjunto demográfico.");
            }
        }
        if (config.fixedYear !== undefined && (config.fixedYear < 1950 || config.fixedYear > 2060)) {
            throw Errors.validation("El año fijo debe estar entre 1950 y 2060.");
        }
    }

    /**
     * Toda vida nueva empieza hoy. La época, el año y el límite de edad ya no
     * son decisiones del jugador: el desenlace depende de la mortalidad del
     * personaje. Se conservan los campos para abrir partidas antiguas.
     */
    private normalizeNewConfig(config: GameConfig): GameConfig {
        return {
            ...structuredClone(config),
            era: "present",
            fixedYear: new Date().getFullYear(),
            maxAge: 105,
        };
    }

    private async generateRoomCode(): Promise<string> {
        for (let attempt = 0; attempt < 20; attempt += 1) {
            let code = "";
            for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
                code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length)];
            }
            const existing = await this.findGameByCode(code);
            if (!existing) return code;
        }
        throw Errors.internal("No se pudo generar un código de sala único.");
    }

    async createSolo(playerId: string, alias: string, config: GameConfig): Promise<GameView> {
        config = this.normalizeNewConfig(config);
        this.validateConfig(config);
        const game = createSoloGame(newGameId(), playerId, alias, config);
        if (config.storyMode) setPaused(game, true);
        await this.persist(game);
        this.emitChange(game);
        this.schedule(game);
        return getGameView(game, playerId, this.connectedSlots(game.id));
    }

    async createRoom(
        playerId: string,
        alias: string,
        config: GameConfig,
    ): Promise<LobbyView> {
        config = this.normalizeNewConfig(config);
        this.validateConfig(config);
        const code = await this.generateRoomCode();
        const game = createDuelRoom(newGameId(), code, playerId, alias, config);
        await this.persist(game);
        this.emitChange(game);
        return getLobbyView(game, playerId, this.connectedSlots(game.id));
    }

    async previewRoom(code: string): Promise<RoomJoinPreview> {
        const game = await this.findGameByCode(code.toUpperCase());
        if (!game || game.mode !== "duel") throw Errors.notFound("No existe ninguna sala con ese código.");
        return getRoomPreview(game);
    }

    async joinRoom(code: string, playerId: string, alias: string): Promise<LobbyView> {
        const normalized = code.toUpperCase();
        return this.withLock(`code:${normalized}`, async () => {
            const game = await this.findGameByCode(normalized);
            if (!game) throw Errors.notFound("No existe ninguna sala con ese código.");
            return this.withLock(game.id, async () => {
                joinDuelRoom(game, playerId, alias);
                await this.persist(game);
                this.emitChange(game);
                return getLobbyView(game, playerId, this.connectedSlots(game.id));
            });
        });
    }

    async getLobbyByCode(code: string, playerId: string): Promise<LobbyView> {
        const game = await this.findGameByCode(code.toUpperCase());
        if (!game) throw Errors.notFound("Sala no encontrada.");
        return getLobbyView(game, playerId, this.connectedSlots(game.id));
    }

    async getLobby(gameId: string, playerId: string): Promise<LobbyView> {
        const game = await this.loadGame(gameId);
        return getLobbyView(game, playerId, this.connectedSlots(game.id));
    }

    async updateRoomConfig(
        code: string,
        playerId: string,
        config: GameConfig,
    ): Promise<LobbyView> {
        config = this.normalizeNewConfig(config);
        this.validateConfig(config);
        const existing = await this.findGameByCode(code.toUpperCase());
        if (!existing) throw Errors.notFound("Sala no encontrada.");
        return this.withLock(existing.id, async () => {
            const game = await this.loadGame(existing.id);
            const player = this.requireMember(game, playerId);
            if (player.slot !== game.hostSlot) throw Errors.forbidden("Solo el anfitrión puede cambiar la configuración.");
            if (game.status !== "waiting" && game.status !== "ready") {
                throw Errors.conflict("La configuración ya está bloqueada.");
            }
            this.validateConfig(config);
            game.config = structuredClone(config);
            game.birth = createBirth(game.seed, config);
            game.currentYear = game.birth.year;
            game.economy = {
                costOfLivingIndex: 1,
                unemploymentRate: getCountry(game.birth.countryCode).unemploymentRate,
                phase: "estable",
                inflationRate: 2,
            };
            game.clock.speed = config.speed;
            game.clock.decisionTimerSeconds = config.decisionTimerSeconds;
            game.clock.autoDecisions = config.autoDecisions;
            game.autoVotes = {};
            for (const roomPlayer of game.players) {
                roomPlayer.ready = false;
                if (config.autoDecisions && !roomPlayer.left) game.autoVotes[roomPlayer.slot] = true;
            }
            game.updatedAt = new Date().toISOString();
            await this.persist(game);
            this.emitChange(game);
            return getLobbyView(game, playerId, this.connectedSlots(game.id));
        });
    }

    async setReady(code: string, playerId: string, ready: boolean): Promise<LobbyView> {
        const existing = await this.findGameByCode(code.toUpperCase());
        if (!existing) throw Errors.notFound("Sala no encontrada.");
        return this.withLock(existing.id, async () => {
            const game = await this.loadGame(existing.id);
            const player = this.requireMember(game, playerId);
            setPlayerReady(game, player.slot, ready);
            await this.persist(game);
            this.emitChange(game);
            return getLobbyView(game, playerId, this.connectedSlots(game.id));
        });
    }

    async startRoom(code: string, playerId: string): Promise<GameView> {
        const existing = await this.findGameByCode(code.toUpperCase());
        if (!existing) throw Errors.notFound("Sala no encontrada.");
        return this.withLock(existing.id, async () => {
            const game = await this.loadGame(existing.id);
            const player = this.requireMember(game, playerId);
            if (player.slot !== game.hostSlot) throw Errors.forbidden("Solo el anfitrión puede comenzar el duelo.");
            startDuel(game);
            await this.persist(game);
            this.emitChange(game);
            this.schedule(game);
            return getGameView(game, playerId, this.connectedSlots(game.id));
        });
    }

    async getGame(gameId: string, playerId: string): Promise<GameView> {
        const game = await this.loadGame(gameId);
        this.requireMember(game, playerId);
        return getGameView(game, playerId, this.connectedSlots(game.id));
    }

    async getGameRecordForMember(gameId: string, playerId: string): Promise<StoredGame> {
        const game = await this.loadGame(gameId);
        this.requireMember(game, playerId);
        return game;
    }

    async submit(
        gameId: string,
        playerId: string,
        input: SubmitDecisionInput,
    ): Promise<DecisionSubmittedResponse> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            const player = this.requireMember(game, playerId);
            const result = submitDecision(game, player.slot, input);
            syncDuelRuns(root);
            await this.persist(root);
            this.emitChange(root);
            this.schedule(root);
            return {
                accepted: true,
                duplicate: result.duplicate,
                waitingFor: waitingFor(game),
                turnResolved: result.resolved,
                game: getGameView(root, playerId, this.connectedSlots(root.id)),
            };
        });
    }

    async advanceStory(gameId: string, playerId: string): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            this.requireMember(game, playerId);
            if (!game.config.storyMode) throw Errors.conflict("Esta vida no usa el modo historia.");
            if (game.mode === "duel" && Object.keys(game.pending?.prompts ?? {}).length > 0) {
                throw Errors.conflict("El año tiene una decisión pendiente. Espera a que se resuelva.");
            }
            if (game.status !== "playing") throw Errors.conflict("Reanuda la vida antes de avanzar.");
            if (waitingFor(game).length) throw Errors.conflict("Hay una decisión importante pendiente.");
            if (game.config.monthlyMode) {
                for (let i = 0; i < 1272 && game.status === "playing" && waitingFor(game).length === 0; i++) advanceMonth(game);
            } else resolveTurn(game);
            syncDuelRuns(root);
            await this.persist(root);
            this.emitChange(root); this.schedule(root);
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async enableMonthly(gameId: string, playerId: string): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId); const player = this.requireMember(game, playerId);
            if (game.mode !== "solo" || !player.character || game.status === "finished") throw Errors.conflict("Esta vida no puede cambiar de reloj.");
            if (!game.config.monthlyMode) {
                game.config.monthlyMode = true; game.config.storyMode = true;
                player.character.story ??= createStory(game.seed, game.birth, game.config);
                player.character.liveEconomy = { month: 0, statements: [], unpaid: player.character.unpaidBills ?? 0, interest: 0 };
                refreshDeadline(game);
                game.updatedAt = new Date(Math.max(Date.now(), new Date(game.updatedAt).getTime() + 1)).toISOString();
                syncDuelRuns(root);
                await this.persist(root); this.emitChange(root); this.schedule(root);
            }
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async spending(gameId: string, playerId: string) {
        const root = await this.loadGame(gameId);
        const game = personalLife(root, playerId); const player = this.requireMember(game, playerId);
        if (!player.character) throw Errors.conflict("La vida no ha comenzado.");
        return { options: spendingOptions(game, player.character) };
    }
    async purchase(gameId: string, playerId: string, input: ManualPurchase) {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId); const player = this.requireMember(game, playerId);
            if (!player.character) throw Errors.conflict("La vida no ha comenzado.");
            if (game.status === "finished") throw Errors.conflict("La vida ya ha terminado; sus resultados están cerrados.");
            if (!player.character.alive) throw Errors.conflict("Este personaje ya ha muerto; su estado no puede cambiar.");
            if (game.mode !== "solo" && input.action !== "repay-debt") throw Errors.conflict("Durante un duelo solo puedes gestionar tus deudas desde esta vista.");
            const message = applyManualAction(game, player.character, input);
            refreshAvailableDecisions(game);
            game.updatedAt = new Date(Math.max(Date.now(), new Date(game.updatedAt).getTime() + 1)).toISOString();
            syncDuelRuns(root);
            await this.persist(root); this.emitChange(root);
            return { game: getGameView(root, playerId, this.connectedSlots(root.id)), message };
        });
    }

    async mobility(gameId: string, playerId: string) {
        const root = await this.loadGame(gameId);
        const game = personalLife(root, playerId);
        const player = this.requireMember(game, playerId);
        if (!player.character) throw Errors.conflict("La vida no ha comenzado.");
        if (!player.character.alive) throw Errors.conflict("Este personaje ya ha muerto.");
        return mobilityOptions(game, player.character);
    }

    async move(gameId: string, playerId: string, input: MobilityRequest) {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            const player = this.requireMember(game, playerId);
            if (!player.character) throw Errors.conflict("La vida no ha comenzado.");
            if (game.status === "finished") throw Errors.conflict("La vida ya ha terminado.");
            if (!player.character.alive) throw Errors.conflict("Este personaje ya ha muerto.");
            try {
                const result = executeMobility(game, player.character, input);
                refreshAvailableDecisions(game);
                game.updatedAt = new Date(Math.max(Date.now(), new Date(game.updatedAt).getTime() + 1)).toISOString();
                syncDuelRuns(root);
                await this.persist(root);
                this.emitChange(root);
                this.schedule(root);
                return {
                    game: getGameView(root, playerId, this.connectedSlots(root.id)),
                    message: result.text,
                    success: result.success,
                };
            } catch (error) {
                throw Errors.validation(error instanceof Error ? error.message : "No se pudo completar el traslado.");
            }
        });
    }


    async funeral(
        gameId: string,
        playerId: string,
        input: { funeralId: string; choice: FuneralChoice; idempotencyKey: string },
    ) {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            const player = this.requireMember(game, playerId);
            if (!player.character) throw Errors.conflict("La vida no ha comenzado.");
            if (game.status === "finished") throw Errors.conflict("La vida ya ha terminado; sus resultados están cerrados.");
            if (!player.character.alive) throw Errors.conflict("Este personaje ya ha muerto; su estado no puede cambiar.");
            const result = resolveFuneral(player.character, input, game.currentYear);
            if (!result.duplicate) {
                game.updatedAt = new Date(Math.max(Date.now(), new Date(game.updatedAt).getTime() + 1)).toISOString();
                syncDuelRuns(root);
                await this.persist(root);
                this.emitChange(root);
            }
            return {
                game: getGameView(root, playerId, this.connectedSlots(root.id)),
                message: result.message,
                duplicate: result.duplicate,
            };
        });
    }

    async setFocus(gameId: string, playerId: string, focus: LifeFocus): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            const player = this.requireMember(game, playerId);
            if (game.mode !== "solo" || !game.config.storyMode || !player.character?.story || player.character.age < 6 || game.status === "finished") throw Errors.conflict("El enfoque no está disponible en esta vida.");
            player.character.story.focus = focus;
            game.updatedAt = new Date(Math.max(Date.now(), new Date(game.updatedAt).getTime() + 1)).toISOString();
            syncDuelRuns(root);
            await this.persist(root); this.emitChange(root);
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async setPaused(gameId: string, playerId: string, paused: boolean): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            this.requireMember(game, playerId);
            setPaused(game, paused);
            syncDuelRuns(root);
            await this.persist(root);
            this.emitChange(root);
            this.schedule(root);
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async setSpeed(
        gameId: string,
        playerId: string,
        speed: GameConfig["speed"],
    ): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            this.requireMember(game, playerId);
            if (game.status === "finished") throw Errors.conflict("La partida ya ha terminado.");
            setGameSpeed(game, speed);
            syncDuelRuns(root);
            await this.persist(root);
            this.emitChange(root);
            this.schedule(root);
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async setAuto(
        gameId: string,
        playerId: string,
        enabled: boolean,
        decisionTimerSeconds?: number,
    ): Promise<GameView> {
        return this.withLock(gameId, async () => {
            const root = await this.loadGame(gameId);
            const game = personalLife(root, playerId);
            const player = this.requireMember(game, playerId);
            if (game.status === "finished") throw Errors.conflict("La partida ya ha terminado.");
            if (game.mode === "duel" && player.slot !== game.hostSlot) {
                throw Errors.forbidden("Solo el anfitrión puede activar o desactivar las decisiones automáticas.");
            }
            setAutomaticDecisions(game, enabled);
            if (decisionTimerSeconds !== undefined) {
                if (player.slot !== game.hostSlot) {
                    throw Errors.forbidden("Solo el anfitrión puede cambiar el temporizador.");
                }
                setDecisionTimer(game, decisionTimerSeconds);
            }
            syncDuelRuns(root);
            await this.persist(root);
            this.emitChange(root);
            this.schedule(root);
            return getGameView(root, playerId, this.connectedSlots(root.id));
        });
    }

    async leave(gameId: string, playerId: string): Promise<void> {
        await this.withLock(gameId, async () => {
            const game = await this.loadGame(gameId);
            const player = this.requireMember(game, playerId);
            if (game.mode === "duel" && game.status !== "finished") {
                if (game.independentRuns) {
                    const run = personalLife(game, playerId);
                    if (run.status !== "finished") setPaused(run, true);
                    syncDuelRuns(game);
                } else markPlayerLeft(game, player.slot);
                await this.persist(game);
                this.emitChange(game);
                this.schedule(game);
            }
        });
    }

    async rematch(
        gameId: string,
        playerId: string,
        config: GameConfig,
    ): Promise<LobbyView> {
        config = this.normalizeNewConfig(config);
        this.validateConfig(config);
        const source = await this.loadGame(gameId);
        this.requireMember(source, playerId);
        if (!canRematch(source)) throw Errors.conflict("La revancha solo está disponible al terminar un duelo.");
        const host = source.players.find((player) => player.slot === source.hostSlot);
        const guest = source.players.find((player) => player.slot !== source.hostSlot);
        if (!host || !guest) throw Errors.conflict("La sala original no tiene dos jugadores.");
        const code = await this.generateRoomCode();
        const game = createDuelRoom(
            newGameId(),
            code,
            host.playerId,
            host.alias,
            config,
        );
        joinDuelRoom(game, guest.playerId, guest.alias);
        game.rematchOf = source.id;
        await this.persist(game);
        this.emitChange(game);
        this.emitter.emit("rematch:created", { oldGameId: source.id, gameId: game.id, code });
        return getLobbyView(game, playerId, this.connectedSlots(game.id));
    }

    /**
     * Solo se listan salas de duelo de esta sesión. Las vidas individuales no
     * se guardan, así que no aparecen aquí por diseño.
     */
    async listMine(playerId: string): Promise<GameSummary[]> {
        const games = [...this.memory.values()].filter((game) => game.mode === "duel");
        return games
            .map((game) => {
                const player = findPlayerByPlayerId(game, playerId);
                return player ? getSummary(game, player) : null;
            })
            .filter((summary): summary is GameSummary => Boolean(summary))
            .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
            .slice(0, MAX_ACTIVE_GAMES_PER_PLAYER * 2);
    }

    async getRoomRecord(code: string): Promise<StoredGame | null> {
        return this.findGameByCode(code.toUpperCase());
    }

    async getRecord(gameId: string): Promise<StoredGame | null> {
        const cached = this.memory.get(gameId);
        if (cached) return cached;
        try {
            const stored = await this.store.get(gameId);
            if (stored) this.memory.set(stored.id, stored);
            return stored;
        } catch (error) {
            this.markStoreFailure(error);
            return null;
        }
    }


    async history(gameId: string, playerId: string): Promise<HistoryResponse> {
        const game = await this.loadGame(gameId);
        return getHistoryResponse(game, playerId);
    }

    async exportGame(gameId: string, playerId: string): Promise<{ fileName: string; data: unknown }> {
        const game = await this.loadGame(gameId);
        const player = this.requireMember(game, playerId);
        return {
            fileName: `life-duel-${game.id.slice(0, 8)}-jugador-${player.slot}.json`,
            data: exportGameData(game, playerId),
        };
    }

    async saveNarrative(
        gameId: string,
        slot: PlayerSlot,
        text: string,
        source: "deepseek" | "local",
    ): Promise<void> {
        await this.withLock(gameId, async () => {
            const game = await this.loadGame(gameId);
            const player = game.players.find((candidate) => candidate.slot === slot);
            if (!player) return;
            player.aiNarrative = text;
            player.aiNarrativeSource = source;
            await this.persist(game);
            this.emitChange(game);
        });
    }


    addPresence(gameId: string, slot: PlayerSlot, socketId: string): void {
        const slots = this.presence.get(gameId) ?? new Map<PlayerSlot, Set<string>>();
        const sockets = slots.get(slot) ?? new Set<string>();
        sockets.add(socketId);
        slots.set(slot, sockets);
        this.presence.set(gameId, slots);
        this.emitter.emit("game:changed", { gameId });
        this.emitter.emit("room:changed", { gameId });
    }

    removePresence(gameId: string, slot: PlayerSlot, socketId: string): void {
        const slots = this.presence.get(gameId);
        if (!slots) return;
        const sockets = slots.get(slot);
        if (sockets) {
            sockets.delete(socketId);
            if (sockets.size === 0) slots.delete(slot);
        }
        if (slots.size === 0) this.presence.delete(gameId);
        this.emitter.emit("game:changed", { gameId });
        this.emitter.emit("room:changed", { gameId });
    }

    async touchSeen(gameId: string, playerId: string): Promise<void> {
        const game = await this.getRecord(gameId);
        const player = game ? findPlayerByPlayerId(game, playerId) : undefined;
        if (!game || !player) return;
        // La presencia en vivo ya se sigue por socket; este campo solo sirve
        // para saber si alguien estuvo aquí. Se escribe como mucho cada 5 min
        // para no generar un guardado por cada recarga o reconexión.
        const previous = Date.parse(player.lastSeenAt);
        if (Number.isFinite(previous) && Date.now() - previous < 5 * 60_000) return;
        player.lastSeenAt = new Date().toISOString();
        await this.persist(game);
    }

    private async loadGame(gameId: string): Promise<StoredGame> {
        let game = this.memory.get(gameId);
        if (!game) {
            try {
                game = (await this.store.get(gameId)) ?? undefined;
            } catch (error) {
                this.markStoreFailure(error);
            }
            if (!game) throw Errors.notFound("Partida no encontrada.");
            this.memory.set(game.id, game);
        }
        // Rebuild unanswered saved prompts with the current authored choices.
        // Already answered decisions and their historical results stay intact.
        refreshAvailableDecisions(game);
        return game;
    }

    private requireMember(game: StoredGame, playerId: string): StoredPlayer {
        const player = findPlayerByPlayerId(game, playerId);
        if (!player) throw Errors.forbidden("No participas en esta partida.");
        return player;
    }

    async shutdown(): Promise<void> {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
        this.sweepTimer = null;
        for (const timer of this.timers.values()) clearTimeout(timer);
        this.timers.clear();
        await this.store.flush?.();
        await this.store.close?.();
    }
}
