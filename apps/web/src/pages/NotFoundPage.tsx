import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex max-w-3xl flex-col gap-4 p-4 outline-none sm:p-6"
    >
      <title>{t("notFound.pageTitle")}</title>
      <h1 className="text-3xl font-bold text-gold">{t("notFound.title")}</h1>
      <p className="text-muted">{t("notFound.body")}</p>
      <Link to="/" className="btn btn-primary self-start no-underline">
        {t("notFound.home")}
      </Link>
    </main>
  );
}
