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
  /** Precio habitual, para detectar precios atípicos. */
  readonly reference: Copper;
  /** Antigüedad de la observación del precio de mercado, en días. Los vendedores no la tienen. */
  readonly observedDaysAgo?: number;
}

const vendor = (id: ItemId, es: string, en: string, price: number): ItemInfo => ({
  id,
  name: { es, en },
  source: "vendor",
  defaultPrice: copper(price),
  reference: copper(price),
});
const auction = (
  id: ItemId,
  es: string,
  en: string,
  price: number,
  reference: number,
  observedDaysAgo: number,
): ItemInfo => ({
  id,
  name: { es, en },
  source: "auction",
  defaultPrice: copper(price),
  reference: copper(reference),
  observedDaysAgo,
});

export const DEMO_ITEMS: readonly ItemInfo[] = [
  vendor(1, "Hilo fino", "Fine thread", 90),
  vendor(2, "Hilo de seda", "Silken thread", 500),
  auction(3, "Cuero pesado", "Heavy leather", 180, 180, 1),
  auction(4, "Cuero grueso", "Thick leather", 600, 600, 2),
  auction(5, "Tinte negro", "Black dye", 900, 900, 3),
  auction(6, "Escama verde", "Green scale", 800, 800, 1),
  // Ejemplo de precio dudoso: viejo y muy por encima de lo habitual (como el de 37.5g que vimos en SkillUp).
  auction(7, "Piel curada", "Cured hide", fromGsc(37, 50), 11_500, 30),
  auction(8, "Piel cruda", "Raw hide", 500, 500, 2),
  auction(9, "Sal refinada", "Refined salt", fromGsc(63), fromGsc(63), 4),
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
      craftedQuantity: 1,
      acquisition: { kind: "known" },
    },
  ),
];

export const DEMO_MILESTONES: readonly Milestone[] = [
  { label: "Artesano", atSkill: 200, cost: fromGsc(5) },
];

export const SKILL_MIN = 1;
export const SKILL_MAX = 300;
