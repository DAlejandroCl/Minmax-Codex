import { copper } from "@minmax-codex/shared";
import type { Copper } from "@minmax-codex/shared";
import { planAllStrategies, skillUpChance } from "@minmax-codex/optimizer";
import type { ItemId, Plan, PlanInput, PlanStep, Recipe, Strategy } from "@minmax-codex/optimizer";
import { DEMO_ITEMS, DEMO_MILESTONES, DEMO_RECIPES, SKILL_MAX, SKILL_MIN } from "./demo-data";
import type { ItemInfo } from "./demo-data";

export type Locale = "es" | "en";

export interface CalculatorInputs {
  readonly startSkill: number;
  readonly targetSkill: number;
  /** Modo «solo entrenador»: excluye recetas que requieren comprar un patrón (RF-PRO-03). */
  readonly trainerOnly: boolean;
  /** Precio por unidad en cobre. */
  readonly prices: Readonly<Record<number, number>>;
  /** Unidades que el jugador ya tiene. */
  readonly owned: Readonly<Record<number, number>>;
}

export type InputError = "range" | "bounds";

/** Valida el rango de habilidad; `null` si es correcto. */
export function validateInputs(
  inputs: Pick<CalculatorInputs, "startSkill" | "targetSkill">,
): InputError | null {
  const { startSkill: a, targetSkill: b } = inputs;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < SKILL_MIN || b > SKILL_MAX)
    return "bounds";
  if (a > b) return "range";
  return null;
}

export function defaultPrices(items: readonly ItemInfo[] = DEMO_ITEMS): Record<number, number> {
  return Object.fromEntries(items.map((i) => [i.id, i.defaultPrice]));
}

/** Convierte las entradas de la UI en la entrada del optimizador. */
export function buildPlanInput(inputs: CalculatorInputs): PlanInput {
  const recipes: Recipe[] = DEMO_RECIPES.map((r) => r.recipe).filter(
    (r) => !(inputs.trainerOnly && r.acquisition.kind === "pattern"),
  );
  return {
    startSkill: inputs.startSkill,
    targetSkill: inputs.targetSkill,
    recipes,
    prices: new Map<ItemId, Copper>(
      Object.entries(inputs.prices).map(([id, p]) => [Number(id), copper(p)]),
    ),
    milestones: DEMO_MILESTONES,
    vendorItems: new Set(DEMO_ITEMS.filter((i) => i.source === "vendor").map((i) => i.id)),
  };
}

/** Un plan por estrategia (`null` si esa estrategia no tiene ruta). */
export type Plans = Readonly<Record<Strategy, Plan | null>>;

/** Calcula los planes de todas las estrategias (el mismo código se ejecuta en el Web Worker, ADR-003). */
export function computePlans(inputs: CalculatorInputs): Plans | null {
  if (validateInputs(inputs) !== null) return null;
  return planAllStrategies(buildPlanInput(inputs));
}

/** Plan de una estrategia concreta, de forma síncrona. */
export function computePlan(
  inputs: CalculatorInputs,
  strategy: Strategy = "cheapest",
): Plan | null {
  return computePlans(inputs)?.[strategy] ?? null;
}

export interface ShoppingRow {
  readonly itemId: ItemId;
  readonly name: string;
  readonly source: ItemInfo["source"];
  readonly needed: number;
  readonly owned: number;
  readonly missing: number;
  readonly unitPrice: number;
  readonly subtotal: number;
}

export interface ShoppingList {
  readonly rows: readonly ShoppingRow[];
  readonly total: number;
}

/** Lista de compras consolidada: lo necesario menos lo que ya se tiene, ordenada por coste (RF-PRO-06). */
export function buildShoppingList(
  plan: Plan,
  inputs: Pick<CalculatorInputs, "prices" | "owned">,
  locale: Locale,
  items: readonly ItemInfo[] = DEMO_ITEMS,
): ShoppingList {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows: ShoppingRow[] = [];
  for (const [itemId, needed] of plan.purchases) {
    const info = byId.get(itemId);
    const owned = Math.min(needed, Math.max(0, inputs.owned[itemId] ?? 0));
    const missing = needed - owned;
    const unitPrice = inputs.prices[itemId] ?? 0;
    rows.push({
      itemId,
      name: info?.name[locale] ?? `#${itemId}`,
      source: info?.source ?? "auction",
      needed,
      owned,
      missing,
      unitPrice,
      subtotal: missing * unitPrice,
    });
  }
  rows.sort((a, b) => b.subtotal - a.subtotal || a.name.localeCompare(b.name, locale));
  return { rows, total: rows.reduce((sum, r) => sum + r.subtotal, 0) };
}

export interface StepExplanation {
  readonly costPerPoint: Copper;
  /** Probabilidad de subir al empezar y al terminar el tramo (0–1). */
  readonly chanceStart: number;
  readonly chanceEnd: number;
}

/** Datos para explicar por qué se usa una receta en un tramo (RF-PRO-09). */
export function explainStep(step: PlanStep, recipe: Recipe): StepExplanation {
  const points = Math.max(1, step.toSkill - step.fromSkill);
  return {
    costPerPoint: copper(Math.round(step.materialsCost / points)),
    chanceStart: skillUpChance(step.fromSkill, recipe.thresholds),
    chanceEnd: skillUpChance(step.toSkill - 1, recipe.thresholds),
  };
}

export function recipeName(id: number, locale: Locale): string {
  return DEMO_RECIPES.find((r) => r.recipe.id === id)?.name[locale] ?? `#${id}`;
}

export function recipeById(id: number): Recipe | undefined {
  return DEMO_RECIPES.find((r) => r.recipe.id === id)?.recipe;
}

export type Difficulty = "orange" | "yellow" | "green" | "grey";

/** Color de dificultad que el jugador ya conoce del juego, según la probabilidad de subir (0–1). */
export function difficultyOf(chance: number): Difficulty {
  if (chance >= 1) return "orange";
  if (chance >= 0.5) return "yellow";
  if (chance > 0) return "green";
  return "grey";
}
