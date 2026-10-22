import type { Milestone } from "@life-duel/shared";
import { DECISION_CATEGORY_META, EVENT_CATEGORY_META } from "@life-duel/shared";
import { Baby, Flag, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

function categoryColor(category: Milestone["category"]): string {
  if (category === "vida") return "#d8b875";
  if (category in DECISION_CATEGORY_META) {
    return DECISION_CATEGORY_META[category as keyof typeof DECISION_CATEGORY_META].color;
  }
  if (category in EVENT_CATEGORY_META) {
    return EVENT_CATEGORY_META[category as keyof typeof EVENT_CATEGORY_META].color;
  }
  return "#94a3b8";
}

export function LifeTimeline({
  milestones,
  limit = 7,
  className,
}: {
  milestones: Milestone[];
  limit?: number;
  className?: string;
}) {
  const ordered = [...milestones].sort((first, second) => second.age - first.age).slice(0, limit);
  return (
    <div className={cn("relative", className)}>
      {ordered.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-4 text-xs text-parchment-faint">
          <Baby className="h-4 w-4" aria-hidden="true" />
          Aún no hay hitos. La vida acaba de empezar.
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-white/10 pl-5">
          {ordered.map((milestone) => {
            const color = categoryColor(milestone.category);
            return (
              <li key={milestone.id} className="relative">
                <span
                  className="absolute -left-[1.53rem] top-1 grid h-2.5 w-2.5 place-items-center rounded-full border"
                  style={{ borderColor: color, backgroundColor: `${color}33`, boxShadow: `0 0 10px ${color}44` }}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[0.65rem] font-semibold tabular-nums text-gold-soft">
                    {milestone.age} años
                  </span>
                  <span className="text-[0.6rem] text-parchment-faint">{milestone.year}</span>
                </div>
                <p className="mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed text-parchment-dim">
                  {milestone.category === "vida" ? (
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} aria-hidden="true" />
                  ) : (
                    <Flag className="mt-0.5 h-3 w-3 shrink-0" style={{ color }} aria-hidden="true" />
                  )}
                  {milestone.title}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
