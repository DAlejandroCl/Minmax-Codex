import type { z } from "zod";
import { toNameI18n } from "./common.js";
import { RawItemSchema, RawRecipeSchema } from "./battlenet.js";
import type { RawRecipe } from "./battlenet.js";
import { GameItemSchema, GameRecipeSchema } from "./schemas.js";
import type { Binding, CraftedQuantity, GameItem, GameRecipe } from "./schemas.js";

export type Normalized<T> =
  | { readonly ok: true; readonly value: T; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly id: number | null; readonly reasons: readonly string[] };

const reasonsOf = (error: z.ZodError): string[] =>
  error.issues.map((i) => (i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message));

/** Lee `id` de un dato aún sin validar, solo para poder identificar el rechazo. */
function idOf(input: unknown): number | null {
  if (typeof input !== "object" || input === null) return null;
  const id = (input as { id?: unknown }).id;
  return typeof id === "number" && Number.isInteger(id) ? id : null;
}

const BINDINGS: Readonly<Record<string, Binding>> = {
  NO_BINDING: "none",
  ON_ACQUIRE: "on_pickup",
  ON_EQUIP: "on_equip",
  ON_USE: "on_use",
};

function craftedQuantityOf(q: RawRecipe["crafted_quantity"]): CraftedQuantity {
  if (q === undefined) return { min: 1, max: 1 };
  if (typeof q === "number") return { min: q, max: q };
  // Las formas con campos extra pierden el discriminante en el tipo; se resuelve por comprobación de valores.
  const { value, minimum, maximum } = q as {
    value?: unknown;
    minimum?: unknown;
    maximum?: unknown;
  };
  if (typeof value === "number") return { min: value, max: value };
  if (typeof minimum === "number" && typeof maximum === "number")
    return { min: minimum, max: maximum };
  return { min: 1, max: 1 };
}

export interface RecipeContext {
  /** Profesión a la que pertenece la receta (viene del índice de profesiones, no de la receta). */
  readonly professionId?: number;
}

/** Valida una receta cruda de la API y la convierte al modelo de dominio. Nunca lanza. */
export function normalizeRecipe(
  input: unknown,
  context: RecipeContext = {},
): Normalized<GameRecipe> {
  const parsed = RawRecipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, id: idOf(input), reasons: reasonsOf(parsed.error) };
  const raw = parsed.data;
  const name = toNameI18n(raw.name);
  if (name === null) return { ok: false, id: raw.id, reasons: ["name: sin texto utilizable"] };

  const warnings: string[] = [];
  // Un reactivo repetido se suma (y se avisa) en lugar de descartarse: no se pierde información.
  const quantities = new Map<number, number>();
  for (const r of raw.reagents) {
    const id = r.reagent.id;
    if (quantities.has(id)) warnings.push(`reactivo repetido ${id}: se suman las cantidades`);
    quantities.set(id, (quantities.get(id) ?? 0) + r.quantity);
  }

  const candidate = {
    id: raw.id,
    name,
    ...(context.professionId === undefined ? {} : { professionId: context.professionId }),
    ...(raw.rank === undefined ? {} : { rank: raw.rank }),
    ...(raw.crafted_item === undefined ? {} : { craftedItemId: raw.crafted_item.id }),
    craftedQuantity: craftedQuantityOf(raw.crafted_quantity),
    reagents: [...quantities].map(([itemId, quantity]) => ({ itemId, quantity })),
    sources: [],
  };
  const result = GameRecipeSchema.safeParse(candidate);
  return result.success
    ? { ok: true, value: result.data, warnings }
    : { ok: false, id: raw.id, reasons: reasonsOf(result.error) };
}

/** Valida un ítem crudo de la API y lo convierte al modelo de dominio. Nunca lanza. */
export function normalizeItem(input: unknown): Normalized<GameItem> {
  const parsed = RawItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, id: idOf(input), reasons: reasonsOf(parsed.error) };
  const raw = parsed.data;
  const name = toNameI18n(raw.name);
  if (name === null) return { ok: false, id: raw.id, reasons: ["name: sin texto utilizable"] };

  const warnings: string[] = [];
  const type = raw.preview_item?.binding?.type;
  let binding: Binding = "none";
  if (type !== undefined) {
    const known = BINDINGS[type];
    if (known === undefined) warnings.push(`tipo de ligadura desconocido: ${type}`);
    binding = known ?? "unknown";
  }
  const candidate = {
    id: raw.id,
    name,
    ...(raw.sell_price === undefined ? {} : { sellPrice: raw.sell_price }),
    ...(raw.purchase_price === undefined ? {} : { purchasePrice: raw.purchase_price }),
    binding,
  };
  const result = GameItemSchema.safeParse(candidate);
  return result.success
    ? { ok: true, value: result.data, warnings }
    : { ok: false, id: raw.id, reasons: reasonsOf(result.error) };
}

export interface Rejection {
  readonly id: number | null;
  readonly reasons: readonly string[];
}

export interface NormalizedBatch<T> {
  readonly accepted: readonly T[];
  readonly rejected: readonly Rejection[];
  /** Avisos por ID de las entradas aceptadas que tuvieron algo que señalar. */
  readonly warnings: readonly { readonly id: number; readonly messages: readonly string[] }[];
}

function normalizeMany<T extends { readonly id: number }>(
  inputs: readonly unknown[],
  one: (input: unknown) => Normalized<T>,
): NormalizedBatch<T> {
  const accepted: T[] = [];
  const rejected: Rejection[] = [];
  const warnings: { id: number; messages: readonly string[] }[] = [];
  const seen = new Set<number>();
  for (const input of inputs) {
    const result = one(input);
    if (!result.ok) {
      rejected.push({ id: result.id, reasons: result.reasons });
      continue;
    }
    if (seen.has(result.value.id)) {
      rejected.push({ id: result.value.id, reasons: ["id duplicado en el lote"] });
      continue;
    }
    seen.add(result.value.id);
    accepted.push(result.value);
    if (result.warnings.length > 0)
      warnings.push({ id: result.value.id, messages: result.warnings });
  }
  return { accepted, rejected, warnings };
}

/** Normaliza un lote de recetas; las inválidas se devuelven con sus motivos en vez de abortar el lote. */
export const normalizeRecipes = (inputs: readonly unknown[]): NormalizedBatch<GameRecipe> =>
  normalizeMany(inputs, (i) => normalizeRecipe(i));

export const normalizeItems = (inputs: readonly unknown[]): NormalizedBatch<GameItem> =>
  normalizeMany(inputs, normalizeItem);

/** Agrupa los motivos de rechazo (sin el ID) para ver de un vistazo qué falla más. */
export function summarizeReasons(rejected: readonly Rejection[]): readonly {
  readonly reason: string;
  readonly count: number;
  readonly sampleIds: readonly number[];
}[] {
  const groups = new Map<string, { count: number; sampleIds: number[] }>();
  for (const r of rejected) {
    for (const reason of r.reasons) {
      const g = groups.get(reason) ?? { count: 0, sampleIds: [] };
      g.count += 1;
      if (r.id !== null && g.sampleIds.length < 3) g.sampleIds.push(r.id);
      groups.set(reason, g);
    }
  }
  return [...groups]
    .map(([reason, g]) => ({ reason, count: g.count, sampleIds: g.sampleIds }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}
