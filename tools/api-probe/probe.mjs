#!/usr/bin/env node
/**
 * Sonda exploratoria de la API de Battle.net para WoW Forever (spikes SP-1 y SP-3).
 * Nunca imprime ni guarda el token ni el secreto. Llamadas secuenciales con pausa
 * (≥ 200 ms), reintento ante 429, sin paralelismo y sin scraping.
 *
 * Uso (desde la raíz del repo; requiere .env con BNET_CLIENT_ID / BNET_CLIENT_SECRET):
 *   pnpm --filter @wow-forever/api-probe probe                       # modo basic (ya ejecutado)
 *   pnpm --filter @wow-forever/api-probe probe catalog               # todas las recetas
 *   pnpm --filter @wow-forever/api-probe probe items                 # cobertura de ítems
 *   pnpm --filter @wow-forever/api-probe probe auction --compare     # casas por ruleset
 *   pnpm --filter @wow-forever/api-probe probe auction --house=110   # una casa (≈ 10 MB)
 *   pnpm --filter @wow-forever/api-probe probe -- --ns=dynamic-forever --path=/data/wow/ruleset/index
 *
 * Opciones: --limit=N (probar con pocas recetas/ítems), --profession=ID, --ruleset=ID,
 *           --static=<namespace> (p. ej. static-1.60.1_70399-forever), --delay=MS (solo pruebas).
 * `catalog` e `items` son reanudables: reutilizan lo ya descargado en out/catalog/.
 *
 * Variables opcionales (solo para pruebas con un servidor simulado):
 *   BNET_API_HOST, BNET_TOKEN_URL.
 *
 * Los Términos de la API limitan la retención: borra la carpeta out/ cuando termines.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  countKeys,
  createClient,
  fetchToken,
  parseArgs,
  recipeItemIds,
  recipeRefs,
  summarizeAuctionPayload,
  tierRefs,
  toNumber,
} from "./lib.mjs";

const { flags, positional } = parseArgs(process.argv.slice(2));
const mode = positional[0] ?? (flags.path ? "custom" : "basic");

const { BNET_CLIENT_ID, BNET_CLIENT_SECRET } = process.env;
const region = process.env.BNET_REGION ?? "us";
if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) {
  console.error("Faltan BNET_CLIENT_ID / BNET_CLIENT_SECRET (ver .env.example).");
  process.exit(1);
}

const host = process.env.BNET_API_HOST ?? `https://${region}.api.blizzard.com`;
const tokenUrl = process.env.BNET_TOKEN_URL ?? "https://oauth.battle.net/token";
const STATIC = flags.static ?? "static-forever";
const DYNAMIC = "dynamic-forever";
const OUT = join(import.meta.dirname, "out");
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const token = await fetchToken({ tokenUrl, id: BNET_CLIENT_ID, secret: BNET_CLIENT_SECRET });
const get = createClient({ host, region, token, delayMs: toNumber(flags.delay, 200) });

const ok = (res) => res.status === 200 && res.body !== null;
const saveJson = (file, data, pretty = true) =>
  writeFile(file, pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}
function fail(message) {
  console.error(message);
  process.exit(1);
}

// ───────────────────────────── basic / custom ─────────────────────────────
async function runBasic() {
  const dir = join(OUT, stamp());
  await mkdir(dir, { recursive: true });
  const results = [];
  const probe = async (label, namespace, path) => {
    const res = await get(namespace, path);
    if (res.body) {
      await saveJson(join(dir, `${label.replace(/[^a-z0-9._-]+/gi, "_")}.json`), res.body);
    }
    const keys = res.body ? Object.keys(res.body).slice(0, 12) : [];
    results.push({ label, namespace, path, status: res.status, keys, note: res.note });
    console.log(
      `${String(res.status).padEnd(4)} ${namespace}  ${path}  ${keys.join(",")} ${res.note}`,
    );
    return res.status === 200 ? res.body : null;
  };

  if (mode === "custom") {
    await probe("custom", flags.ns ?? STATIC, flags.path);
  } else {
    const professions = await probe(
      "static-profession-index",
      STATIC,
      "/data/wow/profession/index",
    );
    await probe("static-item-class-index", STATIC, "/data/wow/item-class/index");
    await probe("static-playable-class-index", STATIC, "/data/wow/playable-class/index");
    await probe("static-playable-race-index", STATIC, "/data/wow/playable-race/index");
    const first = professions?.professions?.[0];
    if (first) {
      const prof = await probe(
        `static-profession-${first.id}`,
        STATIC,
        `/data/wow/profession/${first.id}`,
      );
      const tier = tierRefs(prof)[0];
      if (tier) {
        const tierBody = await probe(
          `static-skill-tier-${tier.id}`,
          STATIC,
          `/data/wow/profession/${first.id}/skill-tier/${tier.id}`,
        );
        for (const r of recipeRefs(tierBody).slice(0, toNumber(flags["max-recipes"], 5))) {
          await probe(`static-recipe-${r.id}`, STATIC, `/data/wow/recipe/${r.id}`);
        }
      }
    }
    await probe("dynamic-ruleset-index", DYNAMIC, "/data/wow/ruleset/index");
    await probe("dynamic-ruleset-2", DYNAMIC, "/data/wow/ruleset/2");
    await probe("dynamic-ruleset-2-auction-houses", DYNAMIC, "/data/wow/ruleset/2/auctions/");
  }
  await saveJson(join(dir, "_summary.json"), { region, results });
  console.log(`\nResultados en ${dir}`);
}

// ───────────────────────────── catalog (SP-1) ─────────────────────────────
async function runCatalog() {
  const dir = join(OUT, "catalog");
  await mkdir(join(dir, "recipes"), { recursive: true });
  await mkdir(join(dir, "tiers"), { recursive: true });

  const index = await get(STATIC, "/data/wow/profession/index");
  if (!ok(index)) fail(`No se pudo leer el índice de profesiones (HTTP ${index.status}).`);
  let professions = (index.body.professions ?? []).filter((p) => !/\[DNT\]/i.test(p.name));
  if (flags.profession) professions = professions.filter((p) => String(p.id) === flags.profession);

  const tiers = [];
  const recipeMap = new Map();
  for (const p of professions) {
    const prof = await get(STATIC, `/data/wow/profession/${p.id}`);
    if (!ok(prof)) {
      console.log(`${prof.status} profesión ${p.name} (${p.id}) sin detalle`);
      continue;
    }
    await saveJson(join(dir, `profession-${p.id}.json`), prof.body);
    for (const t of tierRefs(prof.body)) {
      const tier = await get(STATIC, `/data/wow/profession/${p.id}/skill-tier/${t.id}`);
      if (!ok(tier)) {
        console.log(`${tier.status} tier ${t.name} (${t.id}) de ${p.name}`);
        continue;
      }
      await saveJson(join(dir, "tiers", `${p.id}-${t.id}.json`), tier.body, false);
      const refs = recipeRefs(tier.body);
      tiers.push({
        profession: p.name,
        professionId: p.id,
        tierId: t.id,
        name: tier.body.name,
        minimumSkill: tier.body.minimum_skill_level,
        maximumSkill: tier.body.maximum_skill_level,
        categories: (tier.body.categories ?? []).length,
        recipes: refs.length,
        keys: Object.keys(tier.body),
      });
      for (const r of refs) {
        const entry = recipeMap.get(r.id) ?? { professions: new Set(), tiers: new Set() };
        entry.professions.add(p.name);
        entry.tiers.add(t.id);
        recipeMap.set(r.id, entry);
      }
    }
    console.log(`  ${p.name}: ${tiers.filter((t) => t.professionId === p.id).length} tiers`);
  }

  const ids = [...recipeMap.keys()].sort((a, b) => a - b).slice(0, toNumber(flags.limit, Infinity));
  const recipes = [];
  const failures = [];
  let fetched = 0;
  let cached = 0;
  for (const [i, id] of ids.entries()) {
    const file = join(dir, "recipes", `${id}.json`);
    let body = await readJson(file);
    if (body) {
      cached += 1;
    } else {
      const res = await get(STATIC, `/data/wow/recipe/${id}`);
      if (ok(res)) {
        body = res.body;
        await saveJson(file, body, false);
        fetched += 1;
      } else {
        failures.push({ id, status: res.status, note: res.note });
      }
    }
    if (body) recipes.push(body);
    if ((i + 1) % 100 === 0) console.log(`  recetas ${i + 1}/${ids.length}`);
  }

  const reagents = new Set();
  const crafted = new Set();
  for (const recipe of recipes) {
    const found = recipeItemIds(recipe);
    found.reagents.forEach((x) => reagents.add(x));
    found.crafted.forEach((x) => crafted.add(x));
  }
  await saveJson(
    join(dir, "item-ids.json"),
    { reagents: [...reagents].sort((a, b) => a - b), crafted: [...crafted].sort((a, b) => a - b) },
    false,
  );

  const perProfession = {};
  for (const entry of recipeMap.values()) {
    for (const name of entry.professions) perProfession[name] = (perProfession[name] ?? 0) + 1;
  }
  const summary = {
    region,
    generatedAt: new Date().toISOString(),
    uniqueRecipes: recipeMap.size,
    requestedRecipes: ids.length,
    fetched,
    cached,
    failures,
    recipesPerProfession: perProfession,
    recipesInSeveralProfessions: [...recipeMap.values()].filter((e) => e.professions.size > 1)
      .length,
    recipesWithoutReagents: recipes.filter((r) => (r.reagents ?? []).length === 0).length,
    recipesWithoutCraftedItem: recipes.filter((r) => !r.crafted_item).length,
    distinctReagentItems: reagents.size,
    distinctCraftedItems: crafted.size,
    recipeKeys: countKeys(recipes, { depth: 2 }),
    tierKeys: countKeys(tiers.map((t) => Object.fromEntries(t.keys.map((k) => [k, 1])))),
    tiers,
  };
  await saveJson(join(dir, "catalog-summary.json"), summary);
  console.log(
    `\nRecetas únicas: ${summary.uniqueRecipes} · descargadas ${fetched} · en caché ${cached} · fallidas ${failures.length}`,
  );
  console.log("Campos de receta (nº de recetas que lo traen):");
  console.log(summary.recipeKeys);
  console.log(`\nResumen: ${join(dir, "catalog-summary.json")}`);
}

// ───────────────────────────── items (SP-1) ─────────────────────────────
async function runItems() {
  const dir = join(OUT, "catalog");
  const ids = await readJson(join(dir, "item-ids.json"));
  if (!ids) fail("Falta out/catalog/item-ids.json: ejecuta primero `probe catalog`.");
  await mkdir(join(dir, "items"), { recursive: true });

  const all = [...new Set([...ids.reagents, ...ids.crafted])]
    .sort((a, b) => a - b)
    .slice(0, toNumber(flags.limit, Infinity));
  const notFound = new Set((await readJson(join(dir, "items-404.json"))) ?? []);
  const found = [];
  const errors = [];
  let fetched = 0;
  for (const [i, id] of all.entries()) {
    if (notFound.has(id)) continue;
    const file = join(dir, "items", `${id}.json`);
    let body = await readJson(file);
    if (!body) {
      const res = await get(STATIC, `/data/wow/item/${id}`);
      if (ok(res)) {
        body = res.body;
        await saveJson(file, body, false);
        fetched += 1;
      } else if (res.status === 404) {
        notFound.add(id);
      } else {
        errors.push({ id, status: res.status, note: res.note });
      }
    }
    if (body) found.push({ id, body });
    if ((i + 1) % 100 === 0) {
      await saveJson(join(dir, "items-404.json"), [...notFound], false);
      console.log(`  ítems ${i + 1}/${all.length}`);
    }
  }
  await saveJson(join(dir, "items-404.json"), [...notFound], false);

  const reagentSet = new Set(ids.reagents);
  const craftedSet = new Set(ids.crafted);
  const role = (set) => {
    const total = all.filter((id) => set.has(id));
    const missing = total.filter((id) => notFound.has(id));
    return {
      total: total.length,
      notFound: missing.length,
      notFoundPct: total.length ? Math.round((missing.length / total.length) * 1000) / 10 : 0,
      sampleNotFound: missing.slice(0, 20),
    };
  };
  const summary = {
    region,
    generatedAt: new Date().toISOString(),
    fetched,
    reagents: role(reagentSet),
    crafted: role(craftedSet),
    errors,
    itemKeys: countKeys(
      found.map((f) => f.body),
      { depth: 1 },
    ),
  };
  await saveJson(join(dir, "items-summary.json"), summary);
  console.log(JSON.stringify({ reagents: summary.reagents, crafted: summary.crafted }, null, 2));
  console.log("Campos de ítem:", summary.itemKeys);
  console.log(`\nResumen: ${join(dir, "items-summary.json")}`);
}

// ───────────────────────────── auction (SP-3) ─────────────────────────────
async function runAuction() {
  const dir = join(OUT, `auction-${stamp()}`);
  await mkdir(dir, { recursive: true });
  const summary = { region, generatedAt: new Date().toISOString(), compare: [], house: null };
  const wantsHouse = flags.house !== undefined || flags.compare === undefined;

  if (flags.compare !== undefined) {
    for (const rs of ["1", "2", "3", "15"]) {
      const info = await get(DYNAMIC, `/data/wow/ruleset/${rs}`);
      const list = await get(DYNAMIC, `/data/wow/ruleset/${rs}/auctions/`);
      const houses = list.body?.auctions ?? [];
      const names = {};
      for (const h of houses) names[h.name] = (names[h.name] ?? 0) + 1;
      if (list.body) await saveJson(join(dir, `ruleset-${rs}-houses.json`), list.body);
      summary.compare.push({
        ruleset: rs,
        rulesetStatus: info.status,
        rulesetKeys: Object.keys(info.body ?? {}),
        housesStatus: list.status,
        houseCount: houses.length,
        houseIds: houses.map((h) => h.id),
        houseNames: names,
      });
      console.log(
        `ruleset ${rs}: HTTP ${info.status}/${list.status}, ${houses.length} casas`,
        names,
      );
    }
  }

  if (wantsHouse) {
    const ruleset = flags.ruleset ?? "2";
    const house = flags.house ?? "110";
    const res = await get(DYNAMIC, `/data/wow/ruleset/${ruleset}/auctions/${house}`);
    summary.house = {
      ruleset,
      house,
      status: res.status,
      bytes: res.bytes,
      headers: res.headers,
      note: res.note,
      analysis: res.body ? summarizeAuctionPayload(res.body) : null,
    };
    if (res.body)
      await saveJson(join(dir, `ruleset-${ruleset}-house-${house}.json`), res.body, false);
    console.log(
      `casa ${house} (ruleset ${ruleset}): HTTP ${res.status}, ${res.bytes} bytes`,
      res.headers,
      summary.house.analysis
        ? {
            count: summary.house.analysis.count,
            distinctItems: summary.house.analysis.distinctItems,
          }
        : "",
    );
  }
  await saveJson(join(dir, "auction-summary.json"), summary);
  console.log(`\nResumen: ${join(dir, "auction-summary.json")}`);
}

const modes = {
  basic: runBasic,
  custom: runBasic,
  catalog: runCatalog,
  items: runItems,
  auction: runAuction,
};
if (!modes[mode]) fail(`Modo desconocido: ${mode}. Usa basic | catalog | items | auction.`);
await modes[mode]();
console.log("Recuerda borrar la carpeta out/ al terminar (retención de datos de la API).");
