import { useId } from "react";
import type { LifeStage } from "@life-duel/shared";
import { cn, seededNumber } from "../../lib/utils";

const PALETTES: Record<
  LifeStage,
  { skyA: string; skyB: string; horizon: string; sun: string; landA: string; landB: string; accent: string }
> = {
  infancia: {
    skyA: "#10213a",
    skyB: "#43698d",
    horizon: "#f4c987",
    sun: "#ffe4ae",
    landA: "#17624c",
    landB: "#0b3b35",
    accent: "#8be8bd",
  },
  adolescencia: {
    skyA: "#1b1738",
    skyB: "#68538b",
    horizon: "#e4a77e",
    sun: "#ffd39a",
    landA: "#285a62",
    landB: "#122e3d",
    accent: "#7dd3fc",
  },
  adultez: {
    skyA: "#08182c",
    skyB: "#21526c",
    horizon: "#dcb478",
    sun: "#ffe9b8",
    landA: "#13604f",
    landB: "#0a322e",
    accent: "#5eead4",
  },
  madurez: {
    skyA: "#20152c",
    skyB: "#7d4a54",
    horizon: "#e9b184",
    sun: "#ffd7a0",
    landA: "#3c5743",
    landB: "#1b2c2b",
    accent: "#fbbf24",
  },
  vejez: {
    skyA: "#0c1324",
    skyB: "#35425d",
    horizon: "#c4a478",
    sun: "#f6e6c4",
    landA: "#2d4a46",
    landB: "#142527",
    accent: "#94a3b8",
  },
};

function hillPath(seed: number, y: number, amplitude: number): string {
  const points: string[] = [`M0 ${y}`];
  for (let index = 1; index <= 6; index += 1) {
    const x = (100 / 6) * index;
    const offset = Math.sin(seed * 0.9 + index * 1.7) * amplitude;
    points.push(`Q${x - 8} ${y + offset} ${x} ${y + offset * 0.35}`);
  }
  points.push("L100 100L0 100Z");
  return points.join(" ");
}

/**
 * Ilustración procedural y original: un paisaje que cambia con la etapa vital,
 * el país y la semilla del mundo. No usa imágenes ni recursos de terceros.
 */
export function LifeScene({
  stage = "adultez",
  seed = "life-duel",
  className,
  compact = false,
}: {
  stage?: LifeStage;
  seed?: string;
  className?: string;
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const palette = PALETTES[stage];
  const sunX = seededNumber(seed, 1, 24, 76);
  const sunY = seededNumber(seed, 2, 22, 42);
  const sunR = seededNumber(seed, 3, 7, 11);
  const houseX = seededNumber(seed, 4, 14, 84);
  const houseScale = seededNumber(seed, 5, 0.75, 1.25);
  const birdShift = seededNumber(seed, 6, 0, 20);
  const stars = Array.from({ length: 14 }, (_, index) => ({
    x: seededNumber(seed, 10 + index, 2, 98),
    y: seededNumber(seed, 30 + index, 4, 46),
    r: seededNumber(seed, 50 + index, 0.25, 0.85),
  }));
  const showStars = stage === "vejez" || stage === "adolescencia";
  const hillOne = hillPath(seededNumber(seed, 7, 0, 10), 73, 11);
  const hillTwo = hillPath(seededNumber(seed, 8, 0, 10), 84, 7);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.skyA} />
          <stop offset="0.72" stopColor={palette.skyB} />
          <stop offset="1" stopColor={palette.horizon} stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id={`sun-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.sun} stopOpacity="1" />
          <stop offset="0.45" stopColor={palette.sun} stopOpacity="0.85" />
          <stop offset="1" stopColor={palette.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`land-a-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.landA} stopOpacity="0.95" />
          <stop offset="1" stopColor={palette.landB} />
        </linearGradient>
        <linearGradient id={`land-b-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.landB} />
          <stop offset="1" stopColor="#050b14" />
        </linearGradient>
        <linearGradient id={`water-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={palette.horizon} stopOpacity="0.2" />
          <stop offset="0.5" stopColor={palette.sun} stopOpacity="0.5" />
          <stop offset="1" stopColor={palette.horizon} stopOpacity="0.1" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      <rect width="100" height="100" fill={`url(#sky-${id})`} />
      {showStars
        ? stars.map((star, index) => (
            <circle
              key={index}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="#f4f0e6"
              opacity={0.35 + (index % 4) * 0.12}
            />
          ))
        : null}
      <circle cx={sunX} cy={sunY} r={sunR * 3.4} fill={`url(#sun-${id})`} opacity="0.55" />
      <circle cx={sunX} cy={sunY} r={sunR} fill={palette.sun} opacity="0.92" />
      <circle cx={sunX} cy={sunY} r={sunR} fill={palette.sun} opacity="0.45" filter={`url(#glow-${id})`} />

      <path
        d={`M${birdShift} 28 Q${birdShift + 2.4} 26 ${birdShift + 4.8} 28 M${birdShift + 4.8} 28 Q${birdShift + 7.2} 26 ${birdShift + 9.6} 28`}
        fill="none"
        stroke="#f4f0e6"
        strokeOpacity="0.45"
        strokeWidth="0.35"
        strokeLinecap="round"
      />
      <path
        d={`M${72 - birdShift / 3} 20 Q${74.2 - birdShift / 3} 18.3 ${76.4 - birdShift / 3} 20`}
        fill="none"
        stroke="#f4f0e6"
        strokeOpacity="0.3"
        strokeWidth="0.3"
        strokeLinecap="round"
      />

      <path d="M0 70 Q25 66 50 70 T100 69V100H0Z" fill={`url(#water-${id})`} opacity="0.7" />
      <path d={hillTwo} fill={`url(#land-b-${id})`} opacity="0.95" />
      <path d={hillOne} fill={`url(#land-a-${id})`} />

      <g transform={`translate(${houseX} ${70 - houseScale * 2}) scale(${houseScale})`} opacity="0.9">
        <rect x="-3.5" y="-3" width="7" height="5.4" rx="0.4" fill="#101a24" />
        <path d="M-4.4 -3 0 -6.2 4.4 -3Z" fill={palette.accent} opacity="0.55" />
        <rect x="-1.6" y="-1.6" width="1.5" height="1.6" fill={palette.sun} opacity="0.75" />
        <rect x="0.8" y="-1.2" width="1" height="3.6" fill="#0c141c" />
      </g>

      {!compact ? (
        <>
          <g transform={`translate(${52 + sunX / 10} 87)`} opacity="0.9">
            <path d="M0 10 C1 3 4 -1 8 -4" fill="none" stroke="#08131a" strokeWidth="0.9" />
            <ellipse cx="2.5" cy="-2" rx="2.8" ry="1.6" fill="#08131a" transform="rotate(-28 2.5 -2)" />
            <ellipse cx="6.5" cy="-5" rx="2.2" ry="1.3" fill="#08131a" transform="rotate(32 6.5 -5)" />
          </g>
          <g transform={`translate(${20 + birdShift / 5} 90)`} opacity="0.65">
            <path d="M0 3v7m0-4h4v4m-4-5h4" stroke="#08131a" strokeWidth="0.7" />
          </g>
        </>
      ) : null}

      <path d="M0 96 Q40 93 100 97V100H0Z" fill="#050b12" opacity="0.8" />
      <ellipse cx={sunX} cy="70" rx={sunR * 2.2} ry="1.2" fill={palette.sun} opacity="0.18" />
    </svg>
  );
}
