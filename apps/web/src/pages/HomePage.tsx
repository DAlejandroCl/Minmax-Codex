import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

export function HomePage() {
  const { t } = useTranslation();
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex max-w-3xl flex-col gap-6 p-4 outline-none sm:p-6"
    >
      <title>{t("home.pageTitle")}</title>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-4xl font-bold text-gold">Minmax Codex</h1>
        <LanguageSwitcher />
      </header>
      <p className="text-lg">{t("home.tagline")}</p>
      <nav aria-label={t("home.navLabel")} className="flex flex-wrap gap-3">
        <Link to="/calculadora" className="btn btn-primary inline-block no-underline">
          {t("home.openCalculator")}
        </Link>
        <Link to="/armory" className="btn inline-block no-underline">
          {t("home.openArmory")}
        </Link>
      </nav>
    </main>
  );
}
