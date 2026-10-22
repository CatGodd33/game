import { useId } from "react";
import { cn } from "../../lib/utils";

/**
 * Marca original de LIFE DUEL: dos trayectorias que comparten un mismo eje.
 * Se dibuja en SVG para conservar nitidez y evitar recursos externos.
 */
export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Emblema de LIFE DUEL"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`logo-gold-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6ead0" />
          <stop offset="0.55" stopColor="#d8b875" />
          <stop offset="1" stopColor="#9d7b3d" />
        </linearGradient>
        <linearGradient id={`logo-jade-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#54d98c" />
          <stop offset="1" stopColor="#a9f0c9" />
        </linearGradient>
        <radialGradient id={`logo-core-${id}`} cx="50%" cy="42%" r="55%">
          <stop offset="0" stopColor="#fff8e7" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d8b875" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <path
        d="M32 4 57 18v27L32 60 7 45V18Z"
        fill="rgba(216,184,117,0.045)"
        stroke={`url(#logo-gold-${id})`}
        strokeWidth="1.2"
      />
      <path
        d="M19 46c0-10 5.8-15.5 13-15.5S45 36 45 46"
        fill="none"
        stroke={`url(#logo-gold-${id})`}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M45 20c0 8.8-5.8 14-13 14s-13-5.2-13-14"
        fill="none"
        stroke={`url(#logo-jade-${id})`}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2.4 3.6"
      />
      <circle cx="32" cy="32" r="7.8" fill={`url(#logo-core-${id})`} />
      <circle cx="32" cy="32" r="3.1" fill="#f6ead0" />
      <circle cx="32" cy="32" r="8.7" fill="none" stroke="#d8b875" strokeOpacity="0.45" strokeWidth="0.7" />
      <path d="M32 2.5v4M32 57.5v4M4.5 32h4M55.5 32h4" stroke="#d8b875" strokeOpacity="0.55" strokeWidth="1" />
    </svg>
  );
}

export function Logo({
  size = 40,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.05rem] tracking-[0.22em] text-parchment">
            LIFE <span className="text-gold">DUEL</span>
          </span>
          <span className="mt-1 text-[0.5rem] uppercase tracking-[0.3em] text-parchment-faint">
            Dos vidas · un mundo
          </span>
        </span>
      ) : null}
    </span>
  );
}
