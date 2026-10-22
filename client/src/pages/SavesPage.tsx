import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GameSummary, RoomStatus } from "@life-duel/shared";
import {
  ArrowRight,
  BookHeart,
  Clock3,
  Crown,
  Filter,
  Plus,
  RefreshCw,
  Skull,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { Button, buttonClasses } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { EmptyState, ErrorState, Loader } from "../components/ui/States";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

type FilterKey = "all" | "active" | "finished";

export const STATUS_META: Record<RoomStatus, { label: string; tone: "jade" | "amber" | "sky" | "neutral" | "gold" }> = {
  waiting: { label: "Esperando rival", tone: "amber" },
  ready: { label: "Sala preparada", tone: "sky" },
  playing: { label: "En curso", tone: "jade" },
  paused: { label: "En pausa", tone: "amber" },
  finished: { label: "Finalizada", tone: "neutral" },
};

export function gameHref(game: GameSummary): string {
  if (game.status === "finished") return `/partida/${game.id}/final`;
  if ((game.status === "waiting" || game.status === "ready") && game.roomCode) return `/sala/${game.roomCode}`;
  return `/partida/${game.id}`;
}

export function SavesPage({ embedded = false }: { embedded?: boolean }) {
  const token = useSessionStore((state) => state.token);
  const ensureSession = useSessionStore((state) => state.ensureSession);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [modeFilter, setModeFilter] = useState<"all" | "solo" | "duel">("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      const { games: loaded } = await api.listGames();
      setGames(loaded);
    } catch (reason) {
      setError(safeErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // La sesión se reutiliza; el listado solo necesita refrescarse al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    return games.filter((game) => {
      if (filter === "active" && (game.status === "finished" || game.status === "waiting" || game.status === "ready")) {
        return false;
      }
      if (filter === "finished" && game.status !== "finished") return false;
      if (modeFilter !== "all" && game.mode !== modeFilter) return false;
      return true;
    });
  }, [games, filter, modeFilter]);

  const active = games.filter((game) => game.status === "playing" || game.status === "paused" || game.status === "waiting" || game.status === "ready");
  const finished = games.filter((game) => game.status === "finished");

  return (
    <div className={embedded ? "" : "container-page pt-8 sm:pt-12"}>
      {!embedded ? (
        <PageHeader
          eyebrow="Mis vidas"
          title="Partidas guardadas"
          description="Cada vida se conserva en el servidor. Puedes retomarla desde aquí, aunque hayas cerrado el navegador o el servidor se haya reiniciado."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/nueva-vida" className={buttonClasses("primary", "sm")}>
                <Plus className="h-4 w-4" /> Nueva vida
              </Link>
              <Link to="/duelo" className={buttonClasses("secondary", "sm")}>
                <Swords className="h-4 w-4" /> Nuevo duelo
              </Link>
            </div>
          }
        />
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Vidas totales" value={games.length} icon={<BookHeart className="h-4 w-4" />} />
        <Summary label="En curso" value={active.length} icon={<Clock3 className="h-4 w-4" />} />
        <Summary label="Finalizadas" value={finished.length} icon={<Trophy className="h-4 w-4" />} />
        <Summary
          label="Mejor puntuación"
          value={finished.length > 0 ? Math.max(...finished.map((game) => game.score)).toFixed(1) : "—"}
          icon={<Crown className="h-4 w-4" />}
        />
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="mr-1 h-3.5 w-3.5 text-parchment-faint" aria-hidden="true" />
            {(
              [
                ["all", "Todas"],
                ["active", "En curso"],
                ["finished", "Finalizadas"],
              ] as [FilterKey, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  filter === value ? "bg-gold/15 text-gold-soft" : "text-parchment-dim hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["all", "Todos los modos"],
                ["solo", "Individual"],
                ["duel", "Duelo"],
              ] as ["all" | "solo" | "duel", string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setModeFilter(value)}
                aria-pressed={modeFilter === value}
                className={`rounded-lg border px-2.5 py-1.5 text-[0.65rem] transition ${
                  modeFilter === value
                    ? "border-gold/25 bg-gold/10 text-gold-soft"
                    : "border-white/8 text-parchment-faint hover:text-parchment"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loader label="Buscando tus vidas…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookHeart className="h-6 w-6" />}
          title={games.length === 0 ? "Todavía no has vivido ninguna vida" : "No hay partidas con estos filtros"}
          description={
            games.length === 0
              ? "Empieza una vida individual o reta a alguien a un duelo. Tu progreso se guarda automáticamente."
              : "Prueba con otro estado o modo de juego."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/nueva-vida" className={buttonClasses("primary", "sm")}>
                <Plus className="h-4 w-4" /> Nueva vida
              </Link>
              <Link to="/duelo" className={buttonClasses("secondary", "sm")}>
                <Swords className="h-4 w-4" /> Nuevo duelo
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} onRefresh={() => void load()} />
          ))}
        </div>
      )}

      {!loading && !error ? (
        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar lista
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <SoftCard className="p-4">
      <div className="text-gold">{icon}</div>
      <p className="mt-2 font-display text-2xl text-parchment">{value}</p>
      <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.1em] text-parchment-faint">{label}</p>
    </SoftCard>
  );
}

function GameCard({ game, onRefresh }: { game: GameSummary; onRefresh: () => void }) {
  const status = STATUS_META[game.status];
  const date = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(game.updatedAt));
  return (
    <SoftCard className="flex flex-col p-4 transition hover:border-white/15">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-xl border ${game.mode === "duel" ? "border-jade/25 bg-jade/10 text-jade" : "border-gold/25 bg-gold/10 text-gold"}`}>
            {game.mode === "duel" ? <Swords className="h-4 w-4" /> : <BookHeart className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-medium text-parchment">{game.givenName}</p>
            <p className="text-[0.65rem] text-parchment-faint">
              {game.countryName} · {game.age} años
            </p>
          </div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3">
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">Puntuación</p>
          <p className="mt-0.5 font-display text-lg text-gold">{game.score.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">Alias</p>
          <p className="mt-0.5 truncate text-xs font-medium text-parchment">{game.alias}</p>
        </div>
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">Modo</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-parchment">
            {game.mode === "duel" ? <UsersRound className="h-3 w-3 text-jade" /> : null}
            {game.mode === "duel" ? (game.roomCode ?? "Duelo") : "Individual"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {game.winner ? (
            <p className="flex items-center gap-1 text-[0.65rem] text-gold">
              <Trophy className="h-3 w-3" /> {game.winner}
            </p>
          ) : game.alive ? (
            <p className="text-[0.62rem] text-parchment-faint">Vida activa · guardado {date}</p>
          ) : (
            <p className="flex items-center gap-1 text-[0.62rem] text-parchment-faint">
              <Skull className="h-3 w-3" /> Vida terminada · {date}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {game.status === "finished" ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-white/10 px-2.5 py-2 text-[0.62rem] text-parchment-faint hover:text-parchment"
              aria-label="Actualizar"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          ) : null}
          <Link
            to={gameHref(game)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[0.68rem] text-parchment-dim transition hover:border-gold/25 hover:text-gold"
          >
            {game.status === "finished" ? "Ver resumen" : game.status === "waiting" || game.status === "ready" ? "Abrir sala" : "Continuar"}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </SoftCard>
  );
}
