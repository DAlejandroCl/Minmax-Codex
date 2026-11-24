import { copper } from "@minmax-codex/shared";
import type { Copper } from "@minmax-codex/shared";
import type { Acquisition, ItemId, Recipe } from "./types.js";

export const prices = (entries: Record<number, number>): Map<ItemId, Copper> =>
  new Map(Object.entries(entries).map(([id, price]) => [Number(id), copper(price)]));

export interface RecipeOptions {
  readonly minSkill?: number;
  readonly yellow?: number;
  readonly grey?: number;
  readonly reagents?: readonly { itemId: number; quantity: number }[];
  readonly craftedItemId?: number;
  readonly craftedQuantity?: number;
  readonly acquisition?: Acquisition;
}

export function recipe(id: number, o: RecipeOptions = {}): Recipe {
  return {
    id,
    name: `R${id}`,
    minSkill: o.minSkill ?? 0,
    thresholds: { yellow: o.yellow ?? 1000, grey: o.grey ?? 1100 },
    reagents: o.reagents ?? [{ itemId: 1, quantity: 1 }],
    ...(o.craftedItemId === undefined ? {} : { craftedItemId: o.craftedItemId }),
    craftedQuantity: o.craftedQuantity ?? 1,
    acquisition: o.acquisition ?? { kind: "known" },
  };
}

/** Generador pseudoaleatorio determinista (mulberry32) para las pruebas de propiedades. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
