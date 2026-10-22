import type { SharedEventRecord } from "@life-duel/shared";
import { EVENT_CATEGORY_META } from "@life-duel/shared";
import {
  Activity,
  Briefcase,
  CloudLightning,
  Cpu,
  GraduationCap,
  Landmark,
  TrendingDown,
  Users,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { SoftCard } from "../ui/Card";
import { cn } from "../../lib/utils";

const EVENT_ICONS = {
  economia: TrendingDown,
  politica: Landmark,
  salud: Activity,
  medioambiente: CloudLightning,
  educacion: GraduationCap,
  trabajo: Briefcase,
  sociedad: Users,
  tecnologia: Cpu,
} as const;

const SEVERITY = {
  1: { label: "Leve", tone: "sky" as const },
  2: { label: "Importante", tone: "amber" as const },
  3: { label: "Grave", tone: "rose" as const },
};

export function EventCard({
  event,
  highlight = false,
  compact = false,
}: {
  event: SharedEventRecord;
  highlight?: boolean;
  compact?: boolean;
}) {
  const meta = EVENT_CATEGORY_META[event.category];
  const Icon = EVENT_ICONS[event.category] ?? Activity;
  const severity = SEVERITY[event.severity];
  return (
    <SoftCard
      className={cn(
        "relative overflow-hidden p-4 sm:p-5",
        highlight && "border-gold/25 bg-gold/[0.035]",
        compact && "p-3.5",
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-[2px]"
        style={{ backgroundColor: meta.color, opacity: 0.75 }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
          style={{
            color: meta.color,
            borderColor: `${meta.color}30`,
            backgroundColor: `${meta.color}12`,
          }}
        >
          <Icon className={compact ? "h-4 w-4" : "h-4.5 w-4.5"} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.64rem] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <Badge tone={severity.tone}>{severity.label}</Badge>
            <span className="text-[0.62rem] text-parchment-faint">Suceso compartido</span>
          </div>
          <h3 className={cn("mt-1.5 text-parchment", compact ? "text-sm" : "text-base")}>{event.title}</h3>
          <p className={cn("mt-1.5 leading-relaxed text-parchment-dim", compact ? "text-xs" : "text-sm")}>
            {event.narrative}
          </p>
          {event.effectsSummary.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Efectos del suceso">
              {event.effectsSummary.map((effect, index) => (
                <li
                  key={`${effect}-${index}`}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[0.65rem] text-parchment-faint"
                >
                  {effect}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </SoftCard>
  );
}
