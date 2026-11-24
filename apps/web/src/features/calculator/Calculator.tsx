import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, useLocale } from "../../components/LanguageSwitcher";
import { ToastRegion } from "../toast/ToastRegion";
import { CalculatorForm } from "./components/CalculatorForm";
import { PlanSteps } from "./components/PlanSteps";
import { ShoppingListView } from "./components/ShoppingListView";
import { StatePanel } from "./components/StatePanel";
import { DEMO_ITEMS } from "./demo-data";
import { money } from "./format";
import { buildShoppingList } from "./model";
import { priceFlags } from "./prices";
import { useCalculator } from "./store";
import { usePlan } from "./use-plan";

const skipLink =
  "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-gold focus:px-3 focus:py-2 focus:text-gold-ink";

export default function Calculator() {
  const locale = useLocale();
  const { t } = useTranslation();
  const inputs = useCalculator();
  const [now] = useState(() => Date.now());
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
  const [state, retry] = usePlan(planInputs);
  const plan = state.status === "ready" ? state.plan : null;

  const list = useMemo(
    () => (plan ? buildShoppingList(plan, planInputs, locale) : null),
    [plan, planInputs, locale],
  );

  // Precios dudosos (obsoletos o atípicos) de los ítems que el plan realmente compra.
  const flaggedItems = useMemo(() => {
    if (!plan) return [];
    return DEMO_ITEMS.filter((item) => {
      const meta = inputs.priceMeta[item.id];
      return (
        plan.purchases.has(item.id) &&
        meta !== undefined &&
        priceFlags({
          price: inputs.prices[item.id] ?? 0,
          reference: item.reference,
          meta,
          now,
          perishable: item.source === "auction",
        }).length > 0
      );
    });
  }, [plan, inputs.priceMeta, inputs.prices, now]);
  const flaggedIds = useMemo(() => new Set(flaggedItems.map((i) => i.id)), [flaggedItems]);

  const announcement =
    state.status === "computing"
      ? t("result.computing")
      : plan
        ? t("state.ready", { cost: money(plan.totalCost) })
        : "";

  return (
    <>
      <title>{t("pageTitle")}</title>
      <a href="#contenido" className={skipLink}>
        {t("skip.main")}
      </a>
      <a href="#plan" className={`${skipLink} focus:left-40`}>
        {t("skip.plan")}
      </a>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 outline-none sm:p-6"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-gold">{t("title")}</h1>
          <LanguageSwitcher />
        </header>
        <p role="note" className="panel border-l-4 border-l-diff-orange p-3 text-sm">
          {t("demoNotice")}
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <CalculatorForm locale={locale} now={now} />
          <section
            id="plan"
            tabIndex={0}
            aria-labelledby="result-heading"
            aria-busy={state.status === "computing"}
            className="panel flex min-w-0 flex-col gap-6 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          >
            <h2 id="result-heading" className="text-2xl font-bold">
              {t("result.heading")}
            </h2>
            <p role="status" className="sr-only">
              {announcement}
            </p>

            {state.status === "invalid" && (
              <StatePanel tone="warning" title={t("state.invalid.title")}>
                {t("state.invalid.body")}
              </StatePanel>
            )}
            {state.status === "error" && (
              <StatePanel
                tone="error"
                title={t("state.error.title")}
                action={{ label: t("state.error.retry"), onClick: retry }}
              >
                {t("state.error.body")}
              </StatePanel>
            )}
            {state.status === "ready" && state.plan === null && (
              <StatePanel
                tone="info"
                title={t("state.none.title")}
                {...(inputs.trainerOnly
                  ? {
                      action: {
                        label: t("state.none.allowPatterns"),
                        onClick: () => inputs.setTrainerOnly(false),
                      },
                    }
                  : {})}
              >
                {inputs.trainerOnly ? t("state.none.bodyTrainer") : t("state.none.body")}
              </StatePanel>
            )}

            {plan && (
              <>
                <p className="flex flex-col">
                  <span className="text-sm text-muted">{t("result.total")}</span>
                  <strong className="text-3xl tabular-nums text-gold [font-family:var(--font-display)]">
                    {money(plan.totalCost)}
                  </strong>
                </p>
                {flaggedItems.length > 0 && (
                  <StatePanel
                    tone="warning"
                    title={t("price.reviewInPlan", {
                      count: flaggedItems.length,
                      names: flaggedItems.map((i) => i.name[locale]).join(", "),
                    })}
                  >
                    {t("price.reviewHint")}
                  </StatePanel>
                )}
                <PlanSteps plan={plan} locale={locale} />
                {list && <ShoppingListView list={list} flagged={flaggedIds} />}
              </>
            )}
          </section>
        </div>
      </main>
      <ToastRegion />
    </>
  );
}
