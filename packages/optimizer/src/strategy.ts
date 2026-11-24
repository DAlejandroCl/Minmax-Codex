import type { Copper } from "@minmax-codex/shared";
import type { ItemId, PlanInput, Recipe } from "./types.js";

/**
 * Estrategias de plan (RF-PRO-07):
 * - `cheapest`: menor coste total esperado (desempata por menos crafteos).
 * - `fewest-crafts`: menos crafteos esperados (desempata por menor coste).
 * - `no-bop`: como `cheapest`, sin patrones que se ligan al recogerlos (no se pueden comprar).
 * - `vendor-only`: como `cheapest`, usando solo materiales que venden los PNJ.
 */
export const STRATEGIES = ["cheapest", "fewest-crafts", "no-bop", "vendor-only"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export interface Restricted {
  readonly recipes: readonly Recipe[];
  readonly prices: ReadonlyMap<ItemId, Copper>;
}

/** Aplica el filtro de recetas y de precios que implica la estrategia. No cambia el objetivo del camino. */
export function restrictFor(input: PlanInput, strategy: Strategy): Restricted {
  if (strategy === "no-bop") {
    return {
      recipes: input.recipes.filter(
        (r) => !(r.acquisition.kind === "pattern" && r.acquisition.bindsOnPickup === true),
      ),
      prices: input.prices,
    };
  }
  if (strategy === "vendor-only") {
    const vendor = input.vendorItems;
    if (vendor === undefined) {
      throw new TypeError("La estrategia vendor-only requiere `vendorItems`");
    }
    return {
      recipes: input.recipes,
      prices: new Map([...input.prices].filter(([item]) => vendor.has(item))),
    };
  }
  return { recipes: input.recipes, prices: input.prices };
}
