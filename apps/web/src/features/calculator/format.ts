import { copper, formatMoney } from "@minmax-codex/shared";
import type { ShoppingList } from "./model";

export const money = (value: number): string => formatMoney(copper(Math.round(value)));

export const percent = (value: number): string => `${Math.round(value * 100)} %`;

export interface ShoppingTextLabels {
  readonly title: string;
  readonly total: string;
  readonly missing: string;
}

/** Texto plano de la lista de compras, listo para pegar (RF-PRO-06). Solo incluye lo que falta. */
export function buildShoppingText(list: ShoppingList, labels: ShoppingTextLabels): string {
  const lines = list.rows
    .filter((r) => r.missing > 0)
    .map((r) => `${r.missing}× ${r.name} — ${money(r.subtotal)}`);
  return [labels.title, ...lines, `${labels.total}: ${money(list.total)}`].join("\n");
}
