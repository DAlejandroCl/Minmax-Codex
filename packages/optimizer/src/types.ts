import type { Copper } from "@minmax-codex/shared";
import type { Strategy } from "./strategy.js";

export type ItemId = number;
export type RecipeId = number;

/**
 * Umbrales de color de una receta, como habilidades del personaje (ADR-010, SP-4):
 * `skill < yellow` → naranja (p = 1); `yellow ≤ skill < grey` → amarillo/verde (p decrece linealmente);
 * `skill ≥ grey` → gris (p = 0). Son parámetros de entrada: se miden en el juego (SP-4) y no se infieren aquí.
 */
export interface Thresholds {
  readonly yellow: number;
  readonly grey: number;
}

/** Cómo se obtiene la receta: ya sabida, de entrenador (coste fijo) o patrón comprable (coste fijo, RN-07). */
export type Acquisition =
  | { readonly kind: "known" }
  | { readonly kind: "trainer"; readonly cost: Copper }
  | {
      readonly kind: "pattern";
      readonly cost: Copper;
      /** Se liga al recogerlo (botín/misión): no se compra en la subasta. La estrategia `no-bop` lo excluye. */
      readonly bindsOnPickup?: boolean;
    };

export interface Reagent {
  readonly itemId: ItemId;
  readonly quantity: number;
}

export interface Recipe {
  readonly id: RecipeId;
  readonly name: string;
  /** Habilidad mínima para fabricarla (el color naranja empieza aquí). */
  readonly minSkill: number;
  readonly thresholds: Thresholds;
  readonly reagents: readonly Reagent[];
  readonly craftedItemId?: ItemId;
  readonly craftedQuantity: number;
  readonly acquisition: Acquisition;
}

/** Coste fijo que se paga al cruzar una habilidad (p. ej. entrenar el rango Artisan a 200). */
export interface Milestone {
  readonly label: string;
  readonly atSkill: number;
  readonly cost: Copper;
}

export interface PlanInput {
  readonly startSkill: number;
  readonly targetSkill: number;
  readonly recipes: readonly Recipe[];
  /** Precio de compra por unidad (cobre). Un ítem sin precio solo puede fabricarse. */
  readonly prices: ReadonlyMap<ItemId, Copper>;
  /** Valor de venta del ítem fabricado: se descuenta del coste (0 si falta). */
  readonly itemValues?: ReadonlyMap<ItemId, Copper>;
  readonly milestones?: readonly Milestone[];
  /** Estrategia del plan; `cheapest` por defecto. */
  readonly strategy?: Strategy;
  /** Ítems que venden los PNJ. Obligatorio para la estrategia `vendor-only`. */
  readonly vendorItems?: ReadonlySet<ItemId>;
}

export interface PlanStep {
  readonly recipeId: RecipeId;
  readonly recipeName: string;
  readonly fromSkill: number;
  readonly toSkill: number;
  /** Crafteos esperados Σ 1/p (fraccionario). */
  readonly expectedCrafts: number;
  /** Crafteos a preparar (redondeo hacia arriba), como en la lista de compras. */
  readonly crafts: number;
  /** Coste esperado de los reactivos del tramo (cobre, redondeado). */
  readonly materialsCost: Copper;
}

export interface Plan {
  readonly strategy: Strategy;
  readonly steps: readonly PlanStep[];
  /** Crafteos esperados totales Σ 1/p (sin los intermedios). */
  readonly expectedCrafts: number;
  /** Coste de adquirir cada receta usada, una sola vez por receta. */
  readonly acquisitionCost: Copper;
  readonly milestoneCost: Copper;
  readonly materialsCost: Copper;
  readonly totalCost: Copper;
  /** Ítems a comprar y recetas intermedias a fabricar para ejecutar el plan. */
  readonly purchases: ReadonlyMap<ItemId, number>;
  readonly intermediateCrafts: ReadonlyMap<RecipeId, number>;
  /** Coste del modelo de camino más corto, que cobra la adquisición en cada tramo (≥ `totalCost`). */
  readonly modelCost: number;
}
