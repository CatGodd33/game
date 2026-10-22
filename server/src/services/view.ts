import { personalLife } from "../simulation/duel-runs.js";
import type {
    CharacterState,
    GameSummary,
    GameView,
    HistoryResponse,
    LobbyView,
    PlayerSlot,
    PlayerView,
    RoomJoinPreview,
    TurnRecord,
} from "@life-duel/shared";
import { DECISION_CATEGORY_META, EVENT_CATEGORY_META } from "@life-duel/shared";
import { getDecision } from "../simulation/decisions.js";
import {
    canRematch,
    canStartDuel,
    findPlayerByPlayerId,
    waitingFor,
} from "../simulation/engine.js";
import type { StoredGame, StoredPlayer } from "../types/records.js";
import { getCountry } from "../demographics/dataset.js";
import { Errors } from "../errors.js";
import { buildLifeMoments } from "../narrative/story-stream.js";
import { computeWealthPressure } from "../simulation/wealth-pressure.js";

type ConnectedSlots = ReadonlySet<PlayerSlot>;

function cloneCharacter(character: CharacterState, trimLedger = true): CharacterState {
    const clone = structuredClone(character);
    if (trimLedger) {
        clone.finance.ledger = clone.finance.ledger.slice(-16);
    }
    return clone;
}

function pendingEvents(game: StoredGame) {
    if (game.pending) return game.pending.events;
    const last = game.history.at(-1);
    return last?.sharedEvents ?? [];
}

function hasSubmitted(game: StoredGame, slot: PlayerSlot): boolean {
    if (!game.pending) return true;
    if (game.pending.submitted[slot]) return true;
    return !game.pending.prompts[slot];
}

function playerView(
    game: StoredGame,
    player: StoredPlayer,
    viewerSlot: PlayerSlot,
    connected: ConnectedSlots,
): PlayerView {
    if (!player.character) {
        throw Errors.conflict("La partida aún no ha comenzado.");
    }
    const isMe = player.slot === viewerSlot;
    return {
        slot: player.slot,
        alias: player.alias,
        connected: connected.has(player.slot),
        ready: player.ready,
        left: player.left,
        isMe,
        character: cloneCharacter(player.character),
        score: player.score ?? {
            total: 0,
            categories: {
                health: 0,
                happiness: 0,
                knowledge: 0,
                relationships: 0,
                economic: 0,
                education: 0,
                longevity: 0,
            },
            weighted: 0,
            wellbeingGate: 1,
            weights: game.config.scoringWeights,
            details: [],
            notes: [],
        },
        hasSubmitted: hasSubmitted(game, player.slot),
        ownChoice: isMe ? game.pending?.submitted[player.slot] ?? null : null,
        lastTurn: player.lastTurn,
        aiNarrative: isMe ? player.aiNarrative : null,
        wealthPressure: computeWealthPressure(player.character),
    };
}

export function getGameView(
    game: StoredGame,
    viewerPlayerId: string,
    connected: ConnectedSlots = new Set(),
): GameView {
    if(game.independentRuns){
        const run=personalLife(game,viewerPlayerId);
        if(run===game)throw Errors.forbidden("No participas en esta partida.");
        const view=getGameView(run,viewerPlayerId,connected);
        const rival=game.players.find(p=>p.playerId!==viewerPlayerId)!;
        const rivalRun=game.independentRuns[rival.slot];
        return {...view,id:game.id,mode:"duel",roomCode:game.code,updatedAt:game.updatedAt,
          status:game.final?"finished":run.status==="finished"?"paused":view.status,
          opponent:game.final?playerView(game,rival,view.me.slot,connected):null,
          scoreHistory:game.final?structuredClone(game.scoreHistory):view.scoreHistory,
          final:game.final?structuredClone(game.final):null,canRematch:!!game.final,canControlAuto:true,
          duel:{independent:true,myFinished:run.status==="finished",opponentFinished:rivalRun?.status==="finished",opponentAlias:rival.alias,opponentAge:rivalRun?.age??0,resultReady:!!game.final}};
    }
    const me = findPlayerByPlayerId(game, viewerPlayerId);
    if (!me) throw Errors.forbidden("No participas en esta partida.");
    if (!me.character) throw Errors.conflict("La partida aún no ha comenzado.");
    const opponent = game.players.find((player) => player.slot !== me.slot) ?? null;
    if (!opponent?.character && game.mode === "solo") {
        // En individual no hay rival y es un estado válido.
    }
    const status: GameView["status"] =
        game.status === "finished" ? "finished" : game.status === "paused" ? "paused" : "playing";
    return {
        id: game.id,
        mode: game.mode,
        status,
        roomCode: game.code,
        config: structuredClone(game.config),
        clock: {
            speed: game.clock.speed,
            autoDecisions: game.clock.autoDecisions,
            decisionTimerSeconds: game.clock.decisionTimerSeconds,
            paused: game.clock.paused,
            deadlineAt: game.pending?.deadlineAt ?? null,
        },
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        turn: {
            number: game.pending?.turn ?? game.turnNumber,
            month: me.character.liveEconomy?.month ?? 0,
            age: game.pending?.age ?? game.age,
            year: game.pending?.year ?? game.currentYear,
            prompt: me.character.alive && !(game.config.monthlyMode && game.pending?.submitted[me.slot]) ? game.pending?.prompts[me.slot] ?? null : null,
            sharedEvents: pendingEvents(game),
            waitingFor: waitingFor(game),
            deadlineAt: game.pending?.deadlineAt ?? null,
        },
        world: {
            currentYear: game.currentYear,
            age: game.age,
            economy: structuredClone(game.economy),
            birth: structuredClone(game.birth),
            seedFingerprint: game.seedFingerprint,
            currentEvents: pendingEvents(game),
        },
        me: playerView(game, me, me.slot, connected),
        opponent:
            opponent && opponent.character
                ? playerView(game, opponent, me.slot, connected)
                : null,
        lastResolution: game.history.at(-1) ?? null,
        scoreHistory: structuredClone(game.scoreHistory),
        final: game.final ? structuredClone(game.final) : null,
        canRematch: canRematch(game),
        canControlAuto: game.mode === "solo" || me.slot === game.hostSlot,
    };
}

export function getLobbyView(
    game: StoredGame,
    viewerPlayerId: string,
    connected: ConnectedSlots = new Set(),
): LobbyView {
    const me = findPlayerByPlayerId(game, viewerPlayerId);
    if (!me) throw Errors.forbidden("No participas en esta sala.");
    return {
        id: game.id,
        code: game.code ?? "",
        status: game.status,
        hostSlot: game.hostSlot,
        players: game.players
            .filter((player) => !player.left)
            .map((player) => ({
                slot: player.slot,
                alias: player.alias,
                connected: connected.has(player.slot),
                ready: player.ready,
                left: player.left,
            })),
        config: structuredClone(game.config),
        meSlot: me.slot,
        birthSummary: {
            countryName: game.birth.countryName,
            year: game.birth.year,
            sex: game.birth.sex,
            givenName: game.birth.givenName,
            familyLabel: game.birth.family.label,
        },
        canStart: canStartDuel(game),
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        gameId: game.id,
    };
}

export function getRoomPreview(game: StoredGame): RoomJoinPreview {
    if (game.mode !== "duel" || !game.code) throw Errors.notFound("Sala no encontrada.");
    const host = game.players.find((player) => player.slot === game.hostSlot);
    const expiresMs = new Date(game.inviteExpiresAt).getTime() - Date.now();
    return {
        code: game.code,
        hostAlias: host?.alias ?? "Anfitrión",
        status: game.status,
        birthSummary: {
            countryName: game.birth.countryName,
            year: game.birth.year,
            sex: game.birth.sex,
            givenName: game.birth.givenName,
            familyLabel: game.birth.family.label,
        },
        config: structuredClone(game.config),
        expiresInHours: Math.max(0, Math.round((expiresMs / 3600_000) * 10) / 10),
    };
}

export function getHistoryResponse(
    game: StoredGame,
    viewerPlayerId: string,
): HistoryResponse {
    if(game.independentRuns){const run=personalLife(game,viewerPlayerId);if(run===game)throw Errors.forbidden("No participas en esta partida.");const response=getHistoryResponse(run,viewerPlayerId);return {...response,mode:"duel",final:game.final?structuredClone(game.final):null};}
    const me = findPlayerByPlayerId(game, viewerPlayerId);
    if (!me) throw Errors.forbidden("No participas en esta partida.");
    const turns: TurnRecord[] = structuredClone(game.history);
    const moments = buildLifeMoments(game, me.slot);
    const categories = new Set<string>();
    for (const turn of turns) {
        turn.sharedEvents.forEach((event) => categories.add(event.category));
        for (const record of Object.values(turn.players)) {
            if (!record) continue;
            const decision = getDecision(record.decisionId);
            if (decision) categories.add(decision.category);
        }
    }
    return {
        gameId: game.id,
        mode: game.mode,
        alias: me.alias,
        turns,
        moments,
        total: turns.length,
        totalMoments: moments.length,
        categories: [...categories],
        playerSlots: game.players
            .filter((player) => player.character)
            .map((player) => player.slot),
        final: game.final ? structuredClone(game.final) : null,
    };
}

export function getSummary(
    game: StoredGame,
    player: StoredPlayer,
): GameSummary {
    const character = player.character;
    return {
        id: game.id,
        mode: game.mode,
        status: game.status,
        roomCode: game.code,
        alias: player.alias,
        age: character?.ageAtDeath ?? character?.age ?? game.age,
        countryName: getCountry(game.birth.countryCode).name,
        givenName: game.birth.givenName,
        score: player.score?.total ?? 0,
        updatedAt: game.updatedAt,
        winner:
            game.final?.winner === "tie"
                ? "Empate"
                : game.final?.winner
                    ? `Jugador ${game.final.winner}`
                    : null,
        alive: character?.alive ?? false,
        canResume: game.status !== "finished",
    };
}

export function categoryLabels(): { decision: typeof DECISION_CATEGORY_META; event: typeof EVENT_CATEGORY_META } {
    return { decision: DECISION_CATEGORY_META, event: EVENT_CATEGORY_META };
}

function buildExportData(game: StoredGame, viewerPlayerId: string) {
    const me = findPlayerByPlayerId(game, viewerPlayerId);
    if (!me) throw Errors.forbidden("No participas en esta partida.");
    const finished = game.status === "finished";
    const includeSeed = game.mode === "solo" || finished;
    return {
        schemaVersion: "life-duel-export-1",
        exportedAt: new Date().toISOString(),
        game: {
            id: game.id,
            mode: game.mode,
            roomCode: game.code,
            status: game.status,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            finishedAt: game.finishedAt,
            config: game.config,
            birth: game.birth,
            economy: game.economy,
            seedFingerprint: game.seedFingerprint,
            ...(includeSeed ? { worldSeed: game.seed } : {}),
            world: game.world,
            players: game.players,
            history: game.history,
            final: game.final,
            scoring: {
                weights: game.config.scoringWeights,
                rulesVersion: "score-v1",
                tieThreshold: 0.25,
            },
            meta: game.meta,
        },
    };
}

export function exportGameData(game:StoredGame,viewerPlayerId:string){
 if(game.independentRuns&&!game.final){const run=personalLife(game,viewerPlayerId);if(run===game)throw Errors.forbidden("No participas en esta partida.");const result=buildExportData(run,viewerPlayerId);delete result.game.worldSeed;result.game.mode="duel";return result;}
 return buildExportData(game,viewerPlayerId);
}
