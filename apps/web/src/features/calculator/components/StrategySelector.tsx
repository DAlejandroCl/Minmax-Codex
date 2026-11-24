import { STRATEGIES } from "@minmax-codex/optimizer";
import type { Strategy } from "@minmax-codex/optimizer";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { money } from "../format";
import type { Plans } from "../model";

interface Props {
  readonly plans: Plans | null;
  readonly value: Strategy;
  readonly onChange: (strategy: Strategy) => void;
}

/** Elige la estrategia y compara las cuatro: cada opción muestra su coste y sus crafteos. */
export function StrategySelector({ plans, value, onChange }: Props) {
  const { t } = useTranslation();
  const name = useId();
  const cheapest = plans?.cheapest ?? null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xl font-bold [font-family:var(--font-display)]">
        {t("strategy.legend")}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {STRATEGIES.map((strategy) => {
          const plan = plans?.[strategy] ?? null;
          const checked = strategy === value;
          const extra =
            plan && cheapest && strategy !== "cheapest" && cheapest.totalCost > 0
              ? Math.round((Number(plan.totalCost) / Number(cheapest.totalCost) - 1) * 100)
              : 0;
          const hintId = `${name}-${strategy}`;
          return (
            <label
              key={strategy}
              className={`panel flex cursor-pointer flex-col gap-1 p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold ${checked ? "!border-gold bg-raised" : ""}`}
            >
              <span className="flex items-start gap-2">
                <input
                  type="radio"
                  name={name}
                  value={strategy}
                  checked={checked}
                  aria-describedby={hintId}
                  onChange={() => onChange(strategy)}
                  className="mt-1 shrink-0 accent-[var(--color-gold)]"
                />
                <span className="font-bold">{t(`strategy.${strategy}.name`)}</span>
              </span>
              <span id={hintId} className="flex flex-col gap-0.5 pl-6 text-sm">
                <span className="text-muted">{t(`strategy.${strategy}.hint`)}</span>
                <span className="tabular-nums">
                  {plans === null
                    ? "—"
                    : plan === null
                      ? t("strategy.noRoute")
                      : `${money(plan.totalCost)} · ${t("strategy.crafts", { count: Math.max(1, Math.round(plan.expectedCrafts)) })}`}
                </span>
                {extra > 0 && (
                  <span className="text-diff-yellow">
                    {t("strategy.extraCost", { percent: extra })}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
