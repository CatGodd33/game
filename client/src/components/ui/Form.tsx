import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-parchment-dim">{label}</span>
        {hint ? <span className="text-[0.68rem] normal-case tracking-normal text-parchment-faint">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-rose">{error}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-white/12 bg-ink-950/60 px-3.5 text-sm text-parchment placeholder:text-parchment-faint/70 transition focus:border-gold/50 focus:bg-ink-950/80 focus:outline-none focus:ring-2 focus:ring-gold/20",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-white/12 bg-ink-950/60 px-3.5 text-sm text-parchment transition focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left text-sm transition",
            value === option.value
              ? "border-gold/50 bg-gold/10 text-parchment shadow-[inset_0_0_0_1px_rgba(216,184,117,0.15)]"
              : "border-white/10 bg-white/[0.025] text-parchment-dim hover:border-white/20 hover:text-parchment",
          )}
        >
          <span className="block font-medium">{option.label}</span>
          {option.hint ? (
            <span className="mt-0.5 block text-[0.68rem] leading-snug text-parchment-faint">{option.hint}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition",
          checked ? "border-gold/60 bg-gold/80" : "border-white/15 bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.35rem]" : "left-0.5",
          )}
          style={{ height: "1.1rem", width: "1.1rem" }}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-parchment">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-parchment-faint">{description}</span> : null}
      </span>
    </label>
  );
}
