/**
 * Captura rápida de M1: añade una observación por receta de la hoja a data/m1-observed.csv.
 *
 *   pnpm --filter @minmax-codex/measure m1-add -- --profession=leatherworking --skill=150 --colors=y,y,g,g,y,y,o,o,y,o,o,o,o,o,o
 *
 * Los colores van en el orden de data/m1-<profesión>.csv: o naranja, y amarillo, g verde, x gris, - no visible.
 * Analiza el resultado con: pnpm --filter @minmax-codex/measure analyze colors data/m1-observed.csv
 */
import { existsSync, readFileSync } from "node:fs";
import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expandCheckpoint, parseCsv, toCsv } from "./lib.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--") && a.includes("="))
    .map((a) => [a.slice(2, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]),
);
if (!args.profession || !args.skill || !args.colors) {
  console.error("Uso: m1-add -- --profession=<Profesión> --skill=<N> --colors=<o,y,g,x,-,...>");
  process.exit(1);
}
const dir = join(import.meta.dirname, "data");
const sheetFile = join(dir, `m1-${args.profession.toLowerCase().replaceAll(" ", "-")}.csv`);
if (!existsSync(sheetFile)) {
  console.error(`Falta ${sheetFile}: ejecuta antes select-m1.`);
  process.exit(1);
}
const sheet = parseCsv(readFileSync(sheetFile, "utf8"));
const today = new Date().toISOString().slice(0, 10);
const rows = expandCheckpoint(sheet, {
  skill: Number(args.skill),
  codes: args.colors,
  date: today,
});
const headers = ["date", "profession", "recipe_id", "recipe", "req_skill", "skill", "color"];
const out = join(dir, "m1-observed.csv");
if (!existsSync(out)) await writeFile(out, toCsv(headers, rows));
else await appendFile(out, toCsv(headers, rows).split("\n").slice(1).join("\n"));
console.log(`✓ ${rows.length} observaciones a habilidad ${args.skill} → ${out}`);
