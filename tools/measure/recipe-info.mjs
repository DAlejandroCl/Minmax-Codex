/**
 * Muestra una receta del catálogo de la API: reactivos, cantidades y, si un reactivo se fabrica, su receta.
 *
 *   pnpm --filter @minmax-codex/measure recipe-info -- "Cured Rugged Hide"
 *   pnpm --filter @minmax-codex/measure recipe-info -- 5693
 *
 * Lee las recetas guardadas por `probe catalog` (tools/api-probe/out/catalog/recipes) y, si existe, data/recipes.csv.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findRecipes, nameOf, parseCsv, quantityOf, recipesCrafting } from "./lib.mjs";

const query = process.argv
  .slice(2)
  .filter((a) => a !== "--")
  .join(" ");
if (!query) {
  console.error('Uso: recipe-info -- "<nombre o id de receta>"');
  process.exit(1);
}
const dir = join(import.meta.dirname, "..", "api-probe", "out", "catalog", "recipes");
if (!existsSync(dir)) {
  console.error(
    `Falta ${dir}\n→ ejecuta primero: pnpm --filter @minmax-codex/api-probe probe catalog`,
  );
  process.exit(1);
}
const recipes = readdirSync(dir).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const csvFile = join(import.meta.dirname, "data", "recipes.csv");
const meta = new Map(
  existsSync(csvFile)
    ? parseCsv(readFileSync(csvFile, "utf8")).map((r) => [Number(r.recipe_id), r])
    : [],
);

const found = findRecipes(recipes, query);
if (found.length === 0) {
  console.error(`Sin resultados para «${query}».`);
  process.exit(1);
}
for (const r of found.slice(0, 10)) {
  const m = meta.get(r.id);
  console.log(
    `\n#${r.id} ${nameOf(r.name)}${m ? ` · ${m.profession} · ${m.category} · req ${m.min_skill || "?"}` : ""}`,
  );
  console.log(
    `  fabrica: ${nameOf(r.crafted_item?.name) || "—"} ×${quantityOf(r.crafted_quantity) || 1}`,
  );
  for (const x of r.reagents ?? []) {
    const name = nameOf(x.reagent?.name);
    console.log(`  - ${x.quantity} × ${name}`);
    for (const sub of recipesCrafting(recipes, name).slice(0, 3)) {
      const parts = (sub.reagents ?? [])
        .map((y) => `${y.quantity} × ${nameOf(y.reagent?.name)}`)
        .join(", ");
      console.log(`      se fabrica con la receta #${sub.id} «${nameOf(sub.name)}»: ${parts}`);
    }
  }
}
if (found.length > 10) console.log(`\n(… ${found.length - 10} más; afina la búsqueda)`);
