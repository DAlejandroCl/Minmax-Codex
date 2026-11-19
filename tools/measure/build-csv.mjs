/**
 * Genera los CSV de medición a partir del catálogo que ya guardó la sonda (sin llamar a la API):
 *
 *   pnpm --filter @minmax-codex/api-probe probe catalog               # una vez (recetas por profesión)
 *   pnpm --filter @minmax-codex/api-probe probe patterns -- --details # una vez (habilidad mínima de patrones)
 *   pnpm --filter @minmax-codex/measure build-csv
 *
 * Escribe data/recipes.csv, crafts.csv, colors.csv, trainers.csv y vendors.csv. Rellena lo que da la API y
 * deja en blanco lo que hay que medir en el juego. No sobrescribe archivos con datos propios: usa --force.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildDatasets, nameOf, parseCsv, toCsv } from "./lib.mjs";

const force = process.argv.includes("--force");
const OUT = join(import.meta.dirname, "..", "api-probe", "out");
const DATA = join(import.meta.dirname, "data");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const need = (file, hint) => {
  if (!existsSync(file)) {
    console.error(`Falta ${file}\n→ ${hint}`);
    process.exit(1);
  }
  return file;
};

const catalog = join(OUT, "catalog");
need(join(catalog, "catalog-summary.json"), "ejecuta primero: pnpm --filter @minmax-codex/api-probe probe catalog");
const tierFiles = readdirSync(join(catalog, "tiers"));
const professions = [];
for (const f of readdirSync(catalog).filter((n) => /^profession-\d+\.json$/.test(n))) {
  const prof = read(join(catalog, f));
  const tiers = tierFiles
    .filter((t) => t.startsWith(`${prof.id}-`))
    .map((t) => read(join(catalog, "tiers", t)));
  professions.push({ name: nameOf(prof.name) || `Profesión ${prof.id}`, tiers });
}
const recipes = new Map();
for (const f of readdirSync(join(catalog, "recipes"))) {
  const body = read(join(catalog, "recipes", f));
  recipes.set(body.id, body);
}

const reqFile = join(OUT, "patterns", "recipe-requirements.json");
const patFile = join(OUT, "patterns", "patterns.json");
const hasPatterns = existsSync(reqFile) && existsSync(patFile);
if (!hasPatterns) console.warn("Aviso: sin patrones (ejecuta `probe patterns -- --details`); min_skill y vendors.csv quedarán vacíos.");
const requirements = new Map(hasPatterns ? read(reqFile).map((r) => [r.recipeId, r]) : []);
const patterns = hasPatterns ? read(patFile) : [];

const data = buildDatasets({ professions, recipes, requirements, patterns });
const HEADERS = {
  recipes: Object.keys(data.recipes[0] ?? {}),
  crafts: ["date", "profession", "recipe", "skill_start", "color", "crafts", "skill_ups"],
  colors: ["date", "profession", "recipe", "req_skill", "skill", "color"],
  trainers: ["date", "profession", "trainer", "zone", "recipe", "req_skill", "cost_copper"],
  vendors: ["date", "vendor", "zone", "pattern", "cost_copper"],
};

await mkdir(DATA, { recursive: true });
for (const [name, rows] of Object.entries(data)) {
  const file = join(DATA, `${name}.csv`);
  if (existsSync(file) && !force && name !== "recipes") {
    const measured = parseCsv(readFileSync(file, "utf8")).some((r) => Object.values(r).some((v) => v !== "") && (r.color || r.crafts || r.trainer || r.vendor || r.zone));
    if (measured) {
      console.log(`= ${name}.csv ya tiene datos medidos: se conserva (usa --force para regenerar)`);
      continue;
    }
  }
  await writeFile(file, toCsv(HEADERS[name], rows));
  console.log(`✓ ${name}.csv · ${rows.length} filas`);
}
