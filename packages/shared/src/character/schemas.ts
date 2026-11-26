import { z } from "zod";
import { GameIdSchema, NameI18nSchema } from "../game/common.js";

/** Ranuras de equipo, en el orden en que se muestran en el armory. */
export const EQUIPMENT_SLOTS = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "shirt",
  "tabard",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger1",
  "finger2",
  "trinket1",
  "trinket2",
  "mainhand",
  "offhand",
  "ranged",
] as const;
export const EquipmentSlotSchema = z.enum(EQUIPMENT_SLOTS);
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;

/** Ranuras cosméticas: no cuentan para estadísticas, nivel de objeto medio ni carencias. */
export const COSMETIC_SLOTS: readonly EquipmentSlot[] = ["shirt", "tabard"];

export const ITEM_QUALITIES = ["poor", "common", "uncommon", "rare", "epic", "legendary"] as const;
export const ItemQualitySchema = z.enum(ITEM_QUALITIES);
export type ItemQuality = z.infer<typeof ItemQualitySchema>;

export const STAT_KEYS = [
  "strength",
  "agility",
  "stamina",
  "intellect",
  "spirit",
  "armor",
  "attackPower",
  "spellPower",
  "crit",
  "hit",
] as const;
export const StatKeySchema = z.enum(STAT_KEYS);
export type StatKey = z.infer<typeof StatKeySchema>;

export const StatsSchema = z.partialRecord(StatKeySchema, z.number().int().nonnegative());
export type Stats = z.infer<typeof StatsSchema>;

/** Slots que admiten encantamiento en el ruleset base (se afinará con datos reales). */
export const ENCHANTABLE_SLOTS: readonly EquipmentSlot[] = [
  "head",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "legs",
  "feet",
  "finger1",
  "finger2",
  "mainhand",
];

export const EquippedItemSchema = z.object({
  slot: EquipmentSlotSchema,
  itemId: GameIdSchema,
  name: NameI18nSchema,
  quality: ItemQualitySchema,
  itemLevel: z.number().int().nonnegative(),
  stats: StatsSchema,
  /** Texto del encantamiento aplicado, si lo hay. */
  enchant: z.string().min(1).optional(),
  /** Ranuras de gema: cuántas tiene y cuántas están rellenas. */
  sockets: z.number().int().nonnegative().default(0),
  gems: z.number().int().nonnegative().default(0),
});
export type EquippedItem = z.infer<typeof EquippedItemSchema>;

export const CLASS_IDS = [
  "warrior",
  "paladin",
  "hunter",
  "rogue",
  "priest",
  "shaman",
  "mage",
  "warlock",
  "druid",
] as const;
export const ClassIdSchema = z.enum(CLASS_IDS);
export type ClassId = z.infer<typeof ClassIdSchema>;

export const ProfessionSkillSchema = z.object({
  professionId: GameIdSchema,
  name: NameI18nSchema,
  skill: z.number().int().nonnegative(),
  max: z.number().int().positive(),
});

export const CharacterSnapshotSchema = z
  .object({
    name: z.string().trim().min(1),
    /** Forever exige apellido. */
    surname: z.string().trim().min(1),
    classId: ClassIdSchema,
    level: z.number().int().min(1).max(60),
    takenAt: z.iso.datetime(),
    equipment: z.array(EquippedItemSchema),
    professions: z.array(ProfessionSkillSchema),
  })
  .refine(
    (c) => new Set(c.equipment.map((e) => e.slot)).size === c.equipment.length,
    "ranura de equipo repetida",
  )
  .refine(
    (c) => c.professions.every((p) => p.skill <= p.max),
    "skill de profesión por encima del máximo",
  );
export type CharacterSnapshot = z.infer<typeof CharacterSnapshotSchema>;
