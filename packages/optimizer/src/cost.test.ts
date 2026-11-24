import { describe, expect, it } from "vitest";
import { copper } from "@minmax-codex/shared";
import { createCostModel } from "./cost.js";
import { prices, recipe } from "./test-helpers.js";

// Caso real (2026-11-20): Cured Rugged Hide = 1 Rugged Hide + 1 Refined Deeprock Salt → 2 unidades.
const HIDE = 1;
const SALT = 2;
const CURED = 3;
const cured = recipe(10756, {
  reagents: [
    { itemId: HIDE, quantity: 1 },
    { itemId: SALT, quantity: 1 },
  ],
  craftedItemId: CURED,
  craftedQuantity: 2,
});
const armor = recipe(1, { reagents: [{ itemId: CURED, quantity: 54 }] });

describe("comprar vs. fabricar", () => {
  it("compra el intermedio cuando fabricarlo es más caro (precios de la subasta del 2026-11-20)", () => {
    const model = createCostModel(
      [cured, armor],
      prices({ [HIDE]: 500, [SALT]: 630_000, [CURED]: 11_500 }),
    );
    expect(model.unit(CURED)).toEqual({ via: "buy", copper: 11_500 });
    expect(model.craftCost(armor)).toBe(54 * 11_500);
  });

  it("fabrica cuando los materiales son más baratos", () => {
    const model = createCostModel(
      [cured, armor],
      prices({ [HIDE]: 500, [SALT]: 100, [CURED]: 11_500 }),
    );
    expect(model.unit(CURED)).toEqual({ via: "craft", copper: 300, recipeId: 10756 });
    const expansion = model.expand(armor, 2);
    expect(expansion.intermediateCrafts.get(10756)).toBe(54); // 108 unidades → 54 crafteos
    expect(expansion.purchases.get(HIDE)).toBe(54);
    expect(expansion.purchases.get(SALT)).toBe(54);
    expect(expansion.purchases.has(CURED)).toBe(false);
  });

  it("no fabrica con recetas aún no aprendidas (entrenador/patrón)", () => {
    const trainer = recipe(10756, {
      ...cured,
      acquisition: { kind: "trainer", cost: copper(2500) },
    });
    const model = createCostModel(
      [trainer, armor],
      prices({ [HIDE]: 500, [SALT]: 100, [CURED]: 11_500 }),
    );
    expect(model.unit(CURED)).toEqual({ via: "buy", copper: 11_500 });
  });

  it("devuelve null si un reactivo no se puede comprar ni fabricar", () => {
    const model = createCostModel([armor], prices({}));
    expect(model.unit(CURED)).toBeNull();
    expect(model.craftCost(armor)).toBeNull();
  });
});

describe("valor del ítem fabricado", () => {
  it("se descuenta del coste y nunca lo vuelve negativo", () => {
    const r = recipe(5, {
      reagents: [{ itemId: 1, quantity: 2 }],
      craftedItemId: 50,
      craftedQuantity: 1,
    });
    const cheap = createCostModel([r], prices({ 1: 100 }), prices({ 50: 120 }));
    expect(cheap.craftCost(r)).toBe(80);
    const profit = createCostModel([r], prices({ 1: 100 }), prices({ 50: 5000 }));
    expect(profit.craftCost(r)).toBe(0);
  });
});

describe("ciclos", () => {
  it("no entra en bucle cuando dos recetas se producen entre sí", () => {
    const a = recipe(1, { reagents: [{ itemId: 20, quantity: 1 }], craftedItemId: 10 });
    const b = recipe(2, { reagents: [{ itemId: 10, quantity: 1 }], craftedItemId: 20 });
    const model = createCostModel([a, b], prices({ 10: 700 }));
    expect(model.unit(10)).toEqual({ via: "buy", copper: 700 });
    expect(model.unit(20)).toEqual({ via: "craft", copper: 700, recipeId: 2 });
  });
});
