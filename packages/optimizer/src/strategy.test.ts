import { copper } from "@minmax-codex/shared";
import { describe, expect, it } from "vitest";
import { expectedCrafts } from "./chance.js";
import { planAllStrategies, planProfession } from "./plan.js";
import { STRATEGIES } from "./strategy.js";
import { prices, recipe, seeded } from "./test-helpers.js";
import type { Recipe } from "./types.js";

describe("estrategias: casos que producen resultados distintos (H-015)", () => {
  // A: barata pero con muchos crafteos (se pone amarilla pronto). B: cara pero casi siempre naranja.
  const cheapMany = recipe(1, { yellow: 10, grey: 60, reagents: [{ itemId: 1, quantity: 1 }] });
  const pricyFew = recipe(2, { yellow: 200, grey: 260, reagents: [{ itemId: 2, quantity: 1 }] });
  const p = prices({ 1: 10, 2: 100 });
  const input = { prices: p, startSkill: 0, targetSkill: 50, recipes: [cheapMany, pricyFew] };

  it("cheapest minimiza el coste y fewest-crafts minimiza los crafteos", () => {
    const cheap = planProfession({ ...input, strategy: "cheapest" });
    const few = planProfession({ ...input, strategy: "fewest-crafts" });
    expect(cheap).not.toBeNull();
    expect(few).not.toBeNull();
    expect(Number(cheap?.totalCost)).toBeLessThan(Number(few?.totalCost));
    expect(cheap?.expectedCrafts).toBeGreaterThan(few?.expectedCrafts ?? Infinity);
    // Hasta el nivel 10 ambas son naranjas (1 crafteo por punto): el empate se rompe por coste, con la barata.
    expect(few?.steps.map((s) => s.recipeId)).toEqual([1, 2]);
    expect(few?.steps[0]?.toSkill).toBeGreaterThanOrEqual(10);
    expect(few?.expectedCrafts).toBeCloseTo(50, 9);
  });

  it("la estrategia por defecto es cheapest y el plan la declara", () => {
    const plan = planProfession(input);
    expect(plan?.strategy).toBe("cheapest");
    expect(plan?.totalCost).toBe(planProfession({ ...input, strategy: "cheapest" })?.totalCost);
  });

  it("no-bop excluye los patrones que se ligan al recogerlos, aunque sean los más baratos", () => {
    const bop = recipe(3, {
      reagents: [{ itemId: 1, quantity: 1 }],
      acquisition: { kind: "pattern", cost: copper(0), bindsOnPickup: true },
    });
    const tradable = recipe(4, {
      reagents: [{ itemId: 2, quantity: 1 }],
      acquisition: { kind: "pattern", cost: copper(50) },
    });
    const all = { prices: p, startSkill: 0, targetSkill: 20, recipes: [bop, tradable] };
    const cheap = planProfession({ ...all, strategy: "cheapest" });
    const noBop = planProfession({ ...all, strategy: "no-bop" });
    expect(cheap?.steps.map((s) => s.recipeId)).toEqual([3]);
    expect(noBop?.steps.map((s) => s.recipeId)).toEqual([4]);
    expect(Number(noBop?.totalCost)).toBeGreaterThan(Number(cheap?.totalCost));
  });

  it("no-bop devuelve null si la única ruta exige un patrón de botín", () => {
    const bop = recipe(3, {
      acquisition: { kind: "pattern", cost: copper(0), bindsOnPickup: true },
    });
    expect(
      planProfession({
        prices: p,
        startSkill: 0,
        targetSkill: 10,
        recipes: [bop],
        strategy: "no-bop",
      }),
    ).toBeNull();
  });

  it("vendor-only usa solo materiales de vendedor y falla sin vendorItems", () => {
    const vendorRecipe = recipe(5, { reagents: [{ itemId: 7, quantity: 2 }] });
    const auctionRecipe = recipe(6, { reagents: [{ itemId: 8, quantity: 1 }] });
    const pr = prices({ 7: 30, 8: 1 }); // la de subasta sería más barata
    const base = {
      prices: pr,
      startSkill: 0,
      targetSkill: 10,
      recipes: [vendorRecipe, auctionRecipe],
    };
    expect(planProfession({ ...base, strategy: "cheapest" })?.steps[0]?.recipeId).toBe(6);
    const vendor = planProfession({ ...base, strategy: "vendor-only", vendorItems: new Set([7]) });
    expect(vendor?.steps.map((s) => s.recipeId)).toEqual([5]);
    expect([...(vendor?.purchases.keys() ?? [])]).toEqual([7]);
    expect(() => planProfession({ ...base, strategy: "vendor-only" })).toThrow(TypeError);
  });

  it("planAllStrategies devuelve las cuatro y marca vendor-only como null sin vendorItems", () => {
    const all = planAllStrategies(input);
    expect(Object.keys(all).sort()).toEqual([...STRATEGIES].sort());
    expect(all["vendor-only"]).toBeNull();
    expect(
      planAllStrategies({ ...input, vendorItems: new Set([1, 2]) })["vendor-only"],
    ).not.toBeNull();
  });
});

/** Fuerza bruta: mínimo de crafteos esperados (sin costes fijos) con la misma segmentación por tramos. */
function bruteMinCrafts(recipes: readonly Recipe[], start: number, target: number): number {
  const memo = new Map<number, number>();
  const best = (s: number): number => {
    if (s === target) return 0;
    const cached = memo.get(s);
    if (cached !== undefined) return cached;
    let result = Number.POSITIVE_INFINITY;
    for (const r of recipes) {
      if (s < r.minSkill) continue;
      for (let t = s + 1; t <= target; t += 1) {
        const crafts = expectedCrafts(s, t, r.thresholds);
        if (!Number.isFinite(crafts)) break;
        result = Math.min(result, crafts + best(t));
      }
    }
    memo.set(s, result);
    return result;
  };
  return best(start);
}

describe("estrategias: propiedades en instancias aleatorias", () => {
  const rnd = seeded(15);
  const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
  const instances = Array.from({ length: 200 }, () => {
    const start = int(0, 10);
    const target = start + int(5, 25);
    const recipes: Recipe[] = [1, 2, 3].map((id) => {
      const yellow = int(start, target + 5);
      return recipe(id, {
        minSkill: int(0, start + 5),
        yellow,
        grey: yellow + int(0, 30),
        reagents: [{ itemId: id, quantity: int(1, 3) }],
        acquisition:
          rnd() < 0.5 ? { kind: "known" } : { kind: "pattern", cost: copper(int(0, 300)) },
      });
    });
    return { start, target, recipes, p: prices({ 1: int(1, 50), 2: int(1, 50), 3: int(1, 50) }) };
  });

  it("fewest-crafts coincide con la fuerza bruta de crafteos", () => {
    let compared = 0;
    for (const { start, target, recipes, p } of instances) {
      const expected = bruteMinCrafts(recipes, start, target);
      const plan = planProfession({
        prices: p,
        startSkill: start,
        targetSkill: target,
        recipes,
        strategy: "fewest-crafts",
      });
      if (!Number.isFinite(expected)) {
        expect(plan).toBeNull();
        continue;
      }
      expect(plan?.expectedCrafts).toBeCloseTo(expected, 6);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(100);
  });

  it("cheapest nunca cuesta más y fewest-crafts nunca hace más crafteos que la otra", () => {
    for (const { start, target, recipes, p } of instances) {
      const input = { prices: p, startSkill: start, targetSkill: target, recipes };
      const cheap = planProfession({ ...input, strategy: "cheapest" });
      const few = planProfession({ ...input, strategy: "fewest-crafts" });
      expect(cheap === null).toBe(few === null);
      if (cheap === null || few === null) continue;
      expect(cheap.modelCost).toBeLessThanOrEqual(few.modelCost + 1e-6);
      expect(few.expectedCrafts).toBeLessThanOrEqual(cheap.expectedCrafts + 1e-6);
    }
  });

  it("restringir nunca abarata: no-bop y vendor-only cuestan al menos lo que cheapest", () => {
    for (const { start, target, recipes, p } of instances) {
      const input = {
        prices: p,
        startSkill: start,
        targetSkill: target,
        recipes,
        vendorItems: new Set([1, 2]),
      };
      const cheap = planProfession({ ...input, strategy: "cheapest" });
      for (const strategy of ["no-bop", "vendor-only"] as const) {
        const restricted = planProfession({ ...input, strategy });
        if (restricted === null || cheap === null) continue;
        expect(restricted.modelCost).toBeGreaterThanOrEqual(cheap.modelCost - 1e-6);
      }
    }
  });
});
