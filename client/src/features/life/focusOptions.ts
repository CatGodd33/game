import type { LifeFocus } from "@life-duel/shared";

export interface FocusOption {
    id: LifeFocus;
    label: string;
    effect: string;
    detail: string;
    icon: "balanced" | "study" | "relationships" | "health" | "hobbies" | "work";
}

/**
 * Fuente única del enfoque anual. La infancia temprana no elige enfoque y el
 * trabajo solo aparece cuando el personaje puede participar en el mercado
 * laboral. El servidor sigue siendo quien valida el cambio.
 */
export const FOCUS_OPTIONS: FocusOption[] = [
    {
        id: "balanced",
        label: "Equilibrio",
        effect: "Un poco de todo",
        detail: "Reparte el año entre aprender, cuidarte y estar con los tuyos.",
        icon: "balanced",
    },
    {
        id: "study",
        label: "Estudiar",
        effect: "Conocimiento ↑",
        detail: "Da prioridad a la formación y a las oportunidades académicas.",
        icon: "study",
    },
    {
        id: "relationships",
        label: "Familia y amigos",
        effect: "Vínculos ↑",
        detail: "Reserva tiempo para las personas que sostienen tu vida.",
        icon: "relationships",
    },
    {
        id: "health",
        label: "Cuidarme",
        effect: "Salud ↑",
        detail: "Hábitos, descanso y atención preventiva durante el año.",
        icon: "health",
    },
    {
        id: "hobbies",
        label: "Aficiones",
        effect: "Felicidad ↑",
        detail: "Cultiva lo que disfrutas más allá del trabajo y las obligaciones.",
        icon: "hobbies",
    },
    {
        id: "work",
        label: "Trabajo",
        effect: "Experiencia ↑",
        detail: "Prioriza tu trayectoria, tus ingresos y tu experiencia profesional.",
        icon: "work",
    },
];

export function availableFocusOptions(age: number): FocusOption[] {
    if (age < 6) return [];
    return FOCUS_OPTIONS.filter((option) => option.id !== "work" || age >= 18);
}
