/**
 * Elige recetas para M1 (umbrales de color) de una profesión a partir de data/recipes.csv:
 *
 *   pnpm --filter @minmax-codex/measure select-m1 -- --profession=Tailoring [--count=15] [--min=1] [--max=150]
 *
 * Escribe data/m1-<profesión>.csv con las columnas de colors.csv listas para rellenar `skill` y `color`.
 */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, selectM1, toCsv } from "./lib.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--") && a.includes("="))
    .map((a) => a.slice(2).split("=")),
);
if (!args.profession) {
  console.error("Uso: select-m1 -- --profession=<Profesión> [--count=15] [--min=N] [--max=N]");
  process.exit(1);
}
const rows = parseCsv(readFileSync(join(import.meta.dirname, "data", "recipes.csv"), "utf8"));
const picked = selectM1(rows, {
  profession: args.profession,
  count: Number(args.count ?? 15),
  minReq: Number(args.min ?? 0),
  maxReq: Number(args.max ?? Infinity),
});
if (picked.length === 0) {
  console.error(`Sin recetas con habilidad mínima para «${args.profession}».`);
  process.exit(1);
}
console.log("req  id      reactivos  receta");
for (const r of picked)
  console.log(
    `${String(r.req).padEnd(4)} ${String(r.recipe_id).padEnd(7)} ${String(r.reagents).padEnd(10)} ${r.recipe}`,
  );
const file = join(
  import.meta.dirname,
  "data",
  `m1-${args.profession.toLowerCase().replaceAll(" ", "-")}.csv`,
);
const headers = ["date", "profession", "recipe_id", "recipe", "req_skill", "skill", "color"];
await writeFile(
  file,
  toCsv(
    headers,
    picked.map((r) => ({
      date: "",
      profession: r.profession,
      recipe_id: r.recipe_id,
      recipe: r.recipe,
      req_skill: r.min_skill,
      skill: "",
      color: "",
    })),
  ),
);
console.log(`\n→ ${file}`);
