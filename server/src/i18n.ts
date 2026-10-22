import type { Request, RequestHandler } from "express";
import { localizeDeep, type Locale } from "@life-duel/shared";

/** Resuelve el idioma de presentación sin convertirlo en estado de la partida. */
export function requestLocale(req: Request): Locale {
    const explicit = req.get("x-locale")?.toLowerCase();
    if (explicit === "zh" || explicit === "es") return explicit;
    const accept = req.get("accept-language")?.toLowerCase() ?? "";
    return accept.startsWith("zh") ? "zh" : "es";
}

/**
 * Localiza las respuestas JSON en el borde HTTP. El estado del juego, los IDs,
 * los números y la semilla no se tocan; solo se traducen valores textuales
 * conocidos. Un idioma desconocido cae siempre a español.
 */
export function localeMiddleware(): RequestHandler {
    return (req, res, next) => {
        const locale = requestLocale(req);
        const originalJson = res.json.bind(res);
        res.json = ((body: unknown) => {
            res.setHeader("Content-Language", locale === "zh" ? "zh-Hans" : "es");
            return originalJson(localizeDeep(body, locale));
        }) as typeof res.json;
        next();
    };
}
