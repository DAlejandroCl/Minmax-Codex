import { useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, LOCALES } from "../../i18n";
import { CalculatorForm } from "./components/CalculatorForm";
import { PlanSteps } from "./components/PlanSteps";
import { ShoppingListView } from "./components/ShoppingListView";
import { money } from "./format";
import { buildShoppingList } from "./model";
import type { Locale } from "./model";
import { useCalculator } from "./store";
import { usePlan } from "./use-plan";

function Inner({
  locale,
  setLocale,
}: {
  readonly locale: Locale;
  readonly setLocale: (l: Locale) => void;
}) {
  const { t } = useTranslation();
  const inputs = useCalculator();
  // Solo los datos (no las acciones) determinan el plan.
  const planInputs = useMemo(
    () => ({
      startSkill: inputs.startSkill,
      targetSkill: inputs.targetSkill,
      trainerOnly: inputs.trainerOnly,
      prices: inputs.prices,
      owned: inputs.owned,
    }),
    [inputs.startSkill, inputs.targetSkill, inputs.trainerOnly, inputs.prices, inputs.owned],
  );
  const state = usePlan(planInputs);
  const list = useMemo(
    () =>
      state.status === "ready" && state.plan
        ? buildShoppingList(state.plan, planInputs, locale)
        : null,
    [state, planInputs, locale],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold text-gold">{t("title")}</h1>
        <div role="group" aria-label="Idioma / Language" className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={l === locale}
              onClick={() => setLocale(l)}
              className="btn px-2.5 py-1 aria-pressed:border-gold aria-pressed:bg-gold aria-pressed:text-gold-ink"
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <p role="note" className="panel border-l-4 border-l-diff-orange p-3 text-sm">
        {t("demoNotice")}
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <CalculatorForm locale={locale} />
        <section
          aria-labelledby="result-heading"
          className="panel flex min-w-0 flex-col gap-6 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
        >
          <h2 id="result-heading" className="text-2xl font-bold">
            {t("result.heading")}
          </h2>
          <div role="status" aria-live="polite">
            {state.status === "computing" && t("result.computing")}
            {state.status === "error" && t("result.error")}
            {state.status === "ready" && state.plan === null && t("result.none")}
            {state.status === "ready" && state.plan && (
              <p className="flex flex-col">
                <span className="text-sm text-muted">{t("result.total")}</span>
                <strong className="text-3xl tabular-nums text-gold [font-family:var(--font-display)]">
                  {money(state.plan.totalCost)}
                </strong>
              </p>
            )}
          </div>
          {state.status === "ready" && state.plan && (
            <>
              <PlanSteps plan={state.plan} locale={locale} />
              {list && <ShoppingListView list={list} />}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Calculator() {
  const [locale, setLocale] = useState<Locale>("es");
  const change = (l: Locale): void => {
    void i18n.changeLanguage(l);
    setLocale(l);
  };
  return (
    <I18nextProvider i18n={i18n}>
      <Inner locale={locale} setLocale={change} />
    </I18nextProvider>
  );
}
