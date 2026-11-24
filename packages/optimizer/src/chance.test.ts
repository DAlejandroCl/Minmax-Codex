import { describe, expect, it } from "vitest";
import { assertThresholds, expectedCrafts, skillUpChance } from "./chance.js";

const t = { yellow: 100, grey: 150 };

describe("skillUpChance", () => {
  it("es 1 en naranja, lineal en amarillo/verde y 0 en gris", () => {
    expect(skillUpChance(99, t)).toBe(1);
    expect(skillUpChance(100, t)).toBe(1);
    expect(skillUpChance(125, t)).toBe(0.5);
    expect(skillUpChance(149, t)).toBeCloseTo(0.02, 10);
    expect(skillUpChance(150, t)).toBe(0);
    expect(skillUpChance(200, t)).toBe(0);
  });

  it("tolera amarillo = gris (corte seco)", () => {
    expect(skillUpChance(99, { yellow: 100, grey: 100 })).toBe(1);
    expect(skillUpChance(100, { yellow: 100, grey: 100 })).toBe(0);
  });
});

describe("expectedCrafts", () => {
  it("suma 1/p por punto", () => {
    expect(expectedCrafts(90, 100, t)).toBe(10);
    expect(expectedCrafts(100, 102, t)).toBeCloseTo(1 + 1 / 0.98, 10);
  });

  it("es 0 si no hay puntos y Infinity si cruza gris", () => {
    expect(expectedCrafts(100, 100, t)).toBe(0);
    expect(expectedCrafts(149, 151, t)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("assertThresholds", () => {
  it("rechaza amarillo > gris y valores no finitos", () => {
    expect(() => assertThresholds({ yellow: 10, grey: 5 })).toThrow(RangeError);
    expect(() => assertThresholds({ yellow: Number.NaN, grey: 5 })).toThrow(RangeError);
    expect(() => assertThresholds({ yellow: 5, grey: 10 })).not.toThrow();
  });
});
