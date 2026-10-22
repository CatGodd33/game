import { useId } from "react";
import type { LifeStage, Sex } from "@life-duel/shared";
import { cn, seededNumber } from "../../lib/utils";

const STAGE_PALETTE: Record<LifeStage, { skin: string; hair: string; cloth: string; glow: string }> = {
  infancia: { skin: "#e8b58c", hair: "#4a2d20", cloth: "#6aa9ff", glow: "#8be8bd" },
  adolescencia: { skin: "#d9a47c", hair: "#2a211e", cloth: "#a98bff", glow: "#7dd3fc" },
  adultez: { skin: "#c99570", hair: "#2c1f19", cloth: "#54d98c", glow: "#d8b875" },
  madurez: { skin: "#b98563", hair: "#4a3d37", cloth: "#f6bf4f", glow: "#f4c987" },
  vejez: { skin: "#b58d76", hair: "#c9c4b8", cloth: "#8aa0b8", glow: "#94a3b8" },
};

/**
 * Retrato abstracto determinista. La identidad visual es simbólica:
 * no pretende representar rasgos étnicos reales ni personas concretas.
 */
export function Portrait({
  seed,
  stage = "adultez",
  sex = "female",
  className,
  size = "md",
}: {
  seed: string;
  stage?: LifeStage;
  sex?: Sex;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const id = useId().replaceAll(":", "");
  const palette = STAGE_PALETTE[stage];
  const hairVariant = Math.floor(seededNumber(seed, 1, 0, 4));
  const faceWidth = seededNumber(seed, 2, 17, 21);
  const eyeGap = seededNumber(seed, 3, 5, 7);
  const mouthCurve = seededNumber(seed, 4, -1.6, 2.2);
  const earring = seededNumber(seed, 5, 0, 1) > 0.55;

  const sizeClass = size === "sm" ? "h-14 w-14" : size === "lg" ? "h-40 w-40" : "h-24 w-24";

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(sizeClass, "rounded-full", className)}
      role="img"
      aria-label="Retrato simbólico del personaje"
    >
      <defs>
        <radialGradient id={`portrait-bg-${id}`} cx="45%" cy="35%" r="70%">
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.35" />
          <stop offset="1" stopColor="#0a0f1e" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id={`portrait-cloth-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.cloth} stopOpacity="0.8" />
          <stop offset="1" stopColor={palette.cloth} stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill={`url(#portrait-bg-${id})`} />
      <circle cx="50" cy="50" r="45" fill="none" stroke={palette.glow} strokeOpacity="0.25" strokeWidth="0.8" />
      <path d="M18 98c2-21 14-30 32-30s30 9 32 30" fill={`url(#portrait-cloth-${id})`} />
      <path d="M42 70h16v12H42z" fill={palette.skin} />
      <ellipse cx="50" cy="49" rx={faceWidth} ry="23" fill={palette.skin} />
      <ellipse cx="50" cy="49" rx={faceWidth} ry="23" fill="#0b1420" opacity="0.06" />

      {sex === "female" ? (
        <>
          <path
            d={`M${50 - faceWidth - 3} 50c-2-21 7-31 25-31s23 13 21 30c2-14-4-23-13-24-8 6-18 8-33 5 2 7 2 14 0 20Z`}
            fill={palette.hair}
          />
          {hairVariant >= 2 ? (
            <path
              d={`M${50 + faceWidth - 2} 45c7 4 8 15 3 26-2 5-6 7-8 5 6-9 8-21 5-31Z`}
              fill={palette.hair}
              opacity="0.9"
            />
          ) : null}
        </>
      ) : (
        <path
          d={`M${50 - faceWidth} 45c-1-15 7-24 20-24 14 0 21 9 20 24-4-9-11-13-20-13s-16 4-20 13Z`}
          fill={palette.hair}
        />
      )}

      <ellipse cx={50 - eyeGap} cy="48" rx="1.8" ry="2.2" fill="#17202a" />
      <ellipse cx={50 + eyeGap} cy="48" rx="1.8" ry="2.2" fill="#17202a" />
      <circle cx={50 - eyeGap + 0.6} cy="47.4" r="0.55" fill="#fff8e7" opacity="0.85" />
      <circle cx={50 + eyeGap + 0.6} cy="47.4" r="0.55" fill="#fff8e7" opacity="0.85" />
      <path
        d={`M${50 - eyeGap - 3} 43.5q3-1.8 6 0 M${50 + eyeGap - 3} 43.5q3-1.8 6 0`}
        fill="none"
        stroke={palette.hair}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M49.2 51.5c1 3 0.2 5-1.2 5.8" fill="none" stroke="#8a5c45" strokeWidth="0.8" strokeLinecap="round" />
      <path
        d={`M${46} 61q4 ${mouthCurve} 8 0`}
        fill="none"
        stroke="#8f4f4f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx={50 - faceWidth + 1} cy="51" rx="2.6" ry="4" fill={palette.skin} />
      <ellipse cx={50 + faceWidth - 1} cy="51" rx="2.6" ry="4" fill={palette.skin} />
      {earring ? (
        <circle cx={50 + faceWidth - 1} cy="56" r="1.5" fill="#d8b875" opacity="0.9" />
      ) : null}
      {stage === "vejez" ? (
        <>
          <path d="M43 55q3 1.4 6 0M51 55q3 1.4 6 0" fill="none" stroke="#8a6a58" strokeWidth="0.55" opacity="0.7" />
          <path d="M44 66q6 2 12 0" fill="none" stroke="#8a6a58" strokeWidth="0.5" opacity="0.55" />
        </>
      ) : null}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
    </svg>
  );
}
