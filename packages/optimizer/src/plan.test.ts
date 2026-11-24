import { copper } from "@minmax-codex/shared";
import { describe, expect, it } from "vitest";
import { expectedCrafts } from "./chance.js";
import { createCostModel } from "./cost.js";
import { planProfession } from "./plan.js";
import { prices, recipe, seeded } from "./test-helpers.js";
import type { Recipe } from "./types.js";

const base = { prices: prices({ 1: 100 }) };

describe("planProfession: casos básicos", () => {
  it("no hace nada si ya estás en el objetivo", () => {
    const plan = planProfession({ ...base, startSkill: 50, targetSkill: 50, recipes: [recipe(1)] });
    expect(plan?.steps).toEqual([]);
    expect(plan?.totalCost).toBe(0);
  });

  it("en naranja cuesta un crafteo por punto", () => {
    const plan = planProfession({ ...base, startSkill: 10, targetSkill: 20, recipes: [recipe(1)] });
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0]).toMatchObject({ recipeId: 1, fromSkill: 10, toSkill: 20, crafts: 10 });
    expect(plan?.totalCost).toBe(1000);
    expect(plan?.purchases.get(1)).toBe(10);
  });

  it("usa Σ 1/p en amarillo", () => {
    const r = recipe(1, { yellow: 100, grey: 150 });
    const plan = planProfession({ ...base, startSkill: 100, targetSkill: 110, recipes: [r] });
    const expected = expectedCrafts(100, 110, r.thresholds);
    expect(plan?.steps[0]?.expectedCrafts).toBeCloseTo(expected, 10);
    expect(plan?.totalCost).toBe(Math.round(expected * 100));
    expect(plan?.steps[0]?.crafts).toBe(Math.ceil(expected));
  });

  it("devuelve null si no hay receta usable (habilidad mínima o gris) o falta un precio", () => {
    expect(
      planProfession({
        ...base,
        startSkill: 10,
        targetSkill: 20,
        recipes: [recipe(1, { minSkill: 50 })],
      }),
    ).toBeNull();
    expect(
      planProfession({
        ...base,
        startSkill: 10,
        targetSkill: 20,
        recipes: [recipe(1, { yellow: 5, grey: 12 })],
      }),
    ).toBeNull();
    expect(
      planProfession({ prices: prices({}), startSkill: 10, targetSkill: 20, recipes: [recipe(1)] }),
    ).toBeNull();
  });

  it("rechaza rangos inválidos", () => {
    expect(() => planProfession({ ...base, startSkill: 20, targetSkill: 10, recipes: [] })).toThrow(
      RangeError,
    );
  });
});

describe("planProfession: elección de recetas", () => {
  it("cambia de receta cuando la actual se acerca al gris (como SkillUp en 196→197)", () => {
    // A es barata pero se vuelve gris a 50; B es cara y sirve hasta 100.
    const a = recipe(1, { yellow: 30, grey: 50, reagents: [{ itemId: 1, quantity: 1 }] });
    const b = recipe(2, { yellow: 100, grey: 120, reagents: [{ itemId: 2, quantity: 1 }] });
    const plan = planProfession({
      prices: prices({ 1: 10, 2: 100 }),
      startSkill: 20,
      targetSkill: 60,
      recipes: [a, b],
    });
    expect(plan?.steps.map((s) => s.recipeId)).toEqual([1, 2]);
    const first = plan?.steps[0];
    expect(first?.toSkill).toBeGreaterThan(30);
    expect(first?.toSkill).toBeLessThan(50);
    expect(plan?.steps[1]?.fromSkill).toBe(first?.toSkill);
  });

  it("amortiza el patrón solo cuando compensa (RN-07)", () => {
    const known = recipe(1, { reagents: [{ itemId: 1, quantity: 1 }] }); // 100 por crafteo
    const withPattern = recipe(2, {
      reagents: [{ itemId: 2, quantity: 1 }], // 10 por crafteo
      acquisition: { kind: "pattern", cost: copper(10_000) },
    });
    const p = prices({ 1: 100, 2: 10 });
    const short = planProfession({
      prices: p,
      startSkill: 100,
      targetSkill: 110,
      recipes: [known, withPattern],
    });
    expect(short?.steps.map((s) => s.recipeId)).toEqual([1]);
    expect(short?.totalCost).toBe(1000);
    const long = planProfession({
      prices: p,
      startSkill: 100,
      targetSkill: 300,
      recipes: [known, withPattern],
    });
    expect(long?.steps.map((s) => s.recipeId)).toEqual([2]);
    expect(long?.acquisitionCost).toBe(10_000);
    expect(long?.totalCost).toBe(12_000);
  });

  it("cobra la adquisición una sola vez si la receta se repite en dos tramos", () => {
    // R1 (patrón) sirve en 0-20 y 40-60; R2 es la única opción de 20 a 40.
    const r1 = recipe(1, {
      reagents: [{ itemId: 1, quantity: 1 }],
      acquisition: { kind: "pattern", cost: copper(50) },
    });
    const r2 = recipe(2, {
      minSkill: 20,
      yellow: 40,
      grey: 41,
      reagents: [{ itemId: 2, quantity: 1 }],
    });
    const r1b = { ...r1, minSkill: 0 };
    const plan = planProfession({
      prices: prices({ 1: 1, 2: 1 }),
      startSkill: 0,
      targetSkill: 60,
      recipes: [r1b, r2],
    });
    expect(plan).not.toBeNull();
    const ids = plan?.steps.map((s) => s.recipeId) ?? [];
    const uses = ids.filter((id) => id === 1).length;
    if (uses > 1) expect(plan?.modelCost).toBeGreaterThan(Number(plan?.totalCost));
    expect(plan?.acquisitionCost).toBe(50);
  });
});

describe("planProfession: intermedios, hitos y compras", () => {
  it("expande los reactivos y fabrica el intermedio si compensa", () => {
    const cured = recipe(100, {
      reagents: [
        { itemId: 5, quantity: 1 },
        { itemId: 6, quantity: 1 },
      ],
      craftedItemId: 7,
      craftedQuantity: 2,
    });
    const armor = recipe(1, { reagents: [{ itemId: 7, quantity: 2 }] });
    const plan = planProfession({
      prices: prices({ 5: 50, 6: 50, 7: 1000 }),
      startSkill: 0,
      targetSkill: 10,
      recipes: [cured, armor],
    });
    expect(plan?.totalCost).toBe(10 * 2 * 50); // 10 crafteos × 2 intermedios × (50+50)/2
    expect(plan?.intermediateCrafts.get(100)).toBe(10);
    expect(plan?.purchases.has(7)).toBe(false);
  });

  it("suma hitos solo si se cruzan (p. ej. entrenar Artisan a 200)", () => {
    const m = [{ label: "Artisan", atSkill: 200, cost: copper(50_000) }];
    const r = [recipe(1)];
    const cross = planProfession({
      ...base,
      startSkill: 190,
      targetSkill: 210,
      recipes: r,
      milestones: m,
    });
    expect(cross?.milestoneCost).toBe(50_000);
    expect(cross?.totalCost).toBe(20 * 100 + 50_000);
    const before = planProfession({
      ...base,
      startSkill: 100,
      targetSkill: 150,
      recipes: r,
      milestones: m,
    });
    expect(before?.milestoneCost).toBe(0);
    const already = planProfession({
      ...base,
      startSkill: 200,
      targetSkill: 210,
      recipes: r,
      milestones: m,
    });
    expect(already?.milestoneCost).toBe(0);
  });
});

/** Fuerza bruta: mínimo coste del modelo por tramos (adquisición en cada tramo) en instancias pequeñas. */
function bruteForce(
  recipes: readonly Recipe[],
  p: ReturnType<typeof prices>,
  start: number,
  target: number,
): number {
  const model = createCostModel(recipes, p);
  const memo = new Map<number, number>();
  const best = (s: number): number => {
    if (s === target) return 0;
    const cached = memo.get(s);
    if (cached !== undefined) return cached;
    let result = Number.POSITIVE_INFINITY;
    for (const r of recipes) {
      const craftCost = model.craftCost(r);
      if (craftCost === null || s < r.minSkill) continue;
      for (let t = s + 1; t <= target; t += 1) {
        const crafts = expectedCrafts(s, t, r.thresholds);
        if (!Number.isFinite(crafts)) break;
        const fixed = r.acquisition.kind === "known" ? 0 : r.acquisition.cost;
        result = Math.min(result, fixed + crafts * craftCost + best(t));
      }
    }
    memo.set(s, result);
    return result;
  };
  return best(start);
}

describe("planProfession: equivalencia con fuerza bruta (ADR-010)", () => {
  it("coincide en 200 instancias aleatorias con costes fijos", () => {
    const rnd = seeded(2026);
    const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
    let compared = 0;
    for (let i = 0; i < 200; i += 1) {
      const start = int(0, 10);
      const target = start + int(5, 25);
      const p = prices({ 1: int(1, 50), 2: int(1, 50), 3: int(1, 50) });
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
      const expected = bruteForce(recipes, p, start, target);
      const plan = planProfession({ prices: p, startSkill: start, targetSkill: target, recipes });
      if (!Number.isFinite(expected)) {
        expect(plan).toBeNull();
        continue;
      }
      expect(plan).not.toBeNull();
      expect(plan?.modelCost).toBeCloseTo(expected, 6);
      expect(Number(plan?.totalCost)).toBeLessThanOrEqual(Math.round(expected) + 1);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(100);
  });

  it("el coste del plan nunca supera usar solo una receta factible", () => {
    const rnd = seeded(7);
    for (let i = 0; i < 100; i += 1) {
      const recipes = [1, 2, 3].map((id) =>
        recipe(id, {
          yellow: 10 + Math.floor(rnd() * 40),
          grey: 60 + Math.floor(rnd() * 40),
          reagents: [{ itemId: id, quantity: 1 }],
        }),
      );
      const p = prices({
        1: 1 + Math.floor(rnd() * 20),
        2: 1 + Math.floor(rnd() * 20),
        3: 1 + Math.floor(rnd() * 20),
      });
      const plan = planProfession({ prices: p, startSkill: 0, targetSkill: 30, recipes });
      if (plan === null) continue;
      for (const r of recipes) {
        const crafts = expectedCrafts(0, 30, r.thresholds);
        if (!Number.isFinite(crafts)) continue;
        const single = crafts * (p.get(r.id) ?? 0);
        expect(plan.modelCost).toBeLessThanOrEqual(single + 1e-6);
      }
    }
  });
});
