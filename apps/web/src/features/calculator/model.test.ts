import { describe, expect, it } from "vitest";
import { buildShoppingList, computePlan, defaultPrices, validateInputs } from "./model";
import type { CalculatorInputs } from "./model";
import { buildShoppingText } from "./format";

const base = (): CalculatorInputs => ({
  startSkill: 148,
  targetSkill: 300,
  trainerOnly: false,
  prices: defaultPrices(),
  owned: {},
});

describe("validateInputs", () => {
  it("acepta un rango válido", () => expect(validateInputs(base())).toBeNull());
  it("rechaza inicio > objetivo", () =>
    expect(validateInputs({ startSkill: 200, targetSkill: 150 })).toBe("range"));
  it("rechaza fuera de límites o no enteros", () => {
    expect(validateInputs({ startSkill: 0, targetSkill: 100 })).toBe("bounds");
    expect(validateInputs({ startSkill: 1, targetSkill: 301 })).toBe("bounds");
    expect(validateInputs({ startSkill: 1.5, targetSkill: 100 })).toBe("bounds");
  });
});

describe("computePlan", () => {
  it("devuelve un plan que cubre el rango", () => {
    const plan = computePlan(base());
    expect(plan).not.toBeNull();
    expect(plan?.steps[0]?.fromSkill).toBe(148);
    expect(plan?.steps.at(-1)?.toSkill).toBe(300);
  });
  it("devuelve null con entradas inválidas", () => {
    expect(computePlan({ ...base(), startSkill: 300, targetSkill: 10 })).toBeNull();
  });
  it("el modo solo-entrenador no usa patrones", () => {
    const plan = computePlan({ ...base(), trainerOnly: true });
    // Sin patrones no se llega a 300 con los datos de ejemplo.
    expect(plan === null || plan.steps.every((s) => s.recipeId < 106)).toBe(true);
  });
});

describe("lista de compras", () => {
  it("resta lo que ya se tiene y suma el total", () => {
    const plan = computePlan({ ...base(), startSkill: 148, targetSkill: 200 });
    expect(plan).not.toBeNull();
    if (!plan) return;
    const first = [...plan.purchases][0];
    if (!first) throw new Error("sin compras");
    const [itemId, needed] = first;
    const without = buildShoppingList(plan, { prices: defaultPrices(), owned: {} }, "es");
    const withOwned = buildShoppingList(
      plan,
      { prices: defaultPrices(), owned: { [itemId]: needed } },
      "es",
    );
    expect(withOwned.total).toBeLessThan(without.total);
    expect(withOwned.rows.find((r) => r.itemId === itemId)?.missing).toBe(0);
  });
  it("no resta más de lo necesario", () => {
    const plan = computePlan({ ...base(), targetSkill: 200 });
    if (!plan) throw new Error("sin plan");
    const [[itemId]] = [...plan.purchases] as [[number, number]];
    const list = buildShoppingList(
      plan,
      { prices: defaultPrices(), owned: { [itemId]: 9999 } },
      "es",
    );
    expect(list.rows.find((r) => r.itemId === itemId)?.missing).toBe(0);
  });
  it("el texto copiable omite lo que no falta e incluye el total", () => {
    const list = {
      rows: [
        {
          itemId: 1,
          name: "A",
          source: "vendor" as const,
          needed: 2,
          owned: 2,
          missing: 0,
          unitPrice: 10,
          subtotal: 0,
        },
        {
          itemId: 2,
          name: "B",
          source: "auction" as const,
          needed: 3,
          owned: 0,
          missing: 3,
          unitPrice: 100,
          subtotal: 300,
        },
      ],
      total: 300,
    };
    const text = buildShoppingText(list, { title: "Lista", total: "Total", missing: "Falta" });
    expect(text).toContain("3× B");
    expect(text).not.toContain("A —");
    expect(text).toContain("Total: 3s");
  });
});
