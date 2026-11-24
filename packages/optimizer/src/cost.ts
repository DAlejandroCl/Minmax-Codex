import type { Copper } from "@minmax-codex/shared";
import type { ItemId, Recipe, RecipeId } from "./types.js";

export type UnitCost =
  | { readonly via: "buy"; readonly copper: number }
  | { readonly via: "craft"; readonly copper: number; readonly recipeId: RecipeId };

export interface CostModel {
  /** Coste por unidad de un ítem: el menor entre comprarlo y fabricarlo (solo con recetas ya sabidas). */
  unit(itemId: ItemId): UnitCost | null;
  /** Coste de reactivos de un crafteo, menos el valor del ítem fabricado (nunca negativo). `null` si algún reactivo no se consigue. */
  craftCost(recipe: Recipe): number | null;
  /** Compras e intermedios necesarios para `crafts` crafteos de `recipe`. */
  expand(recipe: Recipe, crafts: number): Expansion;
}

export interface Expansion {
  readonly purchases: Map<ItemId, number>;
  readonly intermediateCrafts: Map<RecipeId, number>;
}

interface Outcome<T> {
  readonly value: T | null;
  /** `true` si el resultado depende de un ciclo cortado y no debe memorizarse. */
  readonly cut: boolean;
}

/**
 * Modelo de coste con decisión «comprar vs. fabricar» por ítem (RF-PRO-08). Los intermedios solo se fabrican con
 * recetas `known` (sin coste de adquisición); las de entrenador/patrón se comparan como recetas de subida de habilidad.
 */
export function createCostModel(
  recipes: readonly Recipe[],
  prices: ReadonlyMap<ItemId, Copper>,
  itemValues: ReadonlyMap<ItemId, Copper> = new Map(),
): CostModel {
  const producers = new Map<ItemId, Recipe[]>();
  for (const r of recipes) {
    if (r.craftedItemId === undefined || r.acquisition.kind !== "known") continue;
    const list = producers.get(r.craftedItemId) ?? [];
    list.push(r);
    producers.set(r.craftedItemId, list);
  }
  const memo = new Map<ItemId, UnitCost | null>();

  const resolve = (itemId: ItemId, stack: ReadonlySet<ItemId>): Outcome<UnitCost> => {
    if (memo.has(itemId)) return { value: memo.get(itemId) ?? null, cut: false };
    if (stack.has(itemId)) return { value: null, cut: true };
    const next = new Set(stack).add(itemId);
    let best: UnitCost | null = null;
    let cut = false;
    const price = prices.get(itemId);
    if (price !== undefined) best = { via: "buy", copper: price };
    for (const recipe of producers.get(itemId) ?? []) {
      const materials = reagentCost(recipe, next);
      cut ||= materials.cut;
      if (materials.value === null) continue;
      const perUnit = materials.value / recipe.craftedQuantity;
      if (best === null || perUnit < best.copper)
        best = { via: "craft", copper: perUnit, recipeId: recipe.id };
    }
    if (!cut) memo.set(itemId, best);
    return { value: best, cut };
  };

  const reagentCost = (recipe: Recipe, stack: ReadonlySet<ItemId>): Outcome<number> => {
    let total = 0;
    let cut = false;
    for (const reagent of recipe.reagents) {
      const unit = resolve(reagent.itemId, stack);
      cut ||= unit.cut;
      if (unit.value === null) return { value: null, cut };
      total += unit.value.copper * reagent.quantity;
    }
    return { value: total, cut };
  };

  const byId = new Map(recipes.map((r) => [r.id, r]));

  const expandInto = (recipe: Recipe, crafts: number, acc: Expansion): void => {
    for (const reagent of recipe.reagents) {
      addItem(reagent.itemId, crafts * reagent.quantity, acc);
    }
  };

  const addItem = (itemId: ItemId, quantity: number, acc: Expansion): void => {
    const unit = resolve(itemId, new Set()).value;
    if (unit === null) throw new Error(`Ítem sin precio ni receta: ${itemId}`);
    if (unit.via === "buy") {
      acc.purchases.set(itemId, (acc.purchases.get(itemId) ?? 0) + quantity);
      return;
    }
    const producer = byId.get(unit.recipeId);
    if (!producer) throw new Error(`Receta desconocida: ${unit.recipeId}`);
    const batches = Math.ceil(quantity / producer.craftedQuantity);
    acc.intermediateCrafts.set(
      producer.id,
      (acc.intermediateCrafts.get(producer.id) ?? 0) + batches,
    );
    expandInto(producer, batches, acc);
  };

  return {
    unit: (itemId) => resolve(itemId, new Set()).value,
    craftCost(recipe) {
      const materials = reagentCost(recipe, new Set()).value;
      if (materials === null) return null;
      const value =
        recipe.craftedItemId === undefined
          ? 0
          : (itemValues.get(recipe.craftedItemId) ?? 0) * recipe.craftedQuantity;
      return Math.max(0, materials - value);
    },
    expand(recipe, crafts) {
      const acc: Expansion = { purchases: new Map(), intermediateCrafts: new Map() };
      expandInto(recipe, crafts, acc);
      return acc;
    },
  };
}
