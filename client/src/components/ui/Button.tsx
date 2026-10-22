import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-gold-soft via-gold to-gold-deep text-ink-950 shadow-[0_12px_30px_-14px_rgba(216,184,117,0.9)] hover:brightness-110 active:brightness-95 border border-gold-soft/60",
  secondary:
    "bg-white/[0.045] text-parchment border border-white/12 hover:bg-white/[0.08] hover:border-white/20",
  ghost: "bg-transparent text-parchment-dim hover:text-parchment hover:bg-white/[0.05] border border-transparent",
  danger:
    "bg-danger/10 text-red-200 border border-danger/30 hover:bg-danger/20 hover:border-danger/50",
  soft: "bg-gold/10 text-gold-soft border border-gold/25 hover:bg-gold/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.82rem] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-13 px-6 py-3.5 text-[0.95rem] gap-2.5 rounded-2xl",
  icon: "h-10 w-10 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export function buttonClasses(
  variant: Variant = "secondary",
  size: Size = "md",
  className?: string,
): string {
  return cn(
    "relative inline-flex select-none items-center justify-center font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}
