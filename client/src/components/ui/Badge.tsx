import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tone = "neutral" | "gold" | "jade" | "amber" | "sky" | "rose" | "violet" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[0.05] text-parchment-dim",
  gold: "border-gold/25 bg-gold/10 text-gold-soft",
  jade: "border-jade/25 bg-jade/10 text-jade",
  amber: "border-amber/25 bg-amber/10 text-amber",
  sky: "border-sky/25 bg-sky/10 text-sky",
  rose: "border-rose/25 bg-rose/10 text-rose",
  violet: "border-violet/25 bg-violet/10 text-violet",
  danger: "border-danger/30 bg-danger/10 text-red-300",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
