import { useEffect, useState } from "react";

function currentMatch(query: string): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
}

/**
 * Escucha una media query desde React. Se usa para elegir una composición
 * distinta —no para esconder dos copias de la interfaz— y así no duplicar
 * controles, regiones accesibles ni peticiones.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => currentMatch(query));

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
        const media = window.matchMedia(query);
        const update = () => setMatches(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, [query]);

    return matches;
}
