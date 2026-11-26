import { z } from "zod";
import { GameIdSchema, LocalizedStringSchema } from "./common.js";

/**
 * Formas CRUDAS de la API de Battle.net (static-forever). Son tolerantes: aceptan campos que no
 * conocemos (`looseObject`) y solo exigen lo que el resto del sistema necesita. Cualquier dato que
 * viene de fuera es no confiable hasta pasar estos esquemas (RN-09).
 */

const RefSchema = z.looseObject({ id: GameIdSchema, name: LocalizedStringSchema.optional() });

const QuantitySchema = z.number().int().positive();

/** Cantidad fabricada: número, `{ value }` o `{ minimum, maximum }`. */
export const RawCraftedQuantitySchema = z.union([
  QuantitySchema,
  z.looseObject({ value: QuantitySchema }),
  z
    .looseObject({ minimum: QuantitySchema, maximum: QuantitySchema })
    .refine((q) => q.minimum <= q.maximum, "el mínimo supera al máximo"),
]);

export const RawRecipeSchema = z.looseObject({
  id: GameIdSchema,
  name: LocalizedStringSchema,
  description: LocalizedStringSchema.optional(),
  rank: z.number().int().nonnegative().optional(),
  reagents: z.array(z.looseObject({ reagent: RefSchema, quantity: QuantitySchema })),
  crafted_item: RefSchema.optional(),
  crafted_quantity: RawCraftedQuantitySchema.optional(),
});
export type RawRecipe = z.infer<typeof RawRecipeSchema>;

export const RawItemSchema = z.looseObject({
  id: GameIdSchema,
  name: LocalizedStringSchema,
  sell_price: z.number().int().nonnegative().optional(),
  purchase_price: z.number().int().nonnegative().optional(),
  preview_item: z
    .looseObject({
      binding: z.looseObject({ type: z.string() }).optional(),
    })
    .optional(),
});
export type RawItem = z.infer<typeof RawItemSchema>;
