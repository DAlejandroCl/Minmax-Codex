import { describe, expect, it } from "vitest";
import { toNameI18n } from "./common.js";
import {
  normalizeItem,
  normalizeItems,
  normalizeRecipe,
  normalizeRecipes,
  summarizeReasons,
} from "./normalize.js";
import { ColorThresholdsSchema, GameItemSchema, GameRecipeSchema } from "./schemas.js";

/** Fixtures sintéticos con la forma de la API; no contienen datos reales descargados. */
const recipe = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 5001,
  name: { en_US: "Test Boots", es_MX: "Botas de prueba" },
  reagents: [
    {
      reagent: {
        id: 100,
        name: { en_US: "Light Hide", es_MX: "Cuero ligero" },
        key: { href: "x" },
      },
      quantity: 2,
    },
    { reagent: { id: 101, name: "Coarse Thread" }, quantity: 1 },
  ],
  crafted_item: { id: 200, name: { en_US: "Test Boots" } },
  crafted_quantity: { value: 1 },
  media: { id: 5001, key: { href: "x" } },
  _links: { self: { href: "x" } },
  unknown_future_field: [1, 2, 3],
  ...over,
});

const item = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 100,
  name: { en_US: "Light Hide" },
  sell_price: 25,
  purchase_price: 100,
  preview_item: { binding: { type: "ON_ACQUIRE" } },
  ...over,
});

describe("normalizeRecipe: datos válidos", () => {
  it("convierte una receta cruda y tolera campos desconocidos", () => {
    const r = normalizeRecipe(recipe(), { professionId: 165 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      id: 5001,
      name: { en: "Test Boots", es: "Botas de prueba" },
      professionId: 165,
      craftedItemId: 200,
      craftedQuantity: { min: 1, max: 1 },
      reagents: [
        { itemId: 100, quantity: 2 },
        { itemId: 101, quantity: 1 },
      ],
    });
    expect(GameRecipeSchema.safeParse(r.value).success).toBe(true);
  });

  it.each([
    ["número", 3, { min: 3, max: 3 }],
    ["value", { value: 2 }, { min: 2, max: 2 }],
    ["rango", { minimum: 1, maximum: 4 }, { min: 1, max: 4 }],
  ])("acepta crafted_quantity como %s", (_label, input, expected) => {
    const r = normalizeRecipe(recipe({ crafted_quantity: input }));
    expect(r.ok && r.value.craftedQuantity).toEqual(expected);
  });

  it("sin crafted_quantity ni crafted_item asume 1 y no inventa el ítem", () => {
    const base = recipe();
    delete base.crafted_quantity;
    delete base.crafted_item;
    const r = normalizeRecipe(base);
    expect(r.ok && r.value.craftedQuantity).toEqual({ min: 1, max: 1 });
    expect(r.ok && r.value.craftedItemId).toBeUndefined();
  });

  it("una receta sin reactivos es válida (p. ej. encantamientos sin materiales)", () => {
    expect(normalizeRecipe(recipe({ reagents: [] })).ok).toBe(true);
  });

  it("suma los reactivos repetidos y lo avisa en vez de descartarlos", () => {
    const r = normalizeRecipe(
      recipe({
        reagents: [
          { reagent: { id: 100 }, quantity: 2 },
          { reagent: { id: 100 }, quantity: 3 },
        ],
      }),
    );
    expect(r.ok && r.value.reagents).toEqual([{ itemId: 100, quantity: 5 }]);
    expect(r.ok && r.warnings[0]).toMatch(/reactivo repetido 100/);
  });
});

describe("normalizeRecipe: datos corruptos se rechazan con motivo", () => {
  const cases: readonly [string, unknown, RegExp, number | null][] = [
    ["id como texto", recipe({ id: "5001" }), /^id/, null],
    ["id cero", recipe({ id: 0 }), /^id/, 0],
    ["id negativo", recipe({ id: -4 }), /^id/, -4],
    ["id decimal", recipe({ id: 1.5 }), /^id/, null],
    [
      "sin id",
      (() => {
        const r = recipe();
        delete r.id;
        return r;
      })(),
      /^id/,
      null,
    ],
    ["nombre vacío", recipe({ name: "   " }), /^name/, 5001],
    ["nombre sin textos", recipe({ name: {} }), /^name/, 5001],
    ["nombre con idiomas vacíos", recipe({ name: { en_US: "" } }), /^name/, 5001],
    [
      "sin nombre",
      (() => {
        const r = recipe();
        delete r.name;
        return r;
      })(),
      /^name/,
      5001,
    ],
    ["reagents no es lista", recipe({ reagents: "x" }), /^reagents/, 5001],
    [
      "sin reagents",
      (() => {
        const r = recipe();
        delete r.reagents;
        return r;
      })(),
      /^reagents/,
      5001,
    ],
    [
      "cantidad cero",
      recipe({ reagents: [{ reagent: { id: 1 }, quantity: 0 }] }),
      /quantity/,
      5001,
    ],
    [
      "cantidad negativa",
      recipe({ reagents: [{ reagent: { id: 1 }, quantity: -1 }] }),
      /quantity/,
      5001,
    ],
    [
      "cantidad decimal",
      recipe({ reagents: [{ reagent: { id: 1 }, quantity: 1.5 }] }),
      /quantity/,
      5001,
    ],
    [
      "cantidad como texto",
      recipe({ reagents: [{ reagent: { id: 1 }, quantity: "2" }] }),
      /quantity/,
      5001,
    ],
    [
      "reactivo sin id",
      recipe({ reagents: [{ reagent: { name: "x" }, quantity: 1 }] }),
      /reagent/,
      5001,
    ],
    [
      "rango invertido",
      recipe({ crafted_quantity: { minimum: 5, maximum: 2 } }),
      /crafted_quantity/,
      5001,
    ],
    [
      "cantidad fabricada cero",
      recipe({ crafted_quantity: { value: 0 } }),
      /crafted_quantity/,
      5001,
    ],
    ["ítem fabricado sin id", recipe({ crafted_item: { name: "x" } }), /crafted_item/, 5001],
    ["null", null, /./, null],
    ["lista", [], /./, null],
    ["texto", "receta", /./, null],
    ["número", 42, /./, null],
  ];
  it.each(cases)("%s", (_label, input, reason, id) => {
    const r = normalizeRecipe(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.some((x) => reason.test(x))).toBe(true);
    expect(r.id).toBe(id);
  });
});

describe("normalizeItem", () => {
  it("convierte precios en cobre y la ligadura BoP", () => {
    const r = normalizeItem(item());
    expect(r.ok && r.value).toMatchObject({
      id: 100,
      name: { en: "Light Hide" },
      sellPrice: 25,
      purchasePrice: 100,
      binding: "on_pickup",
    });
    expect(r.ok && GameItemSchema.safeParse(r.value).success).toBe(true);
  });

  it.each([
    ["ON_EQUIP", "on_equip"],
    ["ON_USE", "on_use"],
    ["NO_BINDING", "none"],
  ])("mapea la ligadura %s", (type, expected) => {
    const r = normalizeItem(item({ preview_item: { binding: { type } } }));
    expect(r.ok && r.value.binding).toBe(expected);
  });

  it("sin preview_item no se liga; un tipo nuevo es «unknown» con aviso, no un error", () => {
    const none = normalizeItem(item({ preview_item: undefined }));
    expect(none.ok && none.value.binding).toBe("none");
    const odd = normalizeItem(item({ preview_item: { binding: { type: "ON_SOMETHING_NEW" } } }));
    expect(odd.ok && odd.value.binding).toBe("unknown");
    expect(odd.ok && odd.warnings[0]).toMatch(/ON_SOMETHING_NEW/);
  });

  it.each([
    ["precio negativo", item({ sell_price: -1 })],
    ["precio decimal", item({ purchase_price: 1.5 })],
    ["precio como texto", item({ sell_price: "25" })],
    ["sin nombre", item({ name: undefined })],
    ["id inválido", item({ id: 0 })],
  ])("rechaza %s", (_label, input) => {
    expect(normalizeItem(input).ok).toBe(false);
  });
});

describe("lotes y resumen", () => {
  it("separa aceptadas, rechazadas y duplicadas sin abortar el lote", () => {
    const batch = normalizeRecipes([
      recipe({ id: 1 }),
      recipe({ id: 2, reagents: [{ reagent: { id: 9 }, quantity: 0 }] }),
      recipe({ id: 1 }),
      null,
      recipe({
        id: 3,
        reagents: [
          { reagent: { id: 9 }, quantity: 1 },
          { reagent: { id: 9 }, quantity: 1 },
        ],
      }),
    ]);
    expect(batch.accepted.map((r) => r.id)).toEqual([1, 3]);
    expect(batch.rejected).toHaveLength(3);
    expect(batch.rejected.some((r) => r.reasons.includes("id duplicado en el lote"))).toBe(true);
    expect(batch.warnings).toEqual([
      { id: 3, messages: ["reactivo repetido 9: se suman las cantidades"] },
    ]);
  });

  it("summarizeReasons agrupa por motivo, ordena por frecuencia y guarda ejemplos", () => {
    const batch = normalizeItems([
      item({ id: 1, sell_price: -1 }),
      item({ id: 2, sell_price: -5 }),
      item({ id: 3, id_: 1, name: "" }),
    ]);
    const summary = summarizeReasons(batch.rejected);
    expect(summary[0]?.count).toBeGreaterThanOrEqual(2);
    expect(summary[0]?.sampleIds.length).toBeGreaterThan(0);
    expect(summary.map((s) => s.count)).toEqual(
      [...summary.map((s) => s.count)].sort((a, b) => b - a),
    );
  });
});

describe("nombres localizados", () => {
  it("prefiere en_US y es_MX, y recurre a otro idioma si falta el inglés", () => {
    expect(toNameI18n({ en_GB: "Boots", es_ES: "Botas" })).toEqual({ en: "Boots", es: "Botas" });
    expect(toNameI18n({ de_DE: "Stiefel" })).toEqual({ en: "Stiefel" });
    expect(toNameI18n("  Boots  ")).toEqual({ en: "Boots" });
    expect(toNameI18n({ en_US: "  ", fr_FR: "" })).toBeNull();
  });
});

describe("esquemas de dominio", () => {
  it("rechazan umbrales con yellow > grey", () => {
    expect(ColorThresholdsSchema.safeParse({ yellow: 100, grey: 90 }).success).toBe(false);
    expect(ColorThresholdsSchema.safeParse({ yellow: 90, grey: 90 }).success).toBe(true);
  });
});

/** PRNG determinista (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("fuzz: nada lanza, y todo lo aceptado cumple el esquema", () => {
  const junk: readonly unknown[] = [
    null,
    undefined,
    NaN,
    Infinity,
    -Infinity,
    -1,
    0,
    1.5,
    2 ** 60,
    "",
    "  ",
    "x",
    "5",
    [],
    [null],
    {},
    { a: 1 },
    true,
    () => 1,
  ];
  const mutate = (value: unknown, rnd: () => number): unknown => {
    const clone = structuredClone(value) as Record<string, unknown>;
    const targets: Record<string, unknown>[] = [clone];
    const walk = (v: unknown): void => {
      if (typeof v !== "object" || v === null) return;
      targets.push(v as Record<string, unknown>);
      for (const child of Object.values(v)) walk(child);
    };
    walk(clone);
    for (let i = 0; i < 1 + Math.floor(rnd() * 3); i += 1) {
      const target = targets[Math.floor(rnd() * targets.length)];
      if (!target) continue;
      const keys = Object.keys(target);
      const key = keys[Math.floor(rnd() * keys.length)];
      if (key === undefined) continue;
      if (rnd() < 0.2) Reflect.deleteProperty(target, key);
      else target[key] = junk[Math.floor(rnd() * junk.length)];
    }
    return clone;
  };

  it("recetas", () => {
    const rnd = seeded(10);
    let accepted = 0;
    for (let i = 0; i < 3000; i += 1) {
      const input = mutate(recipe(), rnd);
      const r = normalizeRecipe(input);
      if (r.ok) {
        accepted += 1;
        expect(GameRecipeSchema.safeParse(r.value).success).toBe(true);
        for (const g of r.value.reagents)
          expect(Number.isInteger(g.quantity) && g.quantity > 0).toBe(true);
      } else {
        expect(r.reasons.length).toBeGreaterThan(0);
      }
    }
    expect(accepted).toBeGreaterThan(0); // alguna mutación inocua sigue siendo válida
    expect(accepted).toBeLessThan(3000); // y la mayoría de las dañinas se rechazan
  });

  it("ítems", () => {
    const rnd = seeded(11);
    for (let i = 0; i < 3000; i += 1) {
      const r = normalizeItem(mutate(item(), rnd));
      if (r.ok) expect(GameItemSchema.safeParse(r.value).success).toBe(true);
      else expect(r.reasons.length).toBeGreaterThan(0);
    }
  });
});
