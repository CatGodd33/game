import type {
    AuthSession,
    ManualPurchase,
    SpendingOption,
    LifeFocus,
    FuneralChoice,
    CreateRoomInput,
    CreateSoloInput,
    DecisionSubmittedResponse,
    DemographicsMeta,
    GameConfig,
    GameSummary,
    GameView,
    HistoryResponse,
    JoinRoomInput,
    LobbyView,
    NarrativeResponse,
    RoomJoinPreview,
    MobilityRequest,
    MobilityResponse,
    SubmitDecisionInput,
} from "@life-duel/shared";
import { getToken } from "./auth";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: boolean;
    signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            method: options.method ?? "GET",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: options.signal,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new ApiError(0, "NETWORK_ERROR", "No se pudo conectar con el servidor.");
    }

    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as unknown)
        : null;

    if (!response.ok) {
        const errorBody = payload as
            | { error?: { code?: string; message?: string; details?: unknown } }
            | null;
        throw new ApiError(
            response.status,
            errorBody?.error?.code ?? "REQUEST_FAILED",
            errorBody?.error?.message ?? `La petición falló (${response.status}).`,
            errorBody?.error?.details,
        );
    }
    return payload as T;
}

export const api = {
    createSession(alias?: string): Promise<AuthSession> {
        return request<AuthSession>("/api/session", {
            method: "POST",
            body: alias ? { alias } : {},
            auth: false,
        });
    },

    me(): Promise<{ playerId: string; alias: string | null; expiresAt: string }> {
        return request("/api/me");
    },

    demographics(): Promise<DemographicsMeta> {
        return request<DemographicsMeta>("/api/meta/demographics", { auth: false });
    },

    health(): Promise<{ status: string; persistence: string; ai: string }> {
        return request("/api/health", { auth: false });
    },

    createSolo(input: CreateSoloInput): Promise<{ game: GameView }> {
        return request("/api/games", { method: "POST", body: input });
    },

    listGames(): Promise<{ games: GameSummary[] }> {
        return request("/api/games");
    },

    getGame(gameId: string, signal?: AbortSignal): Promise<{ game: GameView }> {
        return request(`/api/games/${gameId}`, { signal });
    },

    submitDecision(
        gameId: string,
        decision: SubmitDecisionInput,
    ): Promise<DecisionSubmittedResponse> {
        return request(`/api/games/${gameId}/decision`, { method: "POST", body: decision });
    },

    enableMonthly(gameId: string): Promise<{ game: GameView }> { return request(`/api/games/${gameId}/monthly`, { method: "POST" }); },
    spending(gameId: string): Promise<{ options: SpendingOption[] }> { return request(`/api/games/${gameId}/spending`); },
    purchase(gameId: string, input: ManualPurchase): Promise<{ game: GameView; message: string }> { return request(`/api/games/${gameId}/spending`, { method: "POST", body: input }); },
    mobility(gameId: string): Promise<MobilityResponse> { return request(`/api/games/${gameId}/mobility`); },
    move(gameId: string, input: MobilityRequest): Promise<{ game: GameView; message: string; success: boolean }> { return request(`/api/games/${gameId}/mobility`, { method: "POST", body: input }); },
    funeral(gameId: string, input: { funeralId: string; choice: FuneralChoice; idempotencyKey: string }): Promise<{ game: GameView; message: string; duplicate: boolean }> { return request(`/api/games/${gameId}/funeral`, { method: "POST", body: input }); },
    advance(gameId: string): Promise<{ game: GameView }> { return request(`/api/games/${gameId}/advance`, { method: "POST" }); },
    focus(gameId: string, focus: LifeFocus): Promise<{ game: GameView }> { return request(`/api/games/${gameId}/focus`, { method: "POST", body: { focus } }); },
    pause(gameId: string, paused: boolean): Promise<{ game: GameView }> {
        return request(`/api/games/${gameId}/pause`, { method: "POST", body: { paused } });
    },

    speed(gameId: string, speed: GameConfig["speed"]): Promise<{ game: GameView }> {
        return request(`/api/games/${gameId}/speed`, { method: "POST", body: { speed } });
    },

    auto(
        gameId: string,
        enabled: boolean,
        decisionTimerSeconds?: number,
    ): Promise<{ game: GameView }> {
        return request(`/api/games/${gameId}/auto`, {
            method: "POST",
            body: { enabled, ...(decisionTimerSeconds !== undefined ? { decisionTimerSeconds } : {}) },
        });
    },

    leave(gameId: string): Promise<void> {
        return request(`/api/games/${gameId}/leave`, { method: "POST" });
    },

    rematch(gameId: string, config?: GameConfig): Promise<{ lobby: LobbyView }> {
        return request(`/api/games/${gameId}/rematch`, {
            method: "POST",
            body: config ? { config } : {},
        });
    },

    history(gameId: string): Promise<HistoryResponse> {
        return request(`/api/games/${gameId}/history`);
    },

    narrative(gameId: string): Promise<NarrativeResponse> {
        return request(`/api/games/${gameId}/narrative`, { method: "POST", body: { kind: "final" } });
    },

    createRoom(input: CreateRoomInput): Promise<{ lobby: LobbyView }> {
        return request("/api/rooms", { method: "POST", body: input });
    },

    previewRoom(code: string): Promise<RoomJoinPreview> {
        return request(`/api/rooms/${encodeURIComponent(code)}`, { auth: false });
    },

    joinRoom(input: JoinRoomInput): Promise<{ lobby: LobbyView }> {
        return request("/api/rooms/join", { method: "POST", body: input });
    },

    getLobby(code: string): Promise<{ lobby: LobbyView }> {
        return request(`/api/rooms/${encodeURIComponent(code)}/lobby`);
    },

    updateRoomConfig(code: string, config: GameConfig): Promise<{ lobby: LobbyView }> {
        return request(`/api/rooms/${encodeURIComponent(code)}/config`, {
            method: "PATCH",
            body: { config },
        });
    },

    ready(code: string, ready: boolean): Promise<{ lobby: LobbyView }> {
        return request(`/api/rooms/${encodeURIComponent(code)}/ready`, {
            method: "POST",
            body: { ready },
        });
    },

    startRoom(code: string): Promise<{ game: GameView }> {
        return request(`/api/rooms/${encodeURIComponent(code)}/start`, { method: "POST" });
    },

    async downloadExport(gameId: string): Promise<void> {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/games/${gameId}/export`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new ApiError(response.status, "EXPORT_FAILED", "No se pudo exportar la partida.");
        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") ?? "";
        const match = disposition.match(/filename="([^"]+)"/);
        const fileName = match?.[1] ?? `life-duel-${gameId.slice(0, 8)}.json`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    },
};

export { API_BASE };
