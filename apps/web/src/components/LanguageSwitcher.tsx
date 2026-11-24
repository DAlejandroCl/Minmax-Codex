import { useTranslation } from "react-i18next";
import { LOCALES } from "../i18n";
import type { Locale } from "../features/calculator/model";

/** Idioma actual de la interfaz; i18next es la única fuente de verdad. */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language === "en" ? "en" : "es";
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const locale = useLocale();
  return (
    <div role="group" aria-label="Idioma / Language" className="flex gap-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => void i18n.changeLanguage(l)}
          className="btn px-2.5 py-1 aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-gold-ink"
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
