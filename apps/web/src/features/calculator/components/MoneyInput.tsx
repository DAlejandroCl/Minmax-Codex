import { useId } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  readonly label: string;
  /** Valor en cobre. */
  readonly value: number;
  readonly onChange: (copper: number) => void;
}

const toInt = (raw: string): number => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Entrada de dinero en oro / plata / cobre; guarda cobre. */
export function MoneyInput({ label, value, onChange }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const gold = Math.floor(value / 10_000);
  const silver = Math.floor((value % 10_000) / 100);
  const cop = value % 100;
  const field = (suffix: string, text: string, current: number, factor: number, max?: number) => (
    <label className="flex items-center gap-1 text-sm" htmlFor={`${id}-${suffix}`}>
      <input
        id={`${id}-${suffix}`}
        type="number"
        inputMode="numeric"
        min={0}
        {...(max === undefined ? {} : { max })}
        aria-label={`${label} — ${text}`}
        className="w-20 rounded border border-slate-500 bg-white px-2 py-1 text-slate-900"
        value={current}
        onChange={(e) => {
          const next = toInt(e.target.value) * factor;
          onChange(value - current * factor + next);
        }}
      />
      <span aria-hidden="true">{text.charAt(0).toLowerCase()}</span>
    </label>
  );
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {field("g", t("form.gold"), gold, 10_000)}
      {field("s", t("form.silver"), silver, 100, 99)}
      {field("c", t("form.copper"), cop, 1, 99)}
    </div>
  );
}
