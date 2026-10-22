import { useEffect, useRef, useState } from "react";

/** Por debajo de este tiempo la reproducción no sería legible. */
export const MIN_BANK_REPLAY_MS = 900;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    return reduced;
}

function initialProgress(
    deadlineAt: string | null | undefined,
    durationMs: number,
    active: boolean,
): number {
    if (!active || !deadlineAt || durationMs < MIN_BANK_REPLAY_MS) return 1;
    const end = Date.parse(deadlineAt);
    if (!Number.isFinite(end)) return 1;
    return clamp(1 - (end - Date.now()) / durationMs, 0, 1);
}

/**
 * Avance visual del cierre mensual. Se apoya en el mismo deadline que la barra
 * superior; si el servidor pausa el reloj, la reproducción se queda congelada.
 */
export function useMonthProgress({
    deadlineAt,
    durationMs,
    active,
    resetKey,
    reducedMotion,
}: {
    deadlineAt?: string | null;
    durationMs: number;
    active: boolean;
    resetKey: string;
    reducedMotion: boolean;
}): number {
    const [progress, setProgress] = useState(() =>
        initialProgress(deadlineAt, durationMs, active && !reducedMotion),
    );
    const lastKey = useRef(resetKey);

    useEffect(() => {
        const changedMonth = lastKey.current !== resetKey;
        lastKey.current = resetKey;

        if (!active) {
            if (changedMonth) setProgress(1);
            return;
        }
        if (reducedMotion || !deadlineAt || durationMs < MIN_BANK_REPLAY_MS) {
            setProgress(1);
            return;
        }

        const end = Date.parse(deadlineAt);
        if (!Number.isFinite(end)) {
            setProgress(1);
            return;
        }

        const start = end - durationMs;
        let frame = 0;
        const update = () => {
            const next = clamp((Date.now() - start) / durationMs, 0, 1);
            setProgress((previous) => Math.abs(previous - next) > 0.001 ? next : previous);
            if (next < 1) frame = requestAnimationFrame(update);
        };

        update();
        return () => cancelAnimationFrame(frame);
    }, [active, deadlineAt, durationMs, reducedMotion, resetKey]);

    return progress;
}

/** Interpola el saldo visible sin tocar el saldo real del servidor. */
export function useAnimatedNumber(target: number, reducedMotion: boolean): number {
    const safeTarget = Number.isFinite(target) ? target : 0;
    const [displayed, setDisplayed] = useState(safeTarget);
    const current = useRef(safeTarget);

    useEffect(() => {
        if (reducedMotion || Math.abs(current.current - safeTarget) < 0.01) {
            current.current = safeTarget;
            setDisplayed(safeTarget);
            return;
        }

        const from = current.current;
        const started = performance.now();
        let frame = 0;

        const tick = (now: number) => {
            const time = clamp((now - started) / 360, 0, 1);
            const eased = 1 - (1 - time) ** 3;
            const value = from + (safeTarget - from) * eased;
            current.current = value;
            setDisplayed(value);
            if (time < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [safeTarget, reducedMotion]);

    return displayed;
}
