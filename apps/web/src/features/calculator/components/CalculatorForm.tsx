import { useId } from "react";
import { useTranslation } from "react-i18next";
import { DEMO_ITEMS, SKILL_MAX, SKILL_MIN } from "../demo-data";
import { validateInputs } from "../model";
import type { Locale } from "../model";
import { useCalculator } from "../store";
import { MoneyInput } from "./MoneyInput";

export function CalculatorForm({ locale }: { readonly locale: Locale }) {
  const { t } = useTranslation();
  const id = useId();
  const s = useCalculator();
  const error = validateInputs(s);
  const errorId = `${id}-error`;
  const numberField = (key: "start" | "target", value: number, set: (v: number) => void) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className="font-medium text-muted">
        {t(`form.${key}`)}
      </label>
      <input
        id={`${id}-${key}`}
        type="number"
        inputMode="numeric"
        min={SKILL_MIN}
        max={SKILL_MAX}
        value={value}
        aria-invalid={error !== null}
        {...(error === null ? {} : { "aria-describedby": errorId })}
        className="field w-28"
        onChange={(e) => set(e.target.valueAsNumber)}
      />
    </div>
  );
  return (
    <form className="flex min-w-0 flex-col gap-6" onSubmit={(e) => e.preventDefault()} noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xl font-bold">{t("form.legend")}</legend>
        <div className="flex flex-wrap gap-4">
          {numberField("start", s.startSkill, s.setStartSkill)}
          {numberField("target", s.targetSkill, s.setTargetSkill)}
        </div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={s.trainerOnly}
            onChange={(e) => s.setTrainerOnly(e.target.checked)}
          />
          <span>{t("form.trainerOnly")}</span>
        </label>
        <p id={errorId} role="alert" className="text-danger empty:hidden">
          {error === null ? "" : t(`form.errors.${error}`)}
        </p>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xl font-bold">{t("form.prices")}</legend>
        <ul className="flex flex-col gap-3">
          {DEMO_ITEMS.map((item) => (
            <li key={item.id} className="panel flex flex-col gap-2 p-3">
              <span className="font-medium">{item.name[locale]}</span>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <MoneyInput
                  label={`${item.name[locale]} · ${t("form.prices")}`}
                  value={s.prices[item.id] ?? 0}
                  onChange={(v) => s.setPrice(item.id, v)}
                />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <span>{t("form.owned")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    aria-label={`${item.name[locale]} · ${t("form.owned")}`}
                    className="field w-20"
                    value={s.owned[item.id] ?? 0}
                    onChange={(e) => s.setOwned(item.id, e.target.valueAsNumber)}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>
      <button type="button" onClick={s.reset} className="btn self-start">
        {t("form.reset")}
      </button>
    </form>
  );
}
