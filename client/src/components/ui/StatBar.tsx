import { BookOpen, HeartPulse, Sun, Users } from "lucide-react";
import type { CoreStatKey } from "@life-duel/shared";
import { CORE_STAT_META } from "@life-duel/shared";
import { cn } from "../../lib/utils";

const ICONS = {
  health: HeartPulse,
  happiness: Sun,
  knowledge: BookOpen,
  relationships: Users,
} as const;

export function StatBar({
  stat,
  value,
  delta,
  compact = false,
}: {
  stat: CoreStatKey;
  value: number;
  delta?: number;
  compact?: boolean;
}) {
  const meta = CORE_STAT_META[stat];
  const Icon = ICONS[stat];
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("group", compact ? "space-y-1.5" : "space-y-2.5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border"
            style={{
              color: meta.color,
              borderColor: `${meta.color}33`,
              backgroundColor: `${meta.color}12`,
            }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className={cn("font-medium text-parchment-dim", compact ? "text-xs" : "text-sm")}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          {delta !== undefined && delta !== 0 ? (
            <span
              className={cn(
                "text-[0.65rem] font-semibold",
                delta > 0 ? "text-jade" : "text-rose",
              )}
            >
              {delta > 0 ? "+" : ""}
              {Math.round(delta)}
            </span>
          ) : null}
          <span className={cn("font-semibold tabular-nums text-parchment", compact ? "text-xs" : "text-sm")}>
            {Math.round(safeValue)}
          </span>
          <span className="text-[0.6rem] text-parchment-faint">/100</span>
        </div>
      </div>
      <div
        className={cn("overflow-hidden rounded-full bg-white/[0.06]", compact ? "h-1" : "h-1.5")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeValue)}
        aria-label={meta.label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${safeValue}%`,
            background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
            boxShadow: `0 0 12px ${meta.color}55`,
          }}
        />
      </div>
    </div>
  );
}
