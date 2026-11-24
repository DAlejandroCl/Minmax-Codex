/**
 * Compara los reactivos de una ruta de SkillUp con los que salen del catálogo de la API:
 *
 *   pnpm --filter @minmax-codex/measure verify-route
 *
 * Usa reference/skillup-route-steps-leatherworking-148.csv y reference/skillup-route-reagents-leatherworking-148.csv
 * (reactivos totales según SkillUp) y las recetas guardadas por `probe catalog` en tools/api-probe/out/catalog/recipes.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv, routeReagents } from "./lib.mjs";

const ref = join(import.meta.dirname, "reference");
const dir = join(import.meta.dirname, "..", "api-probe", "out", "catalog", "recipes");
if (!existsSync(dir)) {
  console.error(
    `Falta ${dir}\n→ ejecuta primero: pnpm --filter @minmax-codex/api-probe probe catalog`,
  );
  process.exit(1);
}
const steps = parseCsv(
  readFileSync(join(ref, "skillup-route-steps-leatherworking-148.csv"), "utf8"),
);
const expected = parseCsv(
  readFileSync(join(ref, "skillup-route-reagents-leatherworking-148.csv"), "utf8"),
);
const recipes = new Map();
for (const s of steps) {
  if (!s.recipe_id) continue;
  const file = join(dir, `${s.recipe_id}.json`);
  if (existsSync(file)) recipes.set(Number(s.recipe_id), JSON.parse(readFileSync(file, "utf8")));
}
const { needs, missing } = routeReagents(steps, recipes);
if (missing.length) {
  const ids = [...new Set(missing)].map((m) => m || "(paso sin recipe_id)");
  console.warn(`Recetas no encontradas en el catálogo: ${ids.join(", ")}`);
}

const lower = new Map([...needs].map(([k, v]) => [k.toLowerCase(), v]));
console.log("reactivo         SkillUp  catálogo  dif.");
let bad = 0;
for (const e of expected) {
  const calc = lower.get(e.reagent.toLowerCase());
  const diff = calc === undefined ? null : calc - Number(e.need);
  if (diff !== 0) bad += 1;
  console.log(
    `${e.reagent.padEnd(16)} ${String(e.need).padStart(7)}  ${String(calc ?? "—").padStart(8)}  ${diff ?? "no está"}`,
  );
}
const extra = [...needs].filter(
  ([k, v]) => v > 0 && !expected.some((e) => e.reagent.toLowerCase() === k.toLowerCase()),
);
if (extra.length)
  console.log(
    `\nReactivos del catálogo que SkillUp no lista (¿ya los tienes o es una vista parcial?):\n${extra.map(([k, v]) => `  ${k}: ${v}`).join("\n")}`,
  );
console.log(
  bad === 0
    ? "\n✓ Coincide con SkillUp."
    : `\n⚠ ${bad} reactivo(s) difieren: revisa recetas, rangos de crafteos o reactivos de la vista (la ventana de SkillUp muestra solo parte de la lista).`,
);
