#!/usr/bin/env node
/**
 * Comprueba qué significa `purchase_price` y cómo son las entradas de /commodities, cruzando
 * lo descargado por `probe catalog`, `probe items` y `probe auction --commodities`.
 *
 *   pnpm --filter @minmax-codex/api-probe inspect:prices
 *
 * Pregunta que responde: ¿`purchase_price` > 0 distingue a los ítems que vende un NPC, o lo
 * tienen casi todos los ítems (incluidos los que solo se obtienen recolectando)?
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "out");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const ids = await readJson(join(OUT, "catalog", "item-ids.json")).catch(() => null);
if (!ids) {
  console.error("Falta out/catalog/item-ids.json (ejecuta `probe catalog` e `items`).");
  process.exit(1);
}
const auctionDirs = (await readdir(OUT)).filter((d) => d.startsWith("auction-")).sort();
let commodities = null;
for (const d of auctionDirs.reverse()) {
  commodities = await readJson(join(OUT, d, "ruleset-2-house-110-commodities.json")).catch(
    () => null,
  );
  if (commodities) break;
}
if (!commodities) {
  console.error("Falta el archivo de commodities (ejecuta `probe auction --commodities`).");
  process.exit(1);
}

const entries = commodities.auctions ?? [];
console.log("--- entrada de commodities (primera):", JSON.stringify(entries[0]));
const listing = new Map();
for (const e of entries) {
  const id = e.item?.id;
  const price = e.unit_price ?? e.buyout;
  if (!Number.isInteger(id) || typeof price !== "number") continue;
  const cur = listing.get(id) ?? { min: price, count: 0 };
  cur.min = Math.min(cur.min, price);
  cur.count += 1;
  listing.set(id, cur);
}

async function loadItem(id) {
  return readJson(join(OUT, "catalog", "items", `${id}.json`)).catch(() => null);
}

const table = {
  conSubasta_conPurchase: 0,
  conSubasta_sinPurchase: 0,
  sinSubasta_conPurchase: 0,
  sinSubasta_sinPurchase: 0,
  sinDatosDeItem: 0,
};
for (const id of ids.reagents) {
  const item = await loadItem(id);
  if (!item) {
    table.sinDatosDeItem += 1;
    continue;
  }
  const a = listing.has(id) ? "conSubasta" : "sinSubasta";
  const p = item.purchase_price > 0 ? "conPurchase" : "sinPurchase";
  table[`${a}_${p}`] += 1;
}
console.log("\n--- reactivos de recetas: subasta (commodities) × purchase_price > 0");
console.log(table);

console.log("\n--- ejemplos (nombre, purchase_price, sell_price, mínimo en subasta)");
for (const id of [2589, 2447, 765, 2835, 2840, 3371, 2592, 2318]) {
  const item = await loadItem(id);
  const l = listing.get(id);
  console.log(
    id,
    item?.name ?? "(sin datos)",
    "purchase:",
    item?.purchase_price,
    "sell:",
    item?.sell_price,
    "subasta:",
    l ? `${l.min} (${l.count} publicaciones)` : "—",
  );
}
