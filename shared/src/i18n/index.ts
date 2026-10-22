import { ZH_CATALOG, ZH_OVERRIDES, ZH_TEMPLATES, ZH_TOKEN_CATALOG } from "./zh.js";

/**
 * Capa de localización de LIFE DUEL.
 *
 * El motor no depende del idioma: la simulación trabaja siempre con los
 * identificadores y los números originales. Esta capa solo transforma texto
 * para presentación, tanto en el cliente (etiquetas estáticas) como en el
 * servidor (respuestas JSON). Nunca se traducen claves de protocolo ni valores
 * de enum: el traductor solo actúa sobre cadenas completas y devuelve el texto
 * original cuando no hay una entrada conocida.
 */
export type Locale = "es" | "zh";

export const LOCALES: ReadonlyArray<{ id: Locale; label: string; short: string }> = [
    { id: "es", label: "Español", short: "ES" },
    { id: "zh", label: "中文（简体）", short: "中文" },
];

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_STORAGE_KEY = "life-duel.locale.v1";

const tokenKey = (value: string): string =>
    value
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\d+(?:[.,]\d+)*/g, "{{n}}")
        .replace(/\s+/g, " ");

const exact = new Map<string, string>();
const tokenized = new Map<string, string>(Object.entries(ZH_TOKEN_CATALOG));

for (const [source, target] of Object.entries(ZH_CATALOG)) {
    exact.set(source, target);
    // Las entradas con números también alimentan un catálogo de plantillas:
    // "Año 2043" y "Año 2044" comparten la misma forma traducible.
    if (/\d/.test(source) && /\d/.test(target)) {
        const key = tokenKey(source);
        const translated = tokenKey(target);
        if (key !== source && !tokenized.has(key)) tokenized.set(key, translated);
    }
}

for (const [source, target] of Object.entries(ZH_OVERRIDES)) exact.set(source, target);

/**
 * Los títulos del historial suelen ser la primera frase de un texto más largo.
 * Este índice permite traducirlos aunque el catálogo solo contenga la escena
 * completa. Solo se aceptan frases con el mismo número de huecos dinámicos.
 */
const firstLine = new Map<string, string>();
const firstSourceLine = (value: string): string | null =>
    value.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? null;
const firstTargetLine = (value: string): string | null =>
    value.match(/^(.+?[。！？])/)?.[1] ?? value.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? null;
const slotsIn = (value: string): number =>
    (value.match(/\{\{x\}\}/g)?.length ?? 0) + (value.match(/\{\{\d+\}\}/g)?.length ?? 0);

for (const [source, target] of [...Object.entries(ZH_CATALOG), ...Object.entries(ZH_OVERRIDES)]) {
    const sourceLine = firstSourceLine(source);
    const targetLine = firstTargetLine(target);
    if (!sourceLine || !targetLine || sourceLine === source) continue;
    if (slotsIn(sourceLine) !== slotsIn(targetLine)) continue;
    if (!firstLine.has(sourceLine)) firstLine.set(sourceLine, targetLine);
}

/** Normaliza espacios sin perder el contenido semántico del texto. */
export function normalizeText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type CompiledTemplate = {
    regex: RegExp;
    target: string;
    staticLength: number;
    source: string;
};

/**
 * Las plantillas narrativas contienen {{x}} en el origen. Se compilan una sola
 * vez para reinsertar los fragmentos capturados (nombres, lugares, cifras)
 * dentro de la traducción sin alterar el orden lógico de la frase.
 */
const compiledTemplates: CompiledTemplate[] = [];
for (const [source, target] of Object.entries(ZH_TEMPLATES)) {
    const chunks = source.split("{{x}}");
    if (chunks.length < 2) continue;
    const pattern = chunks.map(escapeRegex).join("(.+?)");
    compiledTemplates.push({
        regex: new RegExp(`^${pattern}$`, "iu"),
        target,
        staticLength: chunks.join("").length,
        source,
    });
}

/**
 * Los títulos del historial son a menudo la primera frase de una escena más
 * larga. Generamos una variante corta de cada plantilla para que también se
 * localicen sin necesidad de duplicar el texto en el catálogo.
 */
const firstSentenceOf = (value: string, punctuation: RegExp, requireBoundary = true): string | null =>
    value.match(new RegExp(`^(.+?${punctuation.source})${requireBoundary ? "(?:\\s|$)" : ""}`, punctuation.flags))?.[1] ?? null;

const placeholderCount = (value: string): number =>
    (value.match(/\{\{x\}\}/g)?.length ?? 0) + (value.match(/\{\{\d+\}\}/g)?.length ?? 0);

const templateSources = new Set(compiledTemplates.map((template) => template.source));
for (const [source, target] of Object.entries(ZH_TEMPLATES)) {
    const shortSource = firstSentenceOf(source, /[.!?]/);
    const shortTarget =
        firstSentenceOf(target, /[。！？]/, false) ?? firstSentenceOf(target, /[.!?]/);
    if (!shortSource || !shortTarget || shortSource === source) continue;
    if (templateSources.has(shortSource)) continue;
    if (placeholderCount(shortSource) !== placeholderCount(shortTarget)) continue;
    const chunks = shortSource.split("{{x}}");
    if (chunks.length < 2) continue;
    const pattern = chunks.map(escapeRegex).join("(.+?)");
    compiledTemplates.push({
        regex: new RegExp(`^${pattern}$`, "iu"),
        target: shortTarget,
        staticLength: chunks.join("").length,
        source: shortSource,
    });
    templateSources.add(shortSource);
}
// Las plantillas más específicas se prueban primero para evitar que una frase
// genérica capture el texto de otra más concreta.
compiledTemplates.sort((a, b) => b.staticLength - a.staticLength);

const MAX_TRANSLATION_CACHE = 6_000;
const translationCache = new Map<string, string>();

function fillTemplate(target: string, captures: string[], depth: number): string {
    let sequential = 0;
    return target.replace(/\{\{x\}\}|\{\{(\d+)\}\}/g, (_match, position?: string) => {
        const index = position ? Number(position) - 1 : sequential++;
        const value = captures[index] ?? "";
        return translateFragment(value, depth + 1);
    });
}

function matchTemplate(normalized: string, depth: number): string | null {
    if (normalized.length < 6) return null;
    for (const template of compiledTemplates) {
        const match = template.regex.exec(normalized);
        if (match) return fillTemplate(template.target, match.slice(1), depth);
    }
    return null;
}

/**
 * Traduce un fragmento capturado por una plantilla. Los nombres propios que no
 * estén en el catálogo se conservan tal cual; las fechas y las etiquetas
 * conocidas sí se localizan.
 */
function translateFragment(value: string, depth: number): string {
    const normalized = normalizeText(value);
    if (!normalized) return value;
    const direct = exact.get(normalized);
    if (direct !== undefined) return direct;
    if (depth < 5) {
        const nested = matchTemplate(normalized, depth + 1);
        if (nested !== null) return nested;
    }
    if (/\d/.test(normalized)) {
        const templated = tokenized.get(tokenKey(normalized));
        if (templated !== undefined) {
            const numbers = normalized.match(/\d+(?:[.,]\d+)*/g) ?? [];
            let index = 0;
            return templated.replace(/\{\{n\}\}/g, () => numbers[index++] ?? "{{n}}");
        }
    }
    const pieces = normalized.split(/,\s+/);
    if (
        pieces.length > 1 &&
        pieces.length <= 5 &&
        pieces.every((piece) => piece.length < 80 && !/[.!?]/.test(piece))
    ) {
        return pieces.map((piece) => translateFragment(piece, depth + 1)).join("，");
    }

    return localizeDatePhrases(normalized);
}

function translateNumeric(normalized: string): string | null {
    if (!/\d/.test(normalized)) return null;
    const templated = tokenized.get(tokenKey(normalized));
    if (templated === undefined) return null;
    const numbers = normalized.match(/\d+(?:[.,]\d+)*/g) ?? [];
    let index = 0;
    return templated.replace(/\{\{n\}\}/g, () => numbers[index++] ?? "{{n}}");
}

function translateComposite(normalized: string): string | null {
    const parts = normalized.split(/\s+[·|]\s+/);
    if (parts.length > 1 && parts.every((part) => part.length < 120)) {
        const translated = parts.map((part) => translateFragment(part, 1));
        if (translated.some((part, index) => part !== parts[index])) return translated.join(" · ");
    }
    const pieces = normalized.split(/,\s+/);
    if (
        pieces.length > 1 &&
        pieces.length <= 5 &&
        pieces.every((piece) => piece.length < 60 && !/[.!?]/.test(piece))
    ) {
        const translated = pieces.map((piece) => translateFragment(piece, 1));
        if (translated.some((piece, index) => piece !== pieces[index])) return translated.join("，");
    }

    const delta = normalized.match(/^(.+?)\s+([+-]\d+)$/);
    if (delta) {
        const label = translateFragment(delta[1], 1);
        if (label !== delta[1]) return `${label} ${delta[2]}`;
    }
    return null;
}

function translateCore(normalized: string): string | null {
    const direct = exact.get(normalized);
    if (direct !== undefined) return direct;

    const headline = firstLine.get(normalized);
    if (headline !== undefined) return headline;

    const narrative = matchTemplate(normalized, 0);
    if (narrative !== null) return narrative;

    const numeric = translateNumeric(normalized);
    if (numeric !== null) return numeric;

    const composite = translateComposite(normalized);
    if (composite !== null) return composite;

    const dated = localizeDatePhrases(normalized);
    if (dated !== normalized) {
        const datedExact = exact.get(dated);
        if (datedExact !== undefined) return datedExact;
        const datedTemplate = matchTemplate(dated, 0);
        if (datedTemplate !== null) return datedTemplate;
        return translateNumeric(dated) ?? dated;
    }
    return null;
}

const MONTH_NUMBER: Record<string, string> = {
    enero: "1", febrero: "2", marzo: "3", abril: "4", mayo: "5", junio: "6",
    julio: "7", agosto: "8", septiembre: "9", octubre: "10", noviembre: "11", diciembre: "12",
    ene: "1", feb: "2", mar: "3", abr: "4", may: "5", jun: "6",
    jul: "7", ago: "8", sep: "9", oct: "10", nov: "11", dic: "12",
};

/** Reescribe fechas españolas dentro de una frase más larga. */
export function localizeDatePhrases(value: string): string {
    let result = value;
    result = result.replace(
        /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi,
        (_match, day: string, month: string, year: string) => `${year}年${MONTH_NUMBER[month.toLowerCase()]}月${day}日`,
    );
    result = result.replace(
        /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi,
        (_match, month: string, year: string) => `${year}年${MONTH_NUMBER[month.toLowerCase()]}月`,
    );
    result = result.replace(
        /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{4})\b/gi,
        (_match, month: string, year: string) => `${year}年${MONTH_NUMBER[month.toLowerCase()]}月`,
    );
    return result;
}

/**
 * Traduce una cadena completa. No intenta traducir fragmentos de identificadores
 * ni texto que ya esté en chino. Devuelve la entrada original como reserva.
 */
export function translateText(value: string, locale: Locale): string {
    if (locale !== "zh" || !value) return value;
    const normalized = normalizeText(value);
    if (!normalized) return value;
    const cached = translationCache.get(normalized);
    if (cached !== undefined) return cached;
    const translated = translateCore(normalized);
    if (translated === null) return value;
    if (translationCache.size >= MAX_TRANSLATION_CACHE) translationCache.clear();
    translationCache.set(normalized, translated);
    return translated;
}

export function hasTranslation(value: string, locale: Locale = "zh"): boolean {
    if (locale !== "zh") return true;
    const normalized = normalizeText(value);
    if (exact.has(normalized)) return true;
    if (/\d/.test(normalized) && tokenized.has(tokenKey(normalized))) return true;
    return compiledTemplates.some((template) => template.regex.test(normalized));
}

/** Número aproximado de cadenas traducidas disponibles (para diagnóstico). */
export function zhCatalogSize(): number {
    return exact.size + tokenized.size + compiledTemplates.length;
}

const PROTOCOL_KEYS = new Set([
    "id", "ids", "code", "token", "worldSeed", "seed", "status", "kind", "type",
    "role", "sex", "gender", "country", "countryCode", "birthCountry", "currentCountry",
    "currency", "locale", "action", "targetId", "assetId", "decisionId", "optionId",
    "roomCode", "mode", "slot", "category", "source", "difficulty", "focus",
    "educationLevel", "employmentStatus", "risk", "tone", "icon", "href", "url",
    "path", "color", "className", "createdAt", "updatedAt", "deadlineAt", "dueYear",
    "year", "month", "age", "idempotencyKey", "eventId", "momentId", "turn",
    "email", "key", "givenName", "surname", "partnerName", "tenantName",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const URL_VALUE = /^(?:https?:|data:|blob:|\/api\/|\.\/|\.\.\/)/;

function shouldLocalizeString(value: string, key: string | null): boolean {
    if (!value || value.length > 2_000) return false;
    if (key && PROTOCOL_KEYS.has(key)) return false;
    if (ISO_DATE.test(value) || URL_VALUE.test(value)) return false;
    return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(value);
}

/**
 * Recorre una respuesta JSON y traduce solo sus valores textuales. Se usa en el
 * servidor para presentar la misma partida en distintos idiomas sin duplicar
 * estado ni tocar la semilla, los IDs o los números.
 */
export function localizeDeep<T>(value: T, locale: Locale, depth = 0): T {
    if (locale !== "zh" || depth > 24 || value === null || value === undefined) return value;
    if (typeof value === "string") return value as T;
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((item) => localizeDeep(item, locale, depth + 1)) as T;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (typeof item === "string") {
            result[key] = shouldLocalizeString(item, key) ? translateText(item, locale) : item;
        } else {
            result[key] = localizeDeep(item, locale, depth + 1);
        }
    }
    return result as T;
}

export * from "./zh.js";
