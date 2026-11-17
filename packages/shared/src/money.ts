import { z } from "zod";

/**
 * Dinero como entero en cobre (ADR-006, RN-02).
 * 100 cobre = 1 plata; 100 plata = 1 oro.
 */
export const COPPER_PER_SILVER = 100;
export const SILVER_PER_GOLD = 100;
export const COPPER_PER_GOLD = COPPER_PER_SILVER * SILVER_PER_GOLD;

declare const copperBrand: unique symbol;
/** Cantidad de cobre: entero seguro y no negativo. */
export type Copper = number & { readonly [copperBrand]: true };

export const CopperSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, "El monto excede el entero seguro")
  .transform((n) => n as Copper);

export interface Gsc {
  readonly gold: number;
  readonly silver: number;
  readonly copper: number;
}

/** Valida y convierte un número a `Copper`; lanza si no es un entero seguro ≥ 0. */
export function copper(value: number): Copper {
  return CopperSchema.parse(value);
}

/** Construye un monto desde oro/plata/cobre. */
export function fromGsc(gold: number, silver = 0, cop = 0): Copper {
  return copper(gold * COPPER_PER_GOLD + silver * COPPER_PER_SILVER + cop);
}

/** Descompone un monto en oro/plata/cobre. */
export function toGsc(amount: Copper): Gsc {
  const gold = Math.floor(amount / COPPER_PER_GOLD);
  const rest = amount % COPPER_PER_GOLD;
  return {
    gold,
    silver: Math.floor(rest / COPPER_PER_SILVER),
    copper: rest % COPPER_PER_SILVER,
  };
}

/** Suma exacta de montos. */
export function addMoney(...amounts: Copper[]): Copper {
  return copper(amounts.reduce<number>((acc, n) => acc + n, 0));
}

/**
 * Redondea un costo esperado fraccionario (p. ej. costo / probabilidad)
 * a cobre entero. Debe llamarse UNA sola vez, al final del cálculo.
 */
export function roundExpectedCost(expected: number): Copper {
  if (!Number.isFinite(expected) || expected < 0) {
    throw new RangeError("El costo esperado debe ser un número finito y no negativo");
  }
  return copper(Math.round(expected));
}

/** Formatea para la UI, p. ej. "12g 5s 3c". Omite unidades en cero (salvo 0c). */
export function formatMoney(amount: Copper, locale = "en"): string {
  const { gold, silver, copper: cop } = toGsc(amount);
  const nf = new Intl.NumberFormat(locale);
  const parts: string[] = [];
  if (gold > 0) parts.push(`${nf.format(gold)}g`);
  if (silver > 0) parts.push(`${silver}s`);
  if (cop > 0 || parts.length === 0) parts.push(`${cop}c`);
  return parts.join(" ");
}
