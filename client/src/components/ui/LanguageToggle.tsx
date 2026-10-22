import { Languages } from "lucide-react";
import { LOCALES } from "@life-duel/shared";
import { useLocale } from "../../i18n/LocaleProvider";

/**
 * Selector de idioma explícito. No traduce identificadores ni estado: solo
 * cambia la capa de presentación y se guarda en localStorage.
 */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
    const { locale, setLocale } = useLocale();
    return (
        <div className="language-toggle" role="group" aria-label="Idioma / 语言" data-no-i18n>
            <Languages className="language-toggle-icon" aria-hidden="true" />
            {LOCALES.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    className={locale === item.id ? "is-active" : undefined}
                    aria-pressed={locale === item.id}
                    aria-label={item.id === "zh" ? "中文（简体）" : "Español"}
                    onClick={() => setLocale(item.id)}
                >
                    {item.short}
                </button>
            ))}
            {compact ? null : <span className="language-toggle-label">{locale === "zh" ? "语言" : "Idioma"}</span>}
        </div>
    );
}
