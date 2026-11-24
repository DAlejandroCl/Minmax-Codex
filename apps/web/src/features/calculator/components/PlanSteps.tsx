import { useTranslation } from "react-i18next";
import type { Plan } from "@minmax-codex/optimizer";
import { money, percent } from "../format";
import { explainStep, recipeById, recipeName } from "../model";
import type { Locale } from "../model";

export function PlanSteps({ plan, locale }: { readonly plan: Plan; readonly locale: Locale }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="steps-heading" className="flex flex-col gap-3">
      <h3 id="steps-heading" className="text-lg font-semibold">
        {t("result.steps")}
      </h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-700">{t("result.materials")}</dt>
          <dd>{money(plan.materialsCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-700">{t("result.recipes")}</dt>
          <dd>{money(plan.acquisitionCost + plan.milestoneCost)}</dd>
        </div>
      </dl>
      <ol className="flex flex-col gap-3">
        {plan.steps.map((step, i) => {
          const recipe = recipeById(step.recipeId);
          const ex = recipe ? explainStep(step, recipe) : null;
          const acq = recipe?.acquisition;
          const how =
            acq === undefined
              ? ""
              : t(`result.how.${acq.kind}`, { cost: acq.kind === "known" ? "" : money(acq.cost) });
          return (
            <li key={`${step.recipeId}-${i}`} className="rounded border border-slate-400 p-3">
              <p className="font-medium">
                {t("result.stepTitle", {
                  from: step.fromSkill,
                  to: step.toSkill,
                  count: step.crafts,
                  recipe: recipeName(step.recipeId, locale),
                })}
              </p>
              {ex && (
                <p className="text-sm text-slate-800">
                  {t("result.stepExplain", {
                    cost: money(step.materialsCost),
                    perPoint: money(ex.costPerPoint),
                    start: percent(ex.chanceStart),
                    end: percent(ex.chanceEnd),
                  })}
                </p>
              )}
              {acq && <p className="text-sm text-slate-800">{t("result.acquisition", { how })}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
