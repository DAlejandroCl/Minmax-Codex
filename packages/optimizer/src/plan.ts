import { copper, roundExpectedCost } from "@minmax-codex/shared";
import { assertThresholds, skillUpChance } from "./chance.js";
import { createCostModel } from "./cost.js";
import { restrictFor, STRATEGIES } from "./strategy.js";
import type { Strategy } from "./strategy.js";
import type { ItemId, Plan, PlanInput, PlanStep, Recipe, RecipeId } from "./types.js";

interface Candidate {
  readonly recipe: Recipe;
  readonly craftCost: number;
  readonly fixed: number;
  /** `prefix[k − start]` = Σ 1/p(s) para s = start … k−1; `Infinity` en cuanto algún p vale 0. */
  readonly prefix: readonly number[];
}

const EPSILON = 1e-9;

function acquisitionCost(recipe: Recipe): number {
  return recipe.acquisition.kind === "known" ? 0 : recipe.acquisition.cost;
}

function buildPrefix(recipe: Recipe, start: number, target: number): number[] {
  const prefix = [0];
  for (let s = start; s < target; s += 1) {
    const previous = prefix[s - start] ?? Number.POSITIVE_INFINITY;
    const p = skillUpChance(s, recipe.thresholds);
    prefix.push(p === 0 ? Number.POSITIVE_INFINITY : previous + 1 / p);
  }
  return prefix;
}

/**
 * Plan de menor coste esperado para subir una profesión de `startSkill` a `targetSkill` (ADR-010).
 *
 * Camino más corto en un DAG: los nodos son niveles de habilidad y cada arista usa una receta en un tramo
 * `s → t` con coste = adquisición + (Σ 1/p) × coste por crafteo. Es exacto si cada receta se usa en un único
 * tramo; si se repite, el modelo cobra su adquisición en cada tramo (`modelCost`) y el plan final la cobra una vez.
 * Devuelve `null` si no hay camino (falta una receta usable o un reactivo sin precio).
 */
export function planProfession(input: PlanInput): Plan | null {
  const { startSkill: start, targetSkill: target } = input;
  if (!Number.isInteger(start) || !Number.isInteger(target) || start < 0 || target < start) {
    throw new RangeError(`Rango de habilidad inválido: ${start} → ${target}`);
  }
  const strategy: Strategy = input.strategy ?? "cheapest";
  const restricted = restrictFor(input, strategy);
  const model = createCostModel(restricted.recipes, restricted.prices, input.itemValues);

  const candidates: Candidate[] = [];
  for (const recipe of [...restricted.recipes].sort((a, b) => a.id - b.id)) {
    assertThresholds(recipe.thresholds);
    const craftCost = model.craftCost(recipe);
    if (craftCost === null) continue;
    candidates.push({
      recipe,
      craftCost,
      fixed: acquisitionCost(recipe),
      prefix: buildPrefix(recipe, start, target),
    });
  }

  // Peso de cada arista como par lexicográfico: [objetivo principal, desempate]. Con pesos aditivos el camino
  // más corto sigue siendo exacto (ADR-010). `cheapest`: (coste, crafteos); `fewest-crafts`: (crafteos, coste).
  const weights = (c: Candidate, crafts: number): readonly [number, number] => {
    const cost = c.fixed + crafts * c.craftCost;
    return strategy === "fewest-crafts" ? [crafts, cost] : [cost, crafts];
  };
  const size = target - start + 1;
  const dist1: number[] = Array.from({ length: size }, () => Number.POSITIVE_INFINITY);
  const dist2: number[] = Array.from({ length: size }, () => Number.POSITIVE_INFINITY);
  const from: number[] = Array.from({ length: size }, () => -1);
  const via: number[] = Array.from({ length: size }, () => -1);
  dist1[0] = 0;
  dist2[0] = 0;
  for (let s = start; s < target; s += 1) {
    const here1 = dist1[s - start] ?? Number.POSITIVE_INFINITY;
    const here2 = dist2[s - start] ?? Number.POSITIVE_INFINITY;
    if (!Number.isFinite(here1)) continue;
    candidates.forEach((c, index) => {
      if (s < c.recipe.minSkill) return;
      const base = c.prefix[s - start] ?? Number.POSITIVE_INFINITY;
      for (let t = s + 1; t <= target; t += 1) {
        const end = c.prefix[t - start] ?? Number.POSITIVE_INFINITY;
        if (!Number.isFinite(end)) break;
        const [w1, w2] = weights(c, end - base);
        const n1 = here1 + w1;
        const n2 = here2 + w2;
        const best1 = dist1[t - start] ?? Number.POSITIVE_INFINITY;
        const best2 = dist2[t - start] ?? Number.POSITIVE_INFINITY;
        if (n1 < best1 - EPSILON || (Math.abs(n1 - best1) <= EPSILON && n2 < best2 - EPSILON)) {
          dist1[t - start] = n1;
          dist2[t - start] = n2;
          from[t - start] = s;
          via[t - start] = index;
        }
      }
    });
  }
  if (!Number.isFinite(dist1[target - start] ?? Number.POSITIVE_INFINITY)) return null;

  const path: { candidate: Candidate; fromSkill: number; toSkill: number }[] = [];
  for (let t = target; t > start;) {
    const s = from[t - start];
    const index = via[t - start];
    const candidate = index === undefined ? undefined : candidates[index];
    if (s === undefined || s < 0 || candidate === undefined)
      throw new Error("Camino inconsistente");
    path.unshift({ candidate, fromSkill: s, toSkill: t });
    t = s;
  }

  const purchases = new Map<ItemId, number>();
  const intermediateCrafts = new Map<RecipeId, number>();
  const steps: PlanStep[] = [];
  let materials = 0;
  let modelPath = 0;
  let expectedTotal = 0;
  const acquired = new Set<RecipeId>();
  let acquisition = 0;
  for (const { candidate, fromSkill, toSkill } of path) {
    const base = candidate.prefix[fromSkill - start] ?? 0;
    const end = candidate.prefix[toSkill - start] ?? 0;
    const expected = end - base;
    const crafts = Math.ceil(expected - EPSILON);
    const cost = expected * candidate.craftCost;
    materials += cost;
    modelPath += candidate.fixed + cost;
    expectedTotal += expected;
    if (!acquired.has(candidate.recipe.id)) {
      acquired.add(candidate.recipe.id);
      acquisition += candidate.fixed;
    }
    const expansion = model.expand(candidate.recipe, crafts);
    for (const [item, qty] of expansion.purchases)
      purchases.set(item, (purchases.get(item) ?? 0) + qty);
    for (const [id, qty] of expansion.intermediateCrafts) {
      intermediateCrafts.set(id, (intermediateCrafts.get(id) ?? 0) + qty);
    }
    steps.push({
      recipeId: candidate.recipe.id,
      recipeName: candidate.recipe.name,
      fromSkill,
      toSkill,
      expectedCrafts: expected,
      crafts,
      materialsCost: roundExpectedCost(cost),
    });
  }

  const milestoneCost = (input.milestones ?? [])
    .filter((m) => m.atSkill > start && m.atSkill <= target)
    .reduce((sum, m) => sum + m.cost, 0);

  return {
    strategy,
    steps,
    expectedCrafts: expectedTotal,
    acquisitionCost: copper(acquisition),
    milestoneCost: copper(milestoneCost),
    materialsCost: roundExpectedCost(materials),
    totalCost: roundExpectedCost(materials + acquisition + milestoneCost),
    purchases,
    intermediateCrafts,
    modelCost: modelPath + milestoneCost,
  };
}

/** Calcula el plan de cada estrategia. `vendor-only` es `null` si no se indicó `vendorItems`. */
export function planAllStrategies(input: PlanInput): Record<Strategy, Plan | null> {
  const result = {} as Record<Strategy, Plan | null>;
  for (const strategy of STRATEGIES) {
    result[strategy] =
      strategy === "vendor-only" && input.vendorItems === undefined
        ? null
        : planProfession({ ...input, strategy });
  }
  return result;
}
