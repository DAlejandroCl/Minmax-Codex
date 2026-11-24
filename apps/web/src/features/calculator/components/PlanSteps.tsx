import { useTranslation } from "react-i18next";
import type { Plan } from "@minmax-codex/optimizer";
import { money } from "../format";
import { explainStep, recipeById, recipeName } from "../model";
import type { Locale } from "../model";
import { DifficultyChip } from "./DifficultyChip";
import { RouteBar } from "./RouteBar";

export function PlanSteps({ plan, locale }: { readonly plan: Plan; readonly locale: Locale }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="steps-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="steps-heading" className="text-xl font-bold">
        {t("result.steps")}
      </h3>
      <RouteBar steps={plan.steps} />
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted">{t("result.materials")}</dt>
          <dd className="text-lg tabular-nums">{money(plan.materialsCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("result.recipes")}</dt>
          <dd className="text-lg tabular-nums">
            {money(plan.acquisitionCost + plan.milestoneCost)}
          </dd>
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
              : t(
                  `result.how.${acq.kind === "pattern" && acq.bindsOnPickup ? "patternBop" : acq.kind}`,
                  {
                    cost: acq.kind === "known" ? "" : money(acq.cost),
                  },
                );
          return (
            <li
              key={`${step.recipeId}-${i}`}
              className="panel flex flex-col gap-1.5 border-l-2 border-l-gold p-3"
            >
              <p className="text-lg leading-snug font-bold text-gold [font-family:var(--font-display)]">
                {t("result.stepTitle", {
                  from: step.fromSkill,
                  to: step.toSkill,
                  count: step.crafts,
                  recipe: recipeName(step.recipeId, locale),
                })}
              </p>
              {ex && (
                <>
                  <p className="text-sm tabular-nums">
                    {t("result.stepCost", {
                      cost: money(step.materialsCost),
                      perPoint: money(ex.costPerPoint),
                    })}
                  </p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <DifficultyChip label={t("result.chanceStart")} chance={ex.chanceStart} />
                    <DifficultyChip label={t("result.chanceEnd")} chance={ex.chanceEnd} />
                  </p>
                </>
              )}
              {acq && <p className="text-sm text-muted">{t("result.acquisition", { how })}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
