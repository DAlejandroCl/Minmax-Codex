import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildShoppingText, money } from "../format";
import type { ShoppingList } from "../model";

export function ShoppingListView({ list }: { readonly list: ShoppingList }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  const copy = async (): Promise<void> => {
    const text = buildShoppingText(list, {
      title: t("shopping.heading"),
      total: t("shopping.total"),
      missing: t("shopping.missing"),
    });
    try {
      await navigator.clipboard.writeText(text);
      setMessage(t("shopping.copied"));
    } catch {
      setMessage(t("shopping.copyFailed"));
    }
  };

  return (
    <section aria-labelledby="shopping-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="shopping-heading" className="text-lg font-semibold">
          {t("shopping.heading")}
        </h3>
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700"
        >
          {t("shopping.copy")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {message}
      </p>
      {list.rows.length === 0 ? (
        <p>{t("shopping.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{t("shopping.heading")}</caption>
            <thead>
              <tr className="border-b border-slate-500">
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
                <tr key={r.itemId} className="border-b border-slate-300">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {r.name}
                  </th>
                  <td className="py-1 pr-3">{t(`shopping.${r.source}`)}</td>
                  <td className="py-1 pr-3 text-right">{r.needed}</td>
                  <td className="py-1 pr-3 text-right">{r.owned}</td>
                  <td className="py-1 pr-3 text-right">{r.missing}</td>
                  <td className="py-1 pr-3 text-right">{money(r.unitPrice)}</td>
                  <td className="py-1 text-right">{money(r.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={6} className="py-2 text-right">
                  {t("shopping.total")}
                </th>
                <td className="py-2 text-right font-semibold">{money(list.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
