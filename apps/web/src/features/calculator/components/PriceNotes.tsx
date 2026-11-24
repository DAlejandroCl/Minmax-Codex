import { useTranslation } from "react-i18next";
import type { ItemInfo } from "../demo-data";
import type { Locale } from "../model";
import { ageInDays, outlierFactor, priceFlags } from "../prices";
import type { PriceMeta } from "../prices";

interface Props {
  readonly item: ItemInfo;
  readonly price: number;
  readonly meta: PriceMeta | undefined;
  readonly now: number;
  readonly locale: Locale;
  readonly onRestore: () => void;
}

/** Edad del precio, marcas de obsoleto / atípico y botón para volver al precio original. */
export function PriceNotes({ item, price, meta, now, locale, onRestore }: Props) {
  const { t } = useTranslation();
  if (!meta) return null;
  const flags = priceFlags({
    price,
    reference: item.reference,
    meta,
    now,
    perishable: item.source === "auction",
  });
  const showAge = item.source === "auction" && meta.observedAt !== null && !meta.overridden;
  const badge =
    "inline-flex items-center gap-1 rounded border border-diff-yellow px-1.5 text-diff-yellow";
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      {showAge && meta.observedAt !== null && (
        <span>{t("price.observed", { count: ageInDays(meta.observedAt, now) })}</span>
      )}
      {flags.includes("stale") && (
        <span className={badge}>
          <span aria-hidden="true">⚠</span>
          {t("price.stale")}
        </span>
      )}
      {flags.includes("outlier") && (
        <span className={badge}>
          <span aria-hidden="true">⚠</span>
          {t("price.outlier", { factor: outlierFactor(price, item.reference) })}
        </span>
      )}
      {meta.overridden && <span className="text-gold">{t("price.manual")}</span>}
      {(meta.overridden || price !== item.defaultPrice) && (
        <button type="button" className="underline hover:text-gold" onClick={onRestore}>
          {t("price.restore")}
          <span className="sr-only"> {item.name[locale]}</span>
        </button>
      )}
    </p>
  );
}
