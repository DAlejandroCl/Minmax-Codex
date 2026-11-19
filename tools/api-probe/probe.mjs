#!/usr/bin/env node
/**
 * Sonda exploratoria de la API de Battle.net para WoW Forever (spikes SP-1 y SP-3).
 * Nunca imprime ni guarda el token ni el secreto. Llamadas secuenciales con pausa
 * (≥ 200 ms), reintento ante 429, sin paralelismo y sin scraping.
 *
 * Uso (desde la raíz del repo; requiere .env con BNET_CLIENT_ID / BNET_CLIENT_SECRET):
 *   pnpm --filter @minmax-codex/api-probe probe                       # modo basic (ya ejecutado)
 *   pnpm --filter @minmax-codex/api-probe probe catalog               # todas las recetas
 *   pnpm --filter @minmax-codex/api-probe probe items                 # cobertura de ítems
 *   pnpm --filter @minmax-codex/api-probe probe auction --compare     # casas por ruleset
 *   pnpm --filter @minmax-codex/api-probe probe auction --house=110   # una casa (≈ 10 MB)
 *   pnpm --filter @minmax-codex/api-probe probe auction --commodities # solo /commodities de la casa 110
 *   pnpm --filter @minmax-codex/api-probe probe discover              # endpoints candidatos por feature
 *   pnpm --filter @minmax-codex/api-probe probe patterns [--details]  # ítems «Recipe», enlace con recetas y requisito de habilidad
 *   pnpm --filter @minmax-codex/api-probe probe -- --ns=dynamic-forever --path=/data/wow/ruleset/index
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
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CANDIDATES } from "./candidates.mjs";
import {
  collapseLocales,
  countKeys,
  createClient,
  extractPatternTarget,
  extractSkillRequirement,
  fetchToken,
  fillTemplate,
  findIndexList,
  hrefToPath,
  itemCoverage,
  linkPatternsToRecipes,
  matchPatternsToRecipes,
  parseArgs,
  splitRecipeItemName,
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
  const wantsHouse =
    flags.house !== undefined || (flags.compare === undefined && flags.commodities === undefined);

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

  const wantsCommodities = flags.commodities !== undefined;
  const itemIds = await readJson(join(OUT, "catalog", "item-ids.json"));
  const ruleset = flags.ruleset ?? "2";
  const house = flags.house ?? "110";

  /** Descarga una variante de la casa, la guarda y devuelve su descripción. */
  async function describeHouse(label, suffix) {
    const res = await get(DYNAMIC, `/data/wow/ruleset/${ruleset}/auctions/${house}${suffix}`);
    if (res.body) {
      await saveJson(join(dir, `ruleset-${ruleset}-house-${house}${label}.json`), res.body, false);
    }
    const analysis = res.body ? summarizeAuctionPayload(res.body) : null;
    const coverage = res.body && itemIds ? itemCoverage(res.body, itemIds) : null;
    console.log(
      `casa ${house}${suffix} (ruleset ${ruleset}): HTTP ${res.status}, ${res.bytes} bytes`,
    );
    if (analysis) console.log({ count: analysis.count, distinctItems: analysis.distinctItems });
    if (coverage) console.log("cobertura de ítems de recetas:", coverage);
    return {
      ruleset,
      house,
      suffix,
      status: res.status,
      bytes: res.bytes,
      headers: res.headers,
      note: res.note,
      analysis,
      coverage,
    };
  }

  if (wantsHouse || wantsCommodities) {
    if (wantsHouse) summary.house = await describeHouse("", "");
    if (wantsCommodities) summary.commodities = await describeHouse("-commodities", "/commodities");
  }
  await saveJson(join(dir, "auction-summary.json"), summary);
  console.log(`\nResumen: ${join(dir, "auction-summary.json")}`);
}

// ───────────────────────────── discover (cobertura por feature) ─────────────────────────────
async function firstId(dir) {
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
    const id = Number.parseInt(files[0] ?? "", 10);
    return Number.isInteger(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

async function runDiscover() {
  const dir = join(OUT, "discover");
  await mkdir(dir, { recursive: true });
  const vars = {
    recipeId: await firstId(join(OUT, "catalog", "recipes")),
    itemId: await firstId(join(OUT, "catalog", "items")),
    professionId: 197,
  };
  const namespaces = { static: STATIC, dynamic: DYNAMIC };
  const fileFor = (ns, path) =>
    join(dir, `${ns}${path}`.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 120) + ".json");
  const save = async (ns, path, res) => {
    if (res.body && res.bytes <= 1_500_000) await saveJson(fileFor(ns, path), res.body, false);
  };

  const rows = [];
  for (const candidate of CANDIDATES) {
    const path = fillTemplate(candidate.path, vars);
    const row = { feature: candidate.feature, ns: candidate.ns, path: path ?? candidate.path };
    if (!path) {
      rows.push({
        ...row,
        status: "omitido",
        note: "falta el catálogo (ejecuta `probe catalog` e `items`)",
      });
      console.log(`omit ${candidate.ns}  ${candidate.path}`);
      continue;
    }
    const ns = namespaces[candidate.ns];
    const res = await get(ns, path);
    Object.assign(row, {
      status: res.status,
      bytes: res.bytes,
      keys: res.body ? Object.keys(res.body).slice(0, 12) : [],
    });
    let extra = "";
    if (ok(res)) {
      await save(candidate.ns, path, res);
      const list = findIndexList(res.body);
      if (list) {
        row.list = { key: list.key, count: list.count };
        extra = `${list.key}[${list.count}]`;
        const detailPath = candidate.follow ? hrefToPath(list.first?.key?.href) : null;
        if (detailPath) {
          const detail = await get(ns, detailPath);
          row.detail = {
            path: detailPath,
            status: detail.status,
            keys: detail.body ? Object.keys(detail.body).slice(0, 16) : [],
          };
          if (ok(detail)) await save(candidate.ns, detailPath, detail);
          extra += ` → detalle ${detail.status}`;
        }
      }
    }
    rows.push(row);
    console.log(`${String(row.status).padEnd(4)} ${candidate.ns.padEnd(7)} ${path} ${extra}`);
  }

  const byFeature = {};
  for (const row of rows) {
    const f = (byFeature[row.feature] ??= { ok: 0, total: 0, found: [] });
    f.total += 1;
    if (row.status === 200) {
      f.ok += 1;
      f.found.push(row.path);
    }
  }
  await saveJson(join(dir, "discover-summary.json"), { region, vars, byFeature, rows });
  console.log("\nResumen por feature (200 / total):");
  for (const [feature, f] of Object.entries(byFeature)) {
    console.log(`  ${feature}: ${f.ok}/${f.total}`);
  }
  console.log(`\nResumen: ${join(dir, "discover-summary.json")}`);
}

// ───────────────────────────── patterns (SP-1, hueco R-18) ─────────────────────────────
/**
 * Descarga los ítems de clase «Recipe» (id 9) y los enlaza con las recetas por nombre.
 * La búsqueda de la API devuelve como máximo 1.000 resultados, así que se consulta por subclase.
 * Con `--details` pide además el detalle de cada patrón (resumible) para leer el requisito de
 * habilidad de su `preview_item`; `--limit=N` acota cuántos.
 */
async function runPatterns() {
  const dir = join(OUT, "patterns");
  await mkdir(join(dir, "items"), { recursive: true });
  const pageSize = toNumber(flags["page-size"], 1000);
  const maxPages = toNumber(flags["max-pages"], 10);

  async function fetchPages(extra) {
    const found = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await get(
        STATIC,
        `/data/wow/search/item?item_class.id=9${extra}&orderby=id&_pageSize=${pageSize}&_page=${page}`,
      );
      if (!ok(res)) {
        console.log(`  página ${page}${extra}: HTTP ${res.status} ${res.note}`);
        break;
      }
      const results = res.body.results ?? [];
      for (const r of results) found.push(r.data ?? {});
      if (results.length < pageSize) break;
    }
    return found;
  }

  const classDetail = await get(STATIC, "/data/wow/item-class/9");
  const subclasses = ok(classDetail) ? (classDetail.body.item_subclasses ?? []) : [];
  const byId = new Map();
  const cappedQueries = [];
  const queries = subclasses.length
    ? subclasses.map((s) => ({
        label: `${s.id} ${collapseLocales(s.name)}`,
        extra: `&item_subclass.id=${s.id}`,
      }))
    : [{ label: "todas", extra: "" }];
  for (const q of queries) {
    const found = await fetchPages(q.extra);
    console.log(`  subclase ${q.label}: ${found.length}`);
    if (found.length >= pageSize) cappedQueries.push(q.label);
    for (const d of found) byId.set(d.id, d);
  }

  const items = [...byId.values()].map((d) => ({
    id: d.id,
    name: d.name?.en_US,
    classId: d.item_class?.id,
    subclass: d.item_subclass?.name?.en_US,
    level: d.level,
    requiredLevel: d.required_level,
    quality: d.quality?.type,
    purchasePrice: d.purchase_price,
    sellPrice: d.sell_price,
  }));
  const count = (list, pick) => {
    const out = {};
    for (const x of list) out[pick(x) ?? "(sin valor)"] = (out[pick(x) ?? "(sin valor)"] ?? 0) + 1;
    return out;
  };
  const onlyRecipes = items.filter((i) => i.classId === 9);
  // La subclase «Book» agrupa libros que no enseñan recetas de profesión (tomos, librams…).
  const professionPatterns = onlyRecipes.filter((i) => i.subclass !== "Book");

  // Detalle por ítem: la búsqueda no incluye `preview_item`.
  const previews = [];
  let detailsFetched = 0;
  let detailsMissing = 0;
  if (flags.details !== undefined) {
    const limit = toNumber(flags.limit, Infinity);
    for (const [i, item] of professionPatterns.slice(0, limit).entries()) {
      const file = join(dir, "items", `${item.id}.json`);
      let body = await readJson(file);
      if (!body) {
        const res = await get(STATIC, `/data/wow/item/${item.id}`);
        if (ok(res)) {
          body = res.body;
          await saveJson(file, body, false);
          detailsFetched += 1;
        } else {
          detailsMissing += 1;
        }
      }
      if (body?.preview_item) {
        item.skill = extractSkillRequirement(body.preview_item);
        item.target = extractPatternTarget(body.preview_item);
        previews.push({ item, preview: body.preview_item });
      }
      if ((i + 1) % 100 === 0) console.log(`  detalle ${i + 1}/${professionPatterns.length}`);
    }
  }
  const isLocaleKey = (path) => /(^|\.)[a-z]{2}_[A-Z]{2}$/.test(path);
  const previewKeys = Object.fromEntries(
    Object.entries(
      countKeys(
        previews.map((p) => p.preview),
        { depth: 3 },
      ),
    ).filter(([path]) => !isLocaleKey(path)),
  );
  const withSkill = professionPatterns.filter((i) => i.skill);
  const histogram = {};
  for (const i of withSkill) {
    const bucket = `${Math.floor((i.skill.level - 1) / 25) * 25 + 1}-${Math.floor((i.skill.level - 1) / 25) * 25 + 25}`;
    histogram[bucket] = (histogram[bucket] ?? 0) + 1;
  }
  const sample = previews.find((p) => p.item.subclass === "Leatherworking") ?? previews[0];

  const recipes = [];
  try {
    for (const file of await readdir(join(OUT, "catalog", "recipes"))) {
      const r = await readJson(join(OUT, "catalog", "recipes", file));
      if (r) recipes.push({ id: r.id, name: r.name, craftedItemId: r.crafted_item?.id });
    }
  } catch {
    // sin catálogo: no se calcula el enlace con recetas
  }
  const match = recipes.length ? matchPatternsToRecipes(professionPatterns, recipes) : null;

  // Enlace exacto (ítem fabricado → hechizo → nombre) cuando hay detalle de los patrones.
  const professionOf = new Map();
  try {
    for (const file of await readdir(join(OUT, "catalog", "tiers"))) {
      const professionId = file.split("-")[0];
      const profession = await readJson(join(OUT, "catalog", `profession-${professionId}.json`));
      const tier = await readJson(join(OUT, "catalog", "tiers", file));
      for (const category of tier?.categories ?? []) {
        for (const r of category.recipes ?? [])
          professionOf.set(r.id, profession?.name ?? professionId);
      }
    }
  } catch {
    // sin catálogo de tiers: no se desglosa por profesión
  }
  const link =
    previews.length > 0 && recipes.length
      ? linkPatternsToRecipes(
          professionPatterns.map((i) => ({
            id: i.id,
            name: i.name,
            craftedItemId: i.target?.craftedItemId,
            spellName: i.target?.spellName,
          })),
          recipes,
        )
      : null;
  const patternById = new Map(professionPatterns.map((i) => [i.id, i]));
  const recipeName = new Map(recipes.map((r) => [r.id, r.name]));
  const requirements = new Map();
  for (const l of link?.links ?? []) {
    const p = patternById.get(l.patternId);
    if (!p?.skill) continue;
    const current = requirements.get(l.recipeId);
    if (!current || p.skill.level < current.minSkill) {
      requirements.set(l.recipeId, {
        recipeId: l.recipeId,
        recipe: recipeName.get(l.recipeId),
        profession: p.skill.profession,
        minSkill: p.skill.level,
        patternItemId: p.id,
        patternName: p.name,
        reputation: p.target?.reputation ?? null,
        binding: p.target?.binding ?? null,
        linkedBy: l.how,
      });
    }
  }
  const perProfession = {};
  for (const r of recipes) {
    const entry = (perProfession[professionOf.get(r.id) ?? "(desconocida)"] ??= {
      recipes: 0,
      withMinSkill: 0,
    });
    entry.recipes += 1;
    if (requirements.has(r.id)) entry.withMinSkill += 1;
  }

  const summary = {
    region,
    generatedAt: new Date().toISOString(),
    queries: queries.length,
    cappedQueries,
    totalItems: items.length,
    itemsOfClass9: onlyRecipes.length,
    professionPatterns: professionPatterns.length,
    details: {
      requested: flags.details !== undefined,
      fetched: detailsFetched,
      missing: detailsMissing,
      withPreview: previews.length,
    },
    previewKeys,
    samplePreview: sample && { name: sample.item.name, preview: collapseLocales(sample.preview) },
    withSkillRequirement: withSkill.length,
    skillLevelHistogram: histogram,
    skillExamples: withSkill.slice(0, 10).map((i) => ({ name: i.name, ...i.skill })),
    otherClasses: count(
      items.filter((i) => i.classId !== 9),
      (i) => i.classId,
    ),
    bySubclass: count(onlyRecipes, (i) => i.subclass),
    byPrefix: count(onlyRecipes, (i) => splitRecipeItemName(i.name).prefix),
    byQuality: count(onlyRecipes, (i) => i.quality),
    link: link && {
      method: link.method,
      recipesLinked: link.recipesLinked,
      unlinked: link.unlinked.length,
      sampleUnlinked: link.unlinked.slice(0, 15),
    },
    recipesWithMinSkill: requirements.size,
    recipesWithReputation: [...requirements.values()].filter((r) => r.reputation).length,
    perProfession,
    recipesInCatalog: recipes.length,
    match: match && {
      ...match,
      unmatched: match.unmatched.length,
      sampleUnmatched: match.unmatched.slice(0, 15),
    },
  };
  await saveJson(join(dir, "recipe-requirements.json"), [...requirements.values()], false);
  await saveJson(join(dir, "patterns.json"), professionPatterns, false);
  await saveJson(join(dir, "patterns-summary.json"), summary);
  const short = { ...summary };
  if (flags.verbose === undefined) {
    delete short.previewKeys;
    delete short.samplePreview;
  }
  console.log(JSON.stringify(short, null, 2));
  console.log(`\nResumen: ${join(dir, "patterns-summary.json")}`);
}

const modes = {
  patterns: runPatterns,
  discover: runDiscover,
  basic: runBasic,
  custom: runBasic,
  catalog: runCatalog,
  items: runItems,
  auction: runAuction,
};
if (!modes[mode])
  fail(`Modo desconocido: ${mode}. Usa basic | catalog | items | auction | discover | patterns.`);
await modes[mode]();
console.log("Recuerda borrar la carpeta out/ al terminar (retención de datos de la API).");
