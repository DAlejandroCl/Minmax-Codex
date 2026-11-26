import { describe, expect, it } from "vitest";
import {
  TalentTreeSchema,
  decrease,
  increase,
  pointsAtLevel,
  spentInTree,
  validateAllocation,
  whyCannotDecrease,
  whyCannotIncrease,
  type TalentAllocation,
  type TalentTree,
} from "./talents.js";

/** Árbol sintético: fila 0 libre; fila 1 pide 5 puntos; "d" depende de "b". */
const tree: TalentTree = TalentTreeSchema.parse({
  id: "t",
  name: "Prueba",
  nodes: [
    { id: "a", name: "A", row: 0, col: 0, maxRank: 5 },
    { id: "b", name: "B", row: 0, col: 1, maxRank: 2 },
    { id: "c", name: "C", row: 1, col: 0, maxRank: 4 },
    { id: "d", name: "D", row: 2, col: 1, maxRank: 1, requires: "b" },
  ],
});

describe("pointsAtLevel", () => {
  it.each([
    [1, 0],
    [9, 0],
    [10, 1],
    [45, 36],
    [60, 51],
  ])("nivel %i → %i puntos", (level, pts) => expect(pointsAtLevel(level)).toBe(pts));
});

describe("TalentTreeSchema", () => {
  it("rechaza ids duplicados, celdas ocupadas y prerrequisitos inválidos", () => {
    const base = { id: "x", name: "X" };
    const node = { name: "n", maxRank: 1 };
    expect(
      TalentTreeSchema.safeParse({
        ...base,
        nodes: [
          { id: "a", row: 0, col: 0, ...node },
          { id: "a", row: 0, col: 1, ...node },
        ],
      }).success,
    ).toBe(false);
    expect(
      TalentTreeSchema.safeParse({
        ...base,
        nodes: [
          { id: "a", row: 0, col: 0, ...node },
          { id: "b", row: 0, col: 0, ...node },
        ],
      }).success,
    ).toBe(false);
    expect(
      TalentTreeSchema.safeParse({
        ...base,
        nodes: [{ id: "a", row: 0, col: 0, requires: "z", ...node }],
      }).success,
    ).toBe(false);
    expect(
      TalentTreeSchema.safeParse({
        ...base,
        nodes: [
          { id: "a", row: 1, col: 0, ...node },
          { id: "b", row: 0, col: 1, requires: "a", ...node },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("increase / decrease", () => {
  it("respeta el rango máximo y los puntos disponibles", () => {
    let a: TalentAllocation = {};
    for (let i = 0; i < 9; i++) a = increase(tree, a, "b", 10);
    expect(a).toEqual({ b: 2 });
    expect(whyCannotIncrease(tree, {}, "a", 0)).toBe("no-points");
  });

  it("bloquea la fila 1 hasta tener 5 puntos arriba", () => {
    expect(whyCannotIncrease(tree, { a: 4 }, "c", 10)).toBe("row-locked");
    expect(whyCannotIncrease(tree, { a: 5 }, "c", 10)).toBeNull();
  });

  it("exige el prerrequisito al máximo", () => {
    const base: TalentAllocation = { a: 5, c: 4 };
    expect(whyCannotIncrease(tree, { ...base, b: 1 }, "d", 10)).toBe("prerequisite");
    expect(whyCannotIncrease(tree, { ...base, b: 2 }, "d", 10)).toBeNull();
  });

  it("no deja quitar un punto que sostiene una fila o un dependiente", () => {
    expect(whyCannotDecrease(tree, { a: 5, c: 1 }, "a")).toBe("row-support");
    expect(whyCannotDecrease(tree, { a: 5, b: 2, c: 4, d: 1 }, "b")).toBe("dependency");
    expect(decrease(tree, { a: 5, b: 1 }, "b")).toEqual({ a: 5 });
  });

  it("recorrido aleatorio: nunca produce una asignación inválida ni gasta de más", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
    let a: TalentAllocation = {};
    const total = 12;
    for (let i = 0; i < 2000; i++) {
      const id = ["a", "b", "c", "d"][Math.floor(rnd() * 4)] ?? "a";
      const left = total - spentInTree(tree, a);
      a = rnd() < 0.6 ? increase(tree, a, id, left) : decrease(tree, a, id);
      expect(validateAllocation([tree], a, 9 + total).valid).toBe(true);
    }
  });
});

describe("validateAllocation", () => {
  it("detecta talentos desconocidos, filas cerradas y exceso de puntos", () => {
    expect(validateAllocation([tree], { zz: 1 }, 45).valid).toBe(false);
    expect(validateAllocation([tree], { c: 1 }, 45).valid).toBe(false);
    expect(validateAllocation([tree], { a: 5 }, 12).errors[0]).toMatch(/por encima/);
  });
  it("calcula los puntos sin gastar", () => {
    expect(validateAllocation([tree], { a: 5 }, 45)).toMatchObject({
      valid: true,
      spent: 5,
      unspent: 31,
    });
  });
});
