#!/usr/bin/env node
/**
 * Muestra un resumen legible de lo descargado por `probe discover` (carpeta out/discover/).
 *
 *   pnpm --filter @minmax-codex/api-probe inspect                     # resumen general
 *   pnpm --filter @minmax-codex/api-probe inspect -- --file=search_item --n=3
 *   pnpm --filter @minmax-codex/api-probe inspect -- --file=item_10001 --chars=2500
 *
 * `--file` es un fragmento del nombre de archivo guardado; `--n` cuántos elementos de la
 * primera lista mostrar; `--chars` el máximo de caracteres a imprimir.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { findIndexList, parseArgs, toNumber } from "./lib.mjs";

const { flags } = parseArgs(process.argv.slice(2));
const dir = join(import.meta.dirname, "out", "discover");
const maxChars = toNumber(flags.chars, 1500);

async function readJson(name) {
  return JSON.parse(await readFile(join(dir, name), "utf8"));
}

let files;
try {
  files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
} catch {
  console.error("No existe out/discover/: ejecuta antes `probe discover`.");
  process.exit(1);
}

if (flags.file) {
  const matches = files.filter((f) => f.includes(flags.file));
  if (matches.length === 0) {
    console.error(`Ningún archivo contiene "${flags.file}". Disponibles:\n${files.join("\n")}`);
    process.exit(1);
  }
  for (const name of matches.slice(0, 3)) {
    const body = await readJson(name);
    const list = findIndexList(body);
    console.log(`--- ${name} · claves: ${Object.keys(body).join(", ")}`);
    const shown = list ? list.key : null;
    const sample = shown ? body[shown].slice(0, toNumber(flags.n, 2)) : body;
    console.log(JSON.stringify(sample).slice(0, maxChars));
  }
} else {
  const summary = await readJson("discover-summary.json");
  console.log("--- 200 sin lista detectada (path, bytes, claves)");
  for (const row of summary.rows) {
    if (row.status === 200 && !row.list) {
      console.log(row.path, row.bytes, JSON.stringify(row.keys));
    }
  }
  console.log("\n--- detalle del primer elemento de cada índice");
  for (const row of summary.rows) {
    if (row.detail) console.log(row.path, "->", row.detail.path, JSON.stringify(row.detail.keys));
  }
  const search = files.find((f) => f.includes("search_item"));
  if (search) {
    const body = await readJson(search);
    console.log(`\n--- ${search} · claves: ${Object.keys(body).join(", ")}`);
    console.log(JSON.stringify((body.results ?? []).slice(0, 2)).slice(0, maxChars));
  }
}
