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
      <label htmlFor={`${id}-${key}`} className="font-medium">
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
        className="w-28 rounded border border-slate-500 bg-white px-2 py-1 text-slate-900"
        onChange={(e) => set(e.target.valueAsNumber)}
      />
    </div>
  );
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
      <fieldset className="flex flex-wrap items-end gap-4">
        <legend className="mb-2 text-lg font-semibold">{t("form.legend")}</legend>
        {numberField("start", s.startSkill, s.setStartSkill)}
        {numberField("target", s.targetSkill, s.setTargetSkill)}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.trainerOnly}
            onChange={(e) => s.setTrainerOnly(e.target.checked)}
          />
          {t("form.trainerOnly")}
        </label>
      </fieldset>
      <p id={errorId} role="alert" className="min-h-6 text-red-700">
        {error === null ? "" : t(`form.errors.${error}`)}
      </p>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">{t("form.prices")}</legend>
        {DEMO_ITEMS.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-36 font-medium">{item.name[locale]}</span>
            <MoneyInput
              label={`${item.name[locale]} · ${t("form.prices")}`}
              value={s.prices[item.id] ?? 0}
              onChange={(v) => s.setPrice(item.id, v)}
            />
            <label className="flex items-center gap-2 text-sm">
              {t("form.owned")}
              <input
                type="number"
                min={0}
                aria-label={`${item.name[locale]} · ${t("form.owned")}`}
                className="w-20 rounded border border-slate-500 bg-white px-2 py-1 text-slate-900"
                value={s.owned[item.id] ?? 0}
                onChange={(e) => s.setOwned(item.id, e.target.valueAsNumber)}
              />
            </label>
          </div>
        ))}
      </fieldset>
      <button
        type="button"
        onClick={s.reset}
        className="self-start rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-200"
      >
        {t("form.reset")}
      </button>
    </form>
  );
}
