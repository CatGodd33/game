import type { DecisionCategory } from "@life-duel/shared";

const palettes: Record<string, { sky: string; ground: string; accent: string; ink: string }> = {
    familia: { sky: "#f3e8d6", ground: "#d9c7a8", accent: "#b98068", ink: "#5d4c3d" },
    relaciones: { sky: "#f4e4de", ground: "#ddc1b5", accent: "#b87d78", ink: "#5d4441" },
    educacion: { sky: "#e7eee3", ground: "#c7d5bd", accent: "#6f8d6a", ink: "#3e5140" },
    trabajo: { sky: "#e5ecec", ground: "#bfd0ce", accent: "#6f8c8b", ink: "#3b4f4f" },
    dinero: { sky: "#f2ecdc", ground: "#d9cba7", accent: "#a88b4d", ink: "#554a31" },
    salud: { sky: "#ece8f1", ground: "#d3cadf", accent: "#8c7ba3", ink: "#473f52" },
    vivienda: { sky: "#eee9df", ground: "#d4c9b8", accent: "#9b8b70", ink: "#4e483d" },
    migracion: { sky: "#e4edf0", ground: "#c0d3da", accent: "#678d9b", ink: "#354b52" },
    ocio: { sky: "#f3eadb", ground: "#dbc9a9", accent: "#b08c55", ink: "#594a34" },
    riesgo: { sky: "#f1e6e2", ground: "#d8c2ba", accent: "#a86b60", ink: "#513b37" },
};

/**
 * Escena original y abstracta para acompañar una decisión. No representa una
 * fotografía ni un recurso de terceros: es una composición SVG propia.
 */
export function DecisionScene({ category }: { category: DecisionCategory }) {
    const p = palettes[category] ?? palettes.familia!;
    return (
        <div className="decision-scene" aria-hidden="true">
            <svg viewBox="0 0 900 190" preserveAspectRatio="xMidYMid slice" role="presentation">
                <defs>
                    <linearGradient id={`decision-sky-${category}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={p.sky} />
                        <stop offset="1" stopColor={p.ground} />
                    </linearGradient>
                    <linearGradient id={`decision-hill-${category}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={p.accent} stopOpacity=".42" />
                        <stop offset="1" stopColor={p.ground} stopOpacity=".9" />
                    </linearGradient>
                </defs>
                <rect width="900" height="190" fill={`url(#decision-sky-${category})`} />
                <circle cx="735" cy="45" r="30" fill={p.accent} opacity=".24" />
                <path d="M0 138 C120 104 218 132 330 116 C462 97 560 144 690 113 C790 90 845 110 900 100 L900 190 L0 190 Z" fill={`url(#decision-hill-${category})`} />
                <path d="M0 158 C160 136 270 168 420 148 C570 128 690 166 900 141 L900 190 L0 190 Z" fill={p.ground} opacity=".62" />
                <g fill={p.ink} opacity=".68">
                    <rect x="84" y="102" width="7" height="56" rx="3" />
                    <path d="M88 105 C62 86 58 78 57 62 C77 60 88 76 88 89 C91 73 102 62 121 59 C119 80 105 91 88 105 Z" opacity=".52" />
                    <circle cx="462" cy="92" r="14" />
                    <path d="M448 146 C450 119 456 110 462 110 C469 110 475 119 477 146 Z" />
                    <circle cx="510" cy="99" r="12" />
                    <path d="M497 146 C499 122 505 115 510 115 C516 115 521 122 523 146 Z" opacity=".82" />
                    <path d="M443 143 C472 134 500 136 529 143" fill="none" stroke={p.ink} strokeWidth="3" strokeLinecap="round" opacity=".42" />
                </g>
                <g fill="none" stroke={p.ink} strokeWidth="2" opacity=".26">
                    <path d="M170 58 q9 -9 18 0 q9 -9 18 0" />
                    <path d="M614 70 q7 -7 14 0 q7 -7 14 0" />
                    <path d="M268 40 q6 -6 12 0 q6 -6 12 0" />
                </g>
                <rect x="0" y="0" width="900" height="190" fill="none" stroke="#ffffff" strokeOpacity=".28" />
            </svg>
        </div>
    );
}
