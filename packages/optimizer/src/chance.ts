import type { Thresholds } from "./types.js";

/** Comprueba que los umbrales sean finitos y `yellow ≤ grey`. */
export function assertThresholds(t: Thresholds): void {
  if (!Number.isFinite(t.yellow) || !Number.isFinite(t.grey) || t.yellow > t.grey) {
    throw new RangeError(`Umbrales inválidos: amarillo=${t.yellow}, gris=${t.grey}`);
  }
}

/**
 * Probabilidad de subir un punto al craftear con habilidad `skill`:
 * 1 en naranja, `(gris − skill)/(gris − amarillo)` entre amarillo y gris, 0 en gris.
 */
export function skillUpChance(skill: number, t: Thresholds): number {
  if (skill < t.yellow) return 1;
  if (skill >= t.grey) return 0;
  return (t.grey - skill) / (t.grey - t.yellow);
}

/** Crafteos esperados para pasar de `from` a `to`: Σ 1/p(s) para s = from … to−1. `Infinity` si algún p es 0. */
export function expectedCrafts(from: number, to: number, t: Thresholds): number {
  let total = 0;
  for (let s = from; s < to; s += 1) {
    const p = skillUpChance(s, t);
    if (p === 0) return Number.POSITIVE_INFINITY;
    total += 1 / p;
  }
  return total;
}
