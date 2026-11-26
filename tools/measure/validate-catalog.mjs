/**
 * Valida con los normalizadores de H-010 el catálogo descargado por `probe catalog`.
 *
 *   pnpm --filter @minmax-codex/shared build
 *   pnpm --filter @minmax-codex/measure validate-catalog
 *
 * Lee tools/api-probe/out/catalog/{recipes,items}/*.json (si existen), imprime cuántos registros se aceptan,
 * cuáles se rechazan y los motivos más frecuentes con ids de ejemplo. No escribe ningún dato.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeItems, normalizeRecipes, summarizeReasons } from "@minmax-codex/shared";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "api-probe", "out", "catalog");

function load(dir) {
  const path = join(root, dir);
  if (!existsSync(path)) return null;
  const out = [];
  for (const file of readdirSync(path).filter((f) => f.endsWith(".json"))) {
    try {
      out.push(JSON.parse(readFileSync(join(path, file), "utf8")));
    } catch {
      out.push(undefined);
    }
  }
  return out;
}

function report(label, batch, total) {
  console.log(`\n${label}: ${total} leídos`);
  console.log(`  aceptados: ${batch.accepted.length}`);
  console.log(`  rechazados: ${batch.rejected.length}`);
  console.log(`  con avisos: ${batch.warnings.length}`);
  const asRejections = batch.warnings.map((w) => ({ id: w.id, reasons: w.messages }));
  for (const [title, list] of [
    ["Motivos de rechazo", batch.rejected],
    ["Avisos", asRejections],
  ]) {
    const summary = summarizeReasons(list);
    if (summary.length === 0) continue;
    console.log(`  ${title}:`);
    for (const s of summary.slice(0, 10)) {
      console.log(`    ${s.count} × ${s.reason}  (ej.: ${s.sampleIds.slice(0, 3).join(", ")})`);
    }
  }
}

const recipes = load("recipes");
const items = load("items");
if (!recipes && !items) {
  console.error(`No hay datos en ${root}. Ejecuta primero \`probe catalog\`.`);
  process.exit(1);
}
if (recipes) report("Recetas", normalizeRecipes(recipes), recipes.length);
if (items) report("Objetos", normalizeItems(items), items.length);
