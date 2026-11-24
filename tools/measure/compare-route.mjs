/**
 * Compara el optimizador con la ruta de SkillUp (Leatherworking 148 → 300):
 *
 *   pnpm --filter @minmax-codex/measure compare-route
 *
 * 1. Coste de la ruta de SkillUp con NUESTRO modelo de costes (precios de la lista de compras y observados).
 * 2. Plan del optimizador con umbrales AJUSTADOS a esa ruta (⚠ inferidos de valores calculados por SkillUp, no medidos).
 *
 * Precios extra opcionales: data/prices.csv (item,price_copper). Requiere `probe catalog` y `pnpm build`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCostModel, planProfession } from "@minmax-codex/optimizer";
import { copper, formatMoney } from "@minmax-codex/shared";
import { fitThresholds, nameOf, parseCsv, quantityOf } from "./lib.mjs";

const ref = join(import.meta.dirname, "reference");
const catalogDir = join(import.meta.dirname, "..", "api-probe", "out", "catalog", "recipes");
if (!existsSync(catalogDir)) {
  console.error(
    `Falta ${catalogDir}\n→ ejecuta primero: pnpm --filter @minmax-codex/api-probe probe catalog`,
  );
  process.exit(1);
}
const read = (file) => parseCsv(readFileSync(file, "utf8"));
const money = (n) => formatMoney(copper(Math.max(0, Math.round(n))));

const steps = read(join(ref, "skillup-route-steps-leatherworking-148.csv"));
const reagentRows = read(join(ref, "skillup-route-reagents-leatherworking-148.csv"));
const startSkill = Number(steps.find((s) => s.type === "craft")?.skill_from);
const targetSkill = Math.max(...steps.map((s) => Number(s.skill_to) || 0));

// Precios por nombre: lista de compras (coste / unidades que faltan) → observados → data/prices.csv
const priceByName = new Map();
for (const r of reagentRows) {
  const missing = Number(r.need) - Number(r.have);
  if (missing > 0) priceByName.set(r.reagent.toLowerCase(), Number(r.total_copper) / missing);
}
const extra = [
  join(ref, "prices-observed-2026-11-20.csv"),
  join(import.meta.dirname, "data", "prices.csv"),
];
for (const file of extra) {
  if (!existsSync(file)) continue;
  for (const r of read(file)) priceByName.set(r.item.toLowerCase(), Number(r.price_copper));
}

// Recetas del catálogo
const recipeIds = [...new Set(steps.filter((s) => s.recipe_id).map((s) => Number(s.recipe_id)))];
const catalog = new Map();
for (const id of recipeIds) {
  const file = join(catalogDir, `${id}.json`);
  if (existsSync(file)) catalog.set(id, JSON.parse(readFileSync(file, "utf8")));
}
const missingRecipes = recipeIds.filter((id) => !catalog.has(id));
if (missingRecipes.length) console.warn(`Recetas sin descargar: ${missingRecipes.join(", ")}`);

const pricesById = new Map();
for (const recipe of catalog.values()) {
  for (const r of recipe.reagents ?? []) {
    const price = priceByName.get(nameOf(r.reagent?.name).toLowerCase());
    if (price !== undefined) pricesById.set(r.reagent.id, copper(Math.round(price)));
  }
  const crafted = nameOf(recipe.crafted_item?.name).toLowerCase();
  const price = priceByName.get(crafted);
  if (price !== undefined && recipe.crafted_item?.id)
    pricesById.set(recipe.crafted_item.id, copper(Math.round(price)));
}

// Adquisición: «Train X» / «Buy Pattern» por nombre; «Artisan» como hito
const acquisitionFor = (name) => {
  const hit = steps.find(
    (s) => ["train", "buy_pattern"].includes(s.type) && s.item.toLowerCase() === name.toLowerCase(),
  );
  if (!hit) return { kind: "known" };
  return {
    kind: hit.type === "buy_pattern" ? "pattern" : "trainer",
    cost: copper(Number(hit.cost_copper)),
  };
};
const milestones = steps
  .filter((s) => s.type === "train" && /rank/i.test(s.item))
  .map((s) => ({
    label: s.item,
    atSkill: Number(/skill (\d+)/i.exec(s.item)?.[1] ?? 0),
    cost: copper(Number(s.cost_copper)),
  }));

const toRecipe = (id, thresholds, minSkill) => {
  const body = catalog.get(id);
  return {
    id,
    name: nameOf(body.name),
    minSkill,
    thresholds,
    reagents: (body.reagents ?? []).map((r) => ({ itemId: r.reagent.id, quantity: r.quantity })),
    ...(body.crafted_item?.id ? { craftedItemId: body.crafted_item.id } : {}),
    craftedQuantity: Number(quantityOf(body.crafted_quantity)) || 1,
    acquisition: acquisitionFor(nameOf(body.name)),
  };
};

// ── 1. Ruta de SkillUp con nuestro modelo de costes ───────────────────────────
const neutral = { yellow: 1000, grey: 1100 };
const known = [...catalog.keys()].map((id) => toRecipe(id, neutral, 0));
const model = createCostModel(known, pricesById);
console.log(`\n1) Ruta de SkillUp (${startSkill} → ${targetSkill}) con nuestros precios\n`);
console.log("receta                          crafteos  SkillUp          nuestro          dif.");
let theirs = 0;
let ours = 0;
const unpriced = [];
for (const s of steps.filter((x) => x.type === "craft")) {
  const recipe = known.find((r) => r.id === Number(s.recipe_id));
  const unit = recipe ? model.craftCost(recipe) : null;
  if (unit === null || unit === undefined) {
    unpriced.push(s.item);
    console.log(
      `${s.item.padEnd(31)} ${String(s.crafts).padStart(8)}  ${money(Number(s.cost_copper)).padEnd(16)} (sin precio de algún reactivo)`,
    );
    continue;
  }
  const cost = unit * Number(s.crafts);
  theirs += Number(s.cost_copper);
  ours += cost;
  console.log(
    `${s.item.padEnd(31)} ${String(s.crafts).padStart(8)}  ${money(Number(s.cost_copper)).padEnd(16)} ${money(cost).padEnd(16)} ${money(Math.abs(cost - Number(s.cost_copper)))}${cost < Number(s.cost_copper) ? " menos" : " más"}`,
  );
}
console.log(`\nTotal de materiales comparables: SkillUp ${money(theirs)} · nuestro ${money(ours)}`);
console.log(
  "(SkillUp resta lo que ya tienes en bolsas y usó precios de su escaneo: las diferencias pequeñas son esperables.)",
);
if (unpriced.length)
  console.log(
    `Sin precio: ${unpriced.join(", ")} → añade precios en data/prices.csv (item,price_copper).`,
  );

// ── 2. Optimizador con umbrales ajustados ─────────────────────────────────────
const segments = new Map();
for (const s of steps.filter((x) => x.type === "craft")) {
  const list = segments.get(s.recipe_id) ?? [];
  list.push({ from: Number(s.skill_from), to: Number(s.skill_to), crafts: Number(s.crafts) });
  segments.set(s.recipe_id, list);
}
const fit = fitThresholds(segments);
if (!fit) {
  console.error("No se pudieron ajustar umbrales a la ruta.");
  process.exit(1);
}
console.log(
  `\n2) Optimizador con umbrales AJUSTADOS a la ruta (separación amarillo→gris ${fit.gap}; no medidos)\n`,
);
const firstUse = new Map();
for (const [id, list] of segments) firstUse.set(id, Math.min(...list.map((x) => x.from)));
const recipes = [...catalog.keys()]
  .filter((id) => fit.fits.has(String(id)))
  .map((id) => {
    const f = fit.fits.get(String(id));
    return toRecipe(id, { yellow: f.yellow, grey: f.grey }, firstUse.get(String(id)) ?? 0);
  });
// Intermedios fabricables (recetas «material»): sin umbrales propios, solo para comprar-vs-fabricar
const intermediates = steps
  .filter((s) => s.type === "material" && catalog.has(Number(s.recipe_id)))
  .map((s) => toRecipe(Number(s.recipe_id), neutral, 9999));
const plan = planProfession({
  startSkill,
  targetSkill,
  recipes: [...recipes, ...intermediates],
  prices: pricesById,
  milestones,
});
if (!plan) {
  console.log("Sin plan posible: faltan precios de reactivos o recetas utilizables.");
  process.exit(0);
}
console.log("tramo       crafteos  receta");
for (const st of plan.steps) {
  console.log(
    `${`${st.fromSkill}-${st.toSkill}`.padEnd(11)} ${String(st.crafts).padStart(8)}  ${st.recipeName}`,
  );
}
console.log("\nSkillUp:");
for (const s of steps.filter((x) => x.type === "craft")) {
  console.log(
    `${`${s.skill_from}-${s.skill_to}`.padEnd(11)} ${String(s.crafts).padStart(8)}  ${s.item}`,
  );
}
console.log(
  `\nPlan del optimizador: materiales ${formatMoney(plan.materialsCost)} + recetas ${formatMoney(plan.acquisitionCost)} + hitos ${formatMoney(plan.milestoneCost)} = ${formatMoney(plan.totalCost)}`,
);
console.log(
  "⚠ minSkill de las recetas de entrenador = primer uso en la ruta de SkillUp (falta M3); el resultado depende de esa suposición.",
);
