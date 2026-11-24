import { copper, fromGsc } from "@minmax-codex/shared";
import type { Copper } from "@minmax-codex/shared";
import type { ItemId, Milestone, Recipe } from "@minmax-codex/optimizer";

/**
 * DATOS DE EJEMPLO. No son datos oficiales ni medidos: sirven para probar la calculadora hasta que el ETL (H-011)
 * publique los artefactos por build. Los umbrales de color son valores de prueba.
 */
export type ItemSource = "vendor" | "auction";

export interface ItemInfo {
  readonly id: ItemId;
  readonly name: { readonly es: string; readonly en: string };
  readonly source: ItemSource;
  readonly defaultPrice: Copper;
}

export const DEMO_ITEMS: readonly ItemInfo[] = [
  {
    id: 1,
    name: { es: "Hilo fino", en: "Fine thread" },
    source: "vendor",
    defaultPrice: copper(90),
  },
  {
    id: 2,
    name: { es: "Hilo de seda", en: "Silken thread" },
    source: "vendor",
    defaultPrice: copper(500),
  },
  {
    id: 3,
    name: { es: "Cuero pesado", en: "Heavy leather" },
    source: "auction",
    defaultPrice: copper(180),
  },
  {
    id: 4,
    name: { es: "Cuero grueso", en: "Thick leather" },
    source: "auction",
    defaultPrice: copper(600),
  },
  {
    id: 5,
    name: { es: "Tinte negro", en: "Black dye" },
    source: "auction",
    defaultPrice: copper(900),
  },
  {
    id: 6,
    name: { es: "Escama verde", en: "Green scale" },
    source: "auction",
    defaultPrice: copper(800),
  },
  {
    id: 7,
    name: { es: "Piel curada", en: "Cured hide" },
    source: "auction",
    defaultPrice: copper(11_500),
  },
  {
    id: 8,
    name: { es: "Piel cruda", en: "Raw hide" },
    source: "auction",
    defaultPrice: copper(500),
  },
  {
    id: 9,
    name: { es: "Sal refinada", en: "Refined salt" },
    source: "auction",
    defaultPrice: fromGsc(63),
  },
];

const trainer = (cost: number): Recipe["acquisition"] => ({ kind: "trainer", cost: copper(cost) });
const pattern = (cost: number): Recipe["acquisition"] => ({ kind: "pattern", cost: copper(cost) });

export interface RecipeInfo {
  readonly recipe: Recipe;
  readonly name: { readonly es: string; readonly en: string };
}

const r = (
  id: number,
  name: RecipeInfo["name"],
  recipe: Omit<Recipe, "id" | "name" | "craftedQuantity"> & { craftedQuantity?: number },
): RecipeInfo => ({
  name,
  recipe: { id, name: name.en, craftedQuantity: 1, ...recipe },
});

export const DEMO_RECIPES: readonly RecipeInfo[] = [
  r(
    101,
    { es: "Capa de cuero", en: "Leather cloak" },
    {
      minSkill: 100,
      thresholds: { yellow: 150, grey: 175 },
      reagents: [
        { itemId: 1, quantity: 2 },
        { itemId: 3, quantity: 2 },
      ],
      acquisition: { kind: "known" },
    },
  ),
  r(
    102,
    { es: "Guantes reforzados", en: "Reinforced gloves" },
    {
      minSkill: 130,
      thresholds: { yellow: 165, grey: 190 },
      reagents: [
        { itemId: 3, quantity: 3 },
        { itemId: 1, quantity: 2 },
      ],
      acquisition: trainer(2_500),
    },
  ),
  r(
    103,
    { es: "Cinturón de escamas", en: "Scale belt" },
    {
      minSkill: 160,
      thresholds: { yellow: 190, grey: 215 },
      reagents: [
        { itemId: 4, quantity: 3 },
        { itemId: 2, quantity: 1 },
      ],
      acquisition: trainer(2_800),
    },
  ),
  r(
    104,
    { es: "Peto bárbaro", en: "Barbaric harness" },
    {
      minSkill: 175,
      thresholds: { yellow: 205, grey: 230 },
      reagents: [
        { itemId: 4, quantity: 4 },
        { itemId: 2, quantity: 2 },
      ],
      acquisition: trainer(3_500),
    },
  ),
  r(
    105,
    { es: "Pantalones de la noche", en: "Night pants" },
    {
      minSkill: 200,
      thresholds: { yellow: 235, grey: 260 },
      reagents: [
        { itemId: 4, quantity: 2 },
        { itemId: 1, quantity: 1 },
        { itemId: 5, quantity: 1 },
      ],
      acquisition: trainer(4_600),
    },
  ),
  r(
    106,
    { es: "Guanteletes malvados", en: "Wicked gauntlets" },
    {
      minSkill: 225,
      thresholds: { yellow: 255, grey: 285 },
      reagents: [
        { itemId: 7, quantity: 1 },
        { itemId: 4, quantity: 4 },
      ],
      acquisition: pattern(10_800),
    },
  ),
  r(
    107,
    { es: "Grebas de escamas azules", en: "Blue scale leggings" },
    {
      minSkill: 250,
      thresholds: { yellow: 285, grey: 315 },
      reagents: [
        { itemId: 6, quantity: 6 },
        { itemId: 7, quantity: 1 },
      ],
      acquisition: pattern(50_000),
    },
  ),
  // Intermedio: no sube habilidad (gris desde el principio); solo compite «comprar vs. fabricar».
  r(
    900,
    { es: "Curar piel", en: "Cure hide" },
    {
      minSkill: 0,
      thresholds: { yellow: 0, grey: 0 },
      reagents: [
        { itemId: 8, quantity: 1 },
        { itemId: 9, quantity: 1 },
      ],
      craftedItemId: 7,
      craftedQuantity: 2,
      acquisition: { kind: "known" },
    },
  ),
];

export const DEMO_MILESTONES: readonly Milestone[] = [
  { label: "Artesano", atSkill: 200, cost: fromGsc(5) },
];

export const SKILL_MIN = 1;
export const SKILL_MAX = 300;
