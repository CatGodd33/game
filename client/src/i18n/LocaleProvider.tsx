import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    LOCALES,
    translateText,
    type Locale,
} from "@life-duel/shared";


interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    toggleLocale: () => void;
    t: (value: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function initialLocale(): Locale {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query === "zh" || query === "es") return query;
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "es") return stored;
    if (window.navigator.language.toLowerCase().startsWith("zh")) return "zh";
    return DEFAULT_LOCALE;
}

/* -------------------------------------------------------------------------- */
/* Traducción de la interfaz ya renderizada                                    */
/* -------------------------------------------------------------------------- */

interface TextRecord {
    source: string;
    translated: string;
}

const textRecords = new WeakMap<Node, TextRecord>();
const attributeRecords = new WeakMap<Element, Map<string, TextRecord>>();
const TRANSLATED_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-description", "alt"];
const SKIP_SELECTOR = "script, style, noscript, code, pre, textarea, [data-no-i18n], .no-i18n";

function shouldSkip(node: Node): boolean {
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return !!element?.closest?.(SKIP_SELECTOR);
}

function splitWhitespace(value: string): { leading: string; core: string; trailing: string } {
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    const core = value.slice(leading.length, value.length - trailing.length);
    return { leading, core, trailing };
}

function translateTextNode(node: Text, locale: Locale): void {
    if (shouldSkip(node)) return;
    const raw = node.data;
    if (!raw.trim()) return;
    const record = textRecords.get(node);
    if (locale === "es") {
        if (record && raw === record.translated) node.data = record.source;
        return;
    }
    const { leading, core, trailing } = splitWhitespace(raw);
    if (!core) return;
    // Si el nodo ya está traducido, no se vuelve a traducir ni se pierde el
    // original guardado cuando React vuelve a renderizar el mismo contenido.
    if (record && raw === record.translated) return;
    const translated = translateText(core, locale);
    if (translated === core) {
        if (record) textRecords.delete(node);
        return;
    }
    const next = `${leading}${translated}${trailing}`;
    textRecords.set(node, { source: raw, translated: next });
    node.data = next;
}

function translateAttributes(element: Element, locale: Locale): void {
    if (shouldSkip(element)) return;
    let records = attributeRecords.get(element);
    if (!records) {
        records = new Map();
        attributeRecords.set(element, records);
    }
    for (const name of TRANSLATED_ATTRIBUTES) {
        const raw = element.getAttribute(name);
        if (!raw?.trim()) continue;
        const record = records.get(name);
        if (locale === "es") {
            if (record && raw === record.translated) element.setAttribute(name, record.source);
            continue;
        }
        if (record && raw === record.translated) continue;
        const translated = translateText(raw, locale);
        if (translated === raw) {
            records.delete(name);
            continue;
        }
        records.set(name, { source: raw, translated });
        element.setAttribute(name, translated);
    }
}
const elementTextRecords = new WeakMap<Element, TextRecord>();

/**
 * React puede partir una fecha o una cantidad en varios nodos de texto
 * ("enero de " + "2026"). Cuando un elemento no contiene otros elementos,
 * traducimos su texto completo y conservamos el original para poder volver.
 */
function translateElementText(element: Element, locale: Locale): boolean {
    if (element.childElementCount > 0 || shouldSkip(element)) return false;
    const raw = element.textContent ?? "";
    if (!raw.trim() || !/\d/.test(raw)) return false;
    const record = elementTextRecords.get(element);
    if (locale === "es") {
        if (record && raw === record.translated) element.textContent = record.source;
        return false;
    }
    if (record && raw === record.translated) return true;
    const translated = translateText(raw, locale);
    if (translated === raw) {
        if (record) elementTextRecords.delete(element);
        return false;
    }
    elementTextRecords.set(element, { source: raw, translated });
    element.textContent = translated;
    return true;
}


function walk(root: Node, locale: Locale): void {
    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text, locale);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
        translateAttributes(root as Element, locale);
        translateElementText(root as Element, locale);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let current = walker.nextNode();
    while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text, locale);
        else {
            translateAttributes(current as Element, locale);
            translateElementText(current as Element, locale);
        }
        current = walker.nextNode();
    }
}

function restoreAll(locale: Locale): void {
    if (typeof document === "undefined") return;
    walk(document.body, locale);
    const title = document.querySelector("title");
    if (title?.firstChild?.nodeType === Node.TEXT_NODE) translateTextNode(title.firstChild as Text, locale);
}

let observer: MutationObserver | null = null;
let currentLocale: Locale = DEFAULT_LOCALE;

function ensureObserver(locale: Locale): void {
    currentLocale = locale;
    if (observer) return;
    observer = new MutationObserver((mutations) => {
        if (currentLocale !== "zh") return;
        for (const mutation of mutations) {
            if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
                translateTextNode(mutation.target as Text, currentLocale);
            } else if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
                translateAttributes(mutation.target as Element, currentLocale);
            } else {
                for (const node of mutation.addedNodes) walk(node, currentLocale);
            }
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATED_ATTRIBUTES,
    });
}

function applyDocumentLocale(locale: Locale): void {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "es";
    document.documentElement.dataset.locale = locale;
    const title = document.querySelector("title");
    if (title) {
        const original = title.getAttribute("data-original-title");
        const source = original ?? title.textContent ?? "LIFE DUEL";
        if (!original) title.setAttribute("data-original-title", source);
        title.textContent = locale === "zh" ? translateText(source, locale) : source;
    }
    if (locale === "zh") walk(document.body, "zh");
    else restoreAll("es");
}

/* -------------------------------------------------------------------------- */

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);
    useEffect(() => {
        if (import.meta.env.DEV) {
            (window as unknown as { __lifeDuelTranslate?: (value: string) => string }).__lifeDuelTranslate = (value) => translateText(value, locale);
        }
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch {
            // La preferencia es una mejora, no un requisito para jugar.
        }
    }, []);

    const toggleLocale = useCallback(() => {
        setLocale(locale === "zh" ? "es" : "zh");
    }, [locale, setLocale]);

    useEffect(() => {
        try {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch {
            // Preferencia opcional.
        }
        ensureObserver(locale);
        applyDocumentLocale(locale);
    }, [locale]);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === LOCALE_STORAGE_KEY && (event.newValue === "es" || event.newValue === "zh")) {
                setLocaleState(event.newValue);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const value = useMemo<LocaleContextValue>(
        () => ({
            locale,
            setLocale,
            toggleLocale,
            t: (text: string) => translateText(text, locale),
        }),
        [locale, setLocale, toggleLocale],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
    const context = useContext(LocaleContext);
    if (!context) throw new Error("useLocale debe usarse dentro de LocaleProvider.");
    return context;
}

export { LOCALES };
