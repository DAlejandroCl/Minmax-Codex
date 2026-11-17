import { describe, expect, it } from "vitest";
import {
  addMoney,
  copper,
  formatMoney,
  fromGsc,
  roundExpectedCost,
  toGsc,
  COPPER_PER_GOLD,
} from "./money.js";

describe("copper", () => {
  it("acepta enteros no negativos", () => {
    expect(copper(0)).toBe(0);
    expect(copper(12345)).toBe(12345);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])("rechaza %s", (bad) => {
    expect(() => copper(bad)).toThrow();
  });
});

describe("fromGsc / toGsc", () => {
  it("convierte oro, plata y cobre", () => {
    expect(fromGsc(1, 2, 3)).toBe(COPPER_PER_GOLD + 200 + 3);
    expect(toGsc(fromGsc(12, 5, 3))).toEqual({ gold: 12, silver: 5, copper: 3 });
  });

  it("es reversible para cualquier monto", () => {
    for (const n of [0, 1, 99, 100, 9_999, 10_000, 123_456_789]) {
      const { gold, silver, copper: c } = toGsc(copper(n));
      expect(fromGsc(gold, silver, c)).toBe(n);
    }
  });
});

describe("addMoney", () => {
  it("suma sin errores de coma flotante", () => {
    const parts = Array.from({ length: 1000 }, () => copper(1));
    expect(addMoney(...parts)).toBe(1000);
  });
});

describe("roundExpectedCost", () => {
  it("redondea una sola vez al cobre más cercano", () => {
    expect(roundExpectedCost(10.4)).toBe(10);
    expect(roundExpectedCost(10.5)).toBe(11);
  });

  it.each([-0.1, Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (bad) => {
    expect(() => roundExpectedCost(bad)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("formatea omitiendo unidades en cero", () => {
    expect(formatMoney(fromGsc(12, 5, 3))).toBe("12g 5s 3c");
    expect(formatMoney(fromGsc(12))).toBe("12g");
    expect(formatMoney(copper(0))).toBe("0c");
    expect(formatMoney(copper(250))).toBe("2s 50c");
  });

  it("separa miles según el idioma", () => {
    expect(formatMoney(fromGsc(1234), "en")).toBe("1,234g");
    expect(formatMoney(fromGsc(1234), "es")).toMatch(/^1\D?234g$/);
  });
});
