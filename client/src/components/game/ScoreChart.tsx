import { useId } from "react";
import type { PlayerSlot, ScorePoint } from "@life-duel/shared";
import { cn } from "../../lib/utils";

const SERIES_COLORS: Record<PlayerSlot, string> = {
  1: "#d8b875",
  2: "#54d98c",
};

const WIDTH = 660;
const HEIGHT = 250;
const PAD = { left: 38, right: 16, top: 14, bottom: 30 };

function pathFor(points: ScorePoint[], slot: PlayerSlot, maxAge: number): string {
  const usableWidth = WIDTH - PAD.left - PAD.right;
  const usableHeight = HEIGHT - PAD.top - PAD.bottom;
  const coordinates = points
    .filter((point) => point.players[slot] !== undefined)
    .sort((first, second) => first.age - second.age)
    .map((point,pointIndex) => {
      const x = PAD.left + (Math.min(point.age, maxAge) / Math.max(1, maxAge)) * usableWidth;
      const y = PAD.top + (1 - Math.max(0, Math.min(100, point.players[slot] ?? 0)) / 100) * usableHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
  return coordinates.length === 0 ? "" : `M${coordinates.join(" L")}`;
}

export function ScoreChart({
  points,
  aliases,
  maxAge = 100,
  emptyLabel = "La evolución aparecerá cuando avance la vida.",
  className,
}: {
  points: ScorePoint[];
  aliases: Partial<Record<PlayerSlot, string>>;
  maxAge?: number;
  emptyLabel?: string;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  const hasData = points.some((point) => Object.keys(point.players).length > 0);
  const usableWidth = WIDTH - PAD.left - PAD.right;
  const usableHeight = HEIGHT - PAD.top - PAD.bottom;
  const grid = [0, 25, 50, 75, 100];
  const effectiveMax = Math.max(10, maxAge);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-4" aria-hidden="true">
        {([1, 2] as PlayerSlot[]).map((slot) =>
          aliases[slot] ? (
            <span key={slot} className="inline-flex items-center gap-2 text-[0.7rem] text-parchment-dim">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[slot], boxShadow: `0 0 8px ${SERIES_COLORS[slot]}66` }}
              />
              {aliases[slot]}
            </span>
          ) : null,
        )}
      </div>
      {hasData ? (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={`Evolución de la puntuación vital. ${aliases[1] ? `Serie de ${aliases[1]}.` : ""} ${
            aliases[2] ? `Serie de ${aliases[2]}.` : ""
          }`}
        >
          <defs>
            {([1, 2] as PlayerSlot[]).map((slot) => (
              <linearGradient key={slot} id={`chart-line-${id}-${slot}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={SERIES_COLORS[slot]} stopOpacity="0.5" />
                <stop offset="1" stopColor={SERIES_COLORS[slot]} />
              </linearGradient>
            ))}
          </defs>

          {grid.map((value) => {
            const y = PAD.top + (1 - value / 100) * usableHeight;
            return (
              <g key={value}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray={value === 0 ? undefined : "3 6"}
                />
                <text x={PAD.left - 9} y={y + 3} textAnchor="end" fill="rgba(141,138,128,0.8)" fontSize="9">
                  {value}
                </text>
              </g>
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const age = Math.round(effectiveMax * fraction);
            const x = PAD.left + fraction * usableWidth;
            return (
              <text
                key={fraction}
                x={x}
                y={HEIGHT - 8}
                textAnchor={fraction === 0 ? "start" : fraction === 1 ? "end" : "middle"}
                fill="rgba(141,138,128,0.75)"
                fontSize="9"
              >
                {age} años
              </text>
            );
          })}

          {([1, 2] as PlayerSlot[]).map((slot) => {
            const path = pathFor(points, slot, effectiveMax);
            if (!path) return null;
            return (
              <g key={slot}>
                <path
                  d={`${path} L${WIDTH - PAD.right},${HEIGHT - PAD.bottom} L${PAD.left},${HEIGHT - PAD.bottom} Z`}
                  fill={SERIES_COLORS[slot]}
                  opacity="0.035"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#chart-line-${id}-${slot})`}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 5px ${SERIES_COLORS[slot]}44)` }}
                />
                {points
                  .filter((point) => point.players[slot] !== undefined)
                  .map((point,pointIndex) => {
                    const x = PAD.left + (Math.min(point.age, effectiveMax) / effectiveMax) * usableWidth;
                    const y =
                      PAD.top + (1 - Math.max(0, Math.min(100, point.players[slot] ?? 0)) / 100) * usableHeight;
                    return (
                      <circle
                        key={`${slot}-${point.age}-${pointIndex}`}
                        cx={x}
                        cy={y}
                        r={points.length > 22 ? 1.3 : 2.4}
                        fill={SERIES_COLORS[slot]}
                        stroke="#0a0f1e"
                        strokeWidth="1"
                      />
                    );
                  })}
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-xs text-parchment-faint">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
