import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GameSummary } from "@life-duel/shared";
import { formatScore } from "@life-duel/shared";
import {
  ArrowRight,
  BookHeart,
  CalendarDays,
  Crown,
  History,
  Plus,
  Skull,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { PageHeader } from "../components/layout/AppShell";
import { Badge } from "../components/ui/Badge";
import { buttonClasses } from "../components/ui/Button";
import { Card, SoftCard } from "../components/ui/Card";
import { EmptyState, ErrorState, Loader } from "../components/ui/States";
import { useSessionStore } from "../features/session/sessionStore";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

export function LivesHistoryPage() {
  const token = useSessionStore((state) => state.token);
  const ensureSession = useSessionStore((state) => state.ensureSession);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ensureSession()
      .then(() => api.listGames())
      .then(({ games: loaded }) => {
        if (active) setGames(loaded.filter((game) => game.status === "finished"));
      })
      .catch((reason: unknown) => {
        if (active) setError(safeErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ensureSession, token]);

  const stats = useMemo(() => {
    if (games.length === 0) return null;
    const scores = games.map((game) => game.score);
    const best = games.reduce((champion, game) => (game.score > champion.score ? game : champion), games[0]!);
    const average = scores.reduce((total, score) => total + score, 0) / scores.length;
    const years = games.reduce((total, game) => total + game.age, 0);
    return { best, average, years };
  }, [games]);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <PageHeader
        eyebrow="Historial de vidas"
        title="Las vidas que ya has recorrido"
        description="Un archivo de resultados finales, no de partidas pendientes. Cada expediente conserva la semilla, las decisiones, el historial económico y la comparación final."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/nueva-vida" className={buttonClasses("primary", "sm")}>
              <Plus className="h-4 w-4" /> Nueva vida
            </Link>
            <Link to="/partidas" className={buttonClasses("secondary", "sm")}>
              <BookHeart className="h-4 w-4" /> Partidas en curso
            </Link>
          </div>
        }
      />

      {loading ? (
        <Loader label="Abriendo el archivo de vidas…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : games.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="El archivo está vacío"
          description="Cuando una vida termine, aparecerá aquí con su resumen, sus hitos y su comparación. Las vidas en curso están en «Mis vidas»."
          action={
            <Link to="/nueva-vida" className={buttonClasses("primary", "sm")}>
              <Sparkles className="h-4 w-4" /> Empezar una vida
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <SoftCard className="p-5">
              <Trophy className="h-4 w-4 text-gold" />
              <p className="mt-2 font-display text-2xl text-parchment">{games.length}</p>
              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-parchment-faint">Vidas archivadas</p>
            </SoftCard>
            <SoftCard className="p-5">
              <Crown className="h-4 w-4 text-gold" />
              <p className="mt-2 truncate font-display text-2xl text-parchment">
                {formatScore(stats?.best.score ?? 0)}
              </p>
              <p className="truncate text-[0.62rem] uppercase tracking-[0.1em] text-parchment-faint">
                Mejor resultado · {stats?.best.givenName}
              </p>
            </SoftCard>
            <SoftCard className="p-5">
              <CalendarDays className="h-4 w-4 text-gold" />
              <p className="mt-2 font-display text-2xl text-parchment">{Math.round(stats?.years ?? 0)}</p>
              <p className="text-[0.62rem] uppercase tracking-[0.1em] text-parchment-faint">Años vividos en total</p>
            </SoftCard>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {games.map((game, index) => (
              <Card key={game.id} className="group overflow-hidden">
                <div className="flex items-stretch">
                  <div className={`flex w-16 shrink-0 flex-col items-center justify-center border-r border-white/[0.06] ${game.mode === "duel" ? "bg-jade/[0.045]" : "bg-gold/[0.035]"}`}>
                    <span className="font-display text-lg text-parchment">{game.age}</span>
                    <span className="text-[0.52rem] uppercase tracking-[0.08em] text-parchment-faint">años</span>
                  </div>
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-parchment">{game.givenName}</p>
                        <p className="text-[0.65rem] text-parchment-faint">
                          {game.countryName} · {game.alias}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={game.mode === "duel" ? "jade" : "gold"}>
                          {game.mode === "duel" ? <Swords className="h-3 w-3" /> : <BookHeart className="h-3 w-3" />}
                          {game.mode === "duel" ? "Duelo" : "Individual"}
                        </Badge>
                        {index === 0 ? <span className="text-[0.55rem] text-parchment-faint">Última</span> : null}
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[0.55rem] uppercase tracking-[0.1em] text-parchment-faint">Puntuación</p>
                        <p className="font-display text-xl text-gold">{formatScore(game.score)}</p>
                      </div>
                      <div className="text-right">
                        {game.winner ? (
                          <p className="flex items-center justify-end gap-1 text-[0.65rem] text-gold">
                            <Crown className="h-3 w-3" /> {game.winner}
                          </p>
                        ) : (
                          <p className="flex items-center justify-end gap-1 text-[0.65rem] text-parchment-faint">
                            <Skull className="h-3 w-3" /> {game.alive ? "Vida activa" : "Finalizada"}
                          </p>
                        )}
                        <Link
                          to={`/partida/${game.id}/final`}
                          className="mt-1.5 inline-flex items-center gap-1 text-[0.65rem] text-gold transition hover:text-gold-soft"
                        >
                          Ver expediente <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-5 text-center text-[0.65rem] text-parchment-faint">
            Consejo: desde el resumen final puedes descargar el registro completo en JSON o compartir una
            tarjeta con tus cifras.
          </p>
        </>
      )}
    </div>
  );
}
