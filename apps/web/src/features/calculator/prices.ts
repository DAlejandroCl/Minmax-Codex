/** Un precio se considera obsoleto si se observó hace más de estos días (solo mercado: el vendedor no cambia). */
export const STALE_AFTER_DAYS = 7;
/** Un precio es atípico si supera este múltiplo del valor habitual de referencia. */
export const OUTLIER_FACTOR = 3;

const DAY_MS = 86_400_000;

export type PriceFlag = "stale" | "outlier";

export interface PriceMeta {
  /** Cuándo se observó el precio (ms epoch). `null` si no aplica (vendedor). */
  readonly observedAt: number | null;
  /** El jugador lo editó a mano: se trata como observado ahora. */
  readonly overridden: boolean;
}

export function ageInDays(observedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - observedAt) / DAY_MS));
}

export interface FlagInput {
  readonly price: number;
  /** Precio habitual del ítem; 0 desactiva la comprobación de atípico. */
  readonly reference: number;
  readonly meta: PriceMeta;
  readonly now: number;
  /** `true` para precios de mercado, que caducan; `false` para vendedores. */
  readonly perishable: boolean;
}

/** Marcas que debe mostrar un precio. Un override reciente nunca es obsoleto, pero sí puede ser atípico. */
export function priceFlags({
  price,
  reference,
  meta,
  now,
  perishable,
}: FlagInput): readonly PriceFlag[] {
  const flags: PriceFlag[] = [];
  if (
    perishable &&
    meta.observedAt !== null &&
    ageInDays(meta.observedAt, now) > STALE_AFTER_DAYS
  ) {
    flags.push("stale");
  }
  if (reference > 0 && price > reference * OUTLIER_FACTOR) flags.push("outlier");
  return flags;
}

/** Cuántas veces supera el precio al habitual, con un decimal. */
export function outlierFactor(price: number, reference: number): number {
  return reference > 0 ? Math.round((price / reference) * 10) / 10 : 0;
}
