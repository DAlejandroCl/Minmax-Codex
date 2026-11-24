import { useTranslation } from "react-i18next";
import { useToasts } from "../../toast/store";
import { buildShoppingText, money } from "../format";
import type { ShoppingList } from "../model";

export function ShoppingListView({
  list,
  flagged,
}: {
  readonly list: ShoppingList;
  readonly flagged: ReadonlySet<number>;
}) {
  const { t } = useTranslation();
  const push = useToasts((state) => state.push);

  const copy = async (): Promise<void> => {
    const text = buildShoppingText(list, {
      title: t("shopping.heading"),
      total: t("shopping.total"),
      missing: t("shopping.missing"),
    });
    try {
      await navigator.clipboard.writeText(text);
      push("success", t("shopping.copied"));
    } catch {
      push("error", t("shopping.copyFailed"));
    }
  };

  return (
    <section aria-labelledby="shopping-heading" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="shopping-heading" className="text-xl font-bold">
          {t("shopping.heading")}
        </h3>
        <button type="button" onClick={() => void copy()} className="btn btn-primary">
          {t("shopping.copy")}
        </button>
      </div>
      {list.rows.every((r) => r.missing === 0) ? (
        <p className="text-sm text-muted">{t("shopping.allOwned")}</p>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label={t("shopping.tableRegion")}
        >
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm [overflow-wrap:normal]">
            <caption className="sr-only">{t("shopping.heading")}</caption>
            <thead>
              <tr className="border-b border-line-strong text-muted">
                <th scope="col" className="py-1 pr-3">
                  {t("shopping.item")}
                </th>
                <th scope="col" className="py-1 pr-3">
                  {t("shopping.source")}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t("shopping.needed")}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t("shopping.have")}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t("shopping.missing")}
                </th>
                <th scope="col" className="py-1 pr-3 text-right">
                  {t("shopping.price")}
                </th>
                <th scope="col" className="py-1 text-right">
                  {t("shopping.subtotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.itemId} className="border-b border-line">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {r.name}
                    {flagged.has(r.itemId) && (
                      <span className="ml-2 text-diff-yellow" title={t("shopping.flagged")}>
                        <span aria-hidden="true">⚠</span>
                        <span className="sr-only">{t("shopping.flagged")}</span>
                      </span>
                    )}
                  </th>
                  <td
                    className={`py-1 pr-3 ${r.source === "auction" ? "text-q-rare" : "text-q-common"}`}
                  >
                    {t(`shopping.${r.source}`)}
                  </td>
                  <td className="py-1 pr-3 text-right">{r.needed}</td>
                  <td className="py-1 pr-3 text-right">{r.owned}</td>
                  <td className="py-1 pr-3 text-right">{r.missing}</td>
                  <td className="py-1 pr-3 text-right tabular-nums">{money(r.unitPrice)}</td>
                  <td className="py-1 text-right">{money(r.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={6} className="py-2 text-right">
                  {t("shopping.total")}
                </th>
                <td className="py-2 text-right font-bold text-gold">{money(list.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
