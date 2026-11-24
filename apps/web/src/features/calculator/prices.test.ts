import { describe, expect, it } from "vitest";
import { ageInDays, OUTLIER_FACTOR, outlierFactor, priceFlags, STALE_AFTER_DAYS } from "./prices";

const DAY = 86_400_000;
const now = 1_000 * DAY;
const fresh = { observedAt: now - DAY, overridden: false };

describe("priceFlags", () => {
  it("un precio reciente y normal no se marca", () => {
    expect(priceFlags({ price: 100, reference: 100, meta: fresh, now, perishable: true })).toEqual(
      [],
    );
  });
  it("marca obsoleto justo por encima del umbral, no en él", () => {
    const at = (days: number) => ({ observedAt: now - days * DAY, overridden: false });
    const f = (days: number) =>
      priceFlags({ price: 100, reference: 100, meta: at(days), now, perishable: true });
    expect(f(STALE_AFTER_DAYS)).toEqual([]);
    expect(f(STALE_AFTER_DAYS + 1)).toEqual(["stale"]);
  });
  it("los precios de vendedor no caducan", () => {
    const old = { observedAt: now - 90 * DAY, overridden: false };
    expect(priceFlags({ price: 100, reference: 100, meta: old, now, perishable: false })).toEqual(
      [],
    );
  });
  it("marca atípico por encima del múltiplo, no en él", () => {
    const f = (price: number) =>
      priceFlags({ price, reference: 100, meta: fresh, now, perishable: true });
    expect(f(100 * OUTLIER_FACTOR)).toEqual([]);
    expect(f(100 * OUTLIER_FACTOR + 1)).toEqual(["outlier"]);
  });
  it("puede estar obsoleto y ser atípico a la vez (el caso del precio de 37.5g)", () => {
    const old = { observedAt: now - 30 * DAY, overridden: false };
    expect(
      priceFlags({ price: 375_000, reference: 11_500, meta: old, now, perishable: true }),
    ).toEqual(["stale", "outlier"]);
  });
  it("sin referencia no hay comprobación de atípico", () => {
    expect(
      priceFlags({ price: 999_999, reference: 0, meta: fresh, now, perishable: true }),
    ).toEqual([]);
  });
});

describe("ageInDays / outlierFactor", () => {
  it("calcula días enteros y nunca negativos", () => {
    expect(ageInDays(now - 2.9 * DAY, now)).toBe(2);
    expect(ageInDays(now + DAY, now)).toBe(0);
  });
  it("redondea el factor a un decimal", () => {
    expect(outlierFactor(375_000, 11_500)).toBe(32.6);
    expect(outlierFactor(10, 0)).toBe(0);
  });
});
