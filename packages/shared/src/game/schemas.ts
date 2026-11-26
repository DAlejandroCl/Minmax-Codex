import { z } from "zod";
import { CopperSchema } from "../money.js";
import { GameIdSchema, NameI18nSchema } from "./common.js";

/** Ligadura del ítem. `on_pickup` es BoP («se liga al recogerlo»). `unknown` = tipo que no reconocemos. */
export const BindingSchema = z.enum(["none", "on_pickup", "on_equip", "on_use", "unknown"]);
export type Binding = z.infer<typeof BindingSchema>;

/**
 * Ítem de juego normalizado. Solo incluye campos verificados contra la API real; `slot`, `quality`,
 * `stats`… se añadirán cuando haya datos reales de ítems de equipo (H-018/H-032).
 */
export const GameItemSchema = z.object({
  id: GameIdSchema,
  name: NameI18nSchema,
  sellPrice: CopperSchema.optional(),
  purchasePrice: CopperSchema.optional(),
  binding: BindingSchema,
});
export type GameItem = z.infer<typeof GameItemSchema>;

export const GameReagentSchema = z.object({
  itemId: GameIdSchema,
  quantity: z.number().int().positive(),
});
export type GameReagent = z.infer<typeof GameReagentSchema>;

export const CraftedQuantitySchema = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .refine((q) => q.min <= q.max, "min supera a max");
export type CraftedQuantity = z.infer<typeof CraftedQuantitySchema>;

/** Umbrales de color como habilidad: naranja hasta `yellow`, gris desde `grey` (ADR-010, SP-4). */
export const ColorThresholdsSchema = z
  .object({ yellow: z.number().int().nonnegative(), grey: z.number().int().nonnegative() })
  .refine((t) => t.yellow <= t.grey, "yellow supera a grey");
export type ColorThresholds = z.infer<typeof ColorThresholdsSchema>;

/** Cómo se obtiene una receta (tabla `recipe_source` del modelo de dominio). */
export const RecipeSourceSchema = z.object({
  type: z.enum(["trainer", "vendor", "auction", "drop", "quest", "reputation"]),
  refId: GameIdSchema.optional(),
  cost: CopperSchema.optional(),
  binding: BindingSchema.optional(),
});
export type RecipeSource = z.infer<typeof RecipeSourceSchema>;

export const GameRecipeSchema = z.object({
  id: GameIdSchema,
  name: NameI18nSchema,
  professionId: GameIdSchema.optional(),
  rank: z.number().int().nonnegative().optional(),
  /** Habilidad mínima; se mide o se deduce del patrón (SP-4), no viene en la receta de la API. */
  minSkill: z.number().int().min(0).max(1000).optional(),
  thresholds: ColorThresholdsSchema.optional(),
  craftedItemId: GameIdSchema.optional(),
  craftedQuantity: CraftedQuantitySchema,
  reagents: z.array(GameReagentSchema),
  sources: z.array(RecipeSourceSchema),
});
export type GameRecipe = z.infer<typeof GameRecipeSchema>;
