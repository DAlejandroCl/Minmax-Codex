import test from "node:test";
import assert from "node:assert/strict";
import { CANDIDATES, NAMESPACES } from "./candidates.mjs";
import {
  collapseLocales,
  countKeys,
  createClient,
  extractSkillRequirement,
  fillTemplate,
  findIndexList,
  hrefToPath,
  itemCoverage,
  matchKey,
  matchPatternsToRecipes,
  normalizeName,
  parseArgs,
  qualifyNamespace,
  recipeItemIds,
  recipeRefs,
  summarizeAuctionPayload,
  splitRecipeItemName,
  tierRefs,
  toNumber,
} from "./lib.mjs";

const noSleep = async () => {};

function fakeResponse(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

test("parseArgs ignora el -- literal y separa modo y banderas", () => {
  const { flags, positional } = parseArgs(["catalog", "--", "--limit=10", "--compare"]);
  assert.deepEqual(positional, ["catalog"]);
  assert.deepEqual(flags, { limit: "10", compare: "true" });
});

test("parseArgs conserva '=' dentro del valor", () => {
  const { flags } = parseArgs(["--path=/data/x?a=b"]);
  assert.equal(flags.path, "/data/x?a=b");
});

test("toNumber usa el valor por defecto si no es numérico", () => {
  assert.equal(toNumber(undefined, 5), 5);
  assert.equal(toNumber("abc", 5), 5);
  assert.equal(toNumber("12", 5), 12);
});

test("qualifyNamespace no duplica la región", () => {
  assert.equal(qualifyNamespace("static-forever", "us"), "static-forever-us");
  assert.equal(
    qualifyNamespace("static-1.60.1_70399-forever-us", "us"),
    "static-1.60.1_70399-forever-us",
  );
});

test("countKeys cuenta rutas anidadas y arrays", () => {
  const counts = countKeys(
    [
      { id: 1, reagents: [{ reagent: { id: 2 }, quantity: 1 }] },
      { id: 2, skill: 5 },
    ],
    { depth: 2 },
  );
  assert.equal(counts.id, 2);
  assert.equal(counts.skill, 1);
  assert.equal(counts["reagents[].reagent"], 1);
  assert.equal(counts["reagents[].quantity"], 1);
});

test("tierRefs y recipeRefs toleran datos ausentes", () => {
  assert.deepEqual(tierRefs({}), []);
  assert.deepEqual(tierRefs({ skill_tiers: [{ id: 1, name: "A" }] }), [{ id: 1, name: "A" }]);
  assert.deepEqual(recipeRefs(undefined), []);
  assert.deepEqual(
    recipeRefs({ categories: [{ name: "C", recipes: [{ id: 9, name: "R" }] }, {}] }),
    [{ id: 9, name: "R", category: "C" }],
  );
});

test("recipeItemIds separa reactivos y producto", () => {
  const ids = recipeItemIds({
    crafted_item: { id: 10 },
    reagents: [{ reagent: { id: 1 }, quantity: 2 }, { reagent: {} }],
  });
  assert.deepEqual(ids, { reagents: [1], crafted: [10] });
  assert.deepEqual(recipeItemIds({}), { reagents: [], crafted: [] });
});

test("summarizeAuctionPayload describe la forma y rangos", () => {
  const summary = summarizeAuctionPayload({
    _links: {},
    auctions: [
      { id: 1, item: { id: 100 }, quantity: 2, buyout: 500 },
      { id: 2, item: { id: 100 }, quantity: 1, buyout: 300 },
      { id: 3, item: { id: 200 }, quantity: 5 },
    ],
  });
  assert.equal(summary.arrayKey, "auctions");
  assert.equal(summary.count, 3);
  assert.equal(summary.distinctItems, 2);
  assert.deepEqual(summary.numericRanges.buyout, { min: 300, max: 500, count: 2 });
  assert.equal(summary.sample.length, 3);
});

test("summarizeAuctionPayload sin array devuelve cero entradas", () => {
  const summary = summarizeAuctionPayload({ code: 404 });
  assert.equal(summary.count, 0);
  assert.equal(summary.arrayKey, null);
});

test("splitRecipeItemName separa el prefijo del nombre de la receta", () => {
  assert.deepEqual(splitRecipeItemName("Pattern: Fine Leather Boots"), {
    prefix: "Pattern",
    base: "Fine Leather Boots",
  });
  assert.deepEqual(splitRecipeItemName("Formula: Enchant Bracer - Lesser Strength"), {
    prefix: "Formula",
    base: "Enchant Bracer - Lesser Strength",
  });
  assert.deepEqual(splitRecipeItemName("Linen Cloth"), { prefix: null, base: "Linen Cloth" });
  assert.deepEqual(splitRecipeItemName(undefined), { prefix: null, base: "" });
});

test("normalizeName ignora mayúsculas y espacios repetidos", () => {
  assert.equal(normalizeName("  Fine   Leather BOOTS "), "fine leather boots");
});

test("extractSkillRequirement lee el texto «Requires X (n)»", () => {
  const preview = {
    requirements: {
      skill: {
        display_string: { en_US: "Requires Leatherworking (95)", es_MX: "Requiere Peletería (95)" },
      },
    },
  };
  assert.deepEqual(extractSkillRequirement(preview), { profession: "Leatherworking", level: 95 });
});

test("extractSkillRequirement acepta la forma estructurada y devuelve null si no hay", () => {
  const structured = {
    requirements: { skill: { profession: { name: { en_US: "Alchemy" } }, level: 120 } },
  };
  assert.deepEqual(extractSkillRequirement(structured), { profession: "Alchemy", level: 120 });
  assert.equal(extractSkillRequirement({ requirements: { level: { value: 20 } } }), null);
  assert.equal(extractSkillRequirement(undefined), null);
});

test("matchKey ignora puntuación y apóstrofes tipográficos", () => {
  assert.equal(matchKey("Transmute: Iron to Gold"), matchKey("Transmute Iron to Gold"));
  assert.equal(matchKey("Elixir of Ogre’s Strength"), matchKey("Elixir of Ogre's Strength"));
  assert.equal(matchKey(undefined), "");
});

test("collapseLocales deja solo el texto en inglés", () => {
  const value = {
    name: { en_US: "Pattern", es_MX: "Patrón" },
    n: 2,
    list: [{ en_US: "x", de_DE: "y" }],
  };
  assert.deepEqual(collapseLocales(value), { name: "Pattern", n: 2, list: ["x"] });
});

test("matchPatternsToRecipes enlaza nombres con distinta puntuación", () => {
  const result = matchPatternsToRecipes(
    [{ id: 1, name: "Recipe: Transmute Iron to Gold" }],
    [{ id: 9, name: "Transmute: Iron to Gold" }],
  );
  assert.equal(result.matched, 1);
});

test("matchPatternsToRecipes enlaza por nombre y reporta no enlazados y ambiguos", () => {
  const recipes = [
    { id: 1, name: "Fine Leather Boots" },
    { id: 2, name: "Bolt of Linen" },
    { id: 3, name: "bolt of linen" },
  ];
  const patterns = [
    { id: 10, name: "Pattern: Fine Leather Boots" },
    { id: 11, name: "Pattern: Bolt of Linen" },
    { id: 12, name: "Pattern: Desconocida" },
  ];
  const result = matchPatternsToRecipes(patterns, recipes);
  assert.equal(result.patterns, 3);
  assert.equal(result.matched, 2);
  assert.equal(result.ambiguous, 1);
  assert.equal(result.recipesWithPattern, 3);
  assert.deepEqual(result.unmatched, [{ id: 12, name: "Pattern: Desconocida" }]);
});

test("findIndexList detecta la lista de un índice y su primer elemento", () => {
  const body = { _links: {}, classes: [{ key: { href: "https://x/a/1" }, id: 1 }, { id: 2 }] };
  const list = findIndexList(body);
  assert.equal(list.key, "classes");
  assert.equal(list.count, 2);
  assert.equal(list.first.id, 1);
  assert.equal(findIndexList({ id: 1, name: "x" }), null);
  assert.equal(findIndexList({ list: [] }), null);
  assert.equal(findIndexList(null), null);
});

test("hrefToPath devuelve solo la ruta", () => {
  assert.equal(
    hrefToPath("https://us.api.blizzard.com/data/wow/talent-tree/5?namespace=static-x"),
    "/data/wow/talent-tree/5",
  );
  assert.equal(hrefToPath("no es url"), null);
});

test("fillTemplate sustituye variables o devuelve null si falta alguna", () => {
  assert.equal(fillTemplate("/data/wow/item/{itemId}", { itemId: 7 }), "/data/wow/item/7");
  assert.equal(fillTemplate("/data/wow/item/{itemId}", {}), null);
  assert.equal(fillTemplate("/data/wow/region/index", {}), "/data/wow/region/index");
});

test("los candidatos de discover son válidos y no se repiten", () => {
  const seen = new Set();
  for (const c of CANDIDATES) {
    assert.ok(NAMESPACES.includes(c.ns), `namespace inválido: ${c.path}`);
    assert.ok(c.path.startsWith("/data/wow/"), `ruta inválida: ${c.path}`);
    assert.ok(c.feature, `falta feature: ${c.path}`);
    const key = `${c.ns} ${c.path}`;
    assert.ok(!seen.has(key), `repetido: ${key}`);
    seen.add(key);
  }
  assert.ok(CANDIDATES.length >= 30);
});

test("itemCoverage cuenta ítems de recetas con publicaciones", () => {
  const body = { auctions: [{ item: { id: 1 } }, { item: { id: 1 } }, { item: { id: 3 } }] };
  const coverage = itemCoverage(body, { reagents: [1, 2], crafted: [3, 4, 5, 6] });
  assert.deepEqual(coverage.reagents, { total: 2, withListing: 1, pct: 50 });
  assert.deepEqual(coverage.crafted, { total: 4, withListing: 1, pct: 25 });
});

test("itemCoverage tolera respuesta vacía e ids ausentes", () => {
  const coverage = itemCoverage({}, undefined);
  assert.deepEqual(coverage.reagents, { total: 0, withListing: 0, pct: 0 });
});

test("createClient devuelve cuerpo, estado y cabeceras", async () => {
  const calls = [];
  const get = createClient({
    host: "https://example.test",
    region: "us",
    token: "t",
    sleep: noSleep,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), auth: init.headers.Authorization });
      return fakeResponse(200, { ok: true }, { "Last-Modified": "x" });
    },
  });
  const res = await get("static-forever", "/data/wow/item/1");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(res.headers["last-modified"], "x");
  assert.match(calls[0].url, /namespace=static-forever-us/);
  assert.equal(calls[0].auth, "Bearer t");
});

test("createClient reintenta ante 429 y luego tiene éxito", async () => {
  let n = 0;
  const waits = [];
  const get = createClient({
    host: "https://example.test",
    region: "us",
    token: "t",
    sleep: async (ms) => {
      waits.push(ms);
    },
    fetchImpl: async () => {
      n += 1;
      return n === 1 ? fakeResponse(429, "", { "Retry-After": "2" }) : fakeResponse(200, { a: 1 });
    },
  });
  const res = await get("static-forever", "/x");
  assert.equal(res.status, 200);
  assert.equal(n, 2);
  assert.ok(waits.includes(2000));
});

test("createClient devuelve 404 sin reintentar y marca respuestas no JSON", async () => {
  let n = 0;
  const get = createClient({
    host: "https://example.test",
    region: "us",
    token: "t",
    sleep: noSleep,
    fetchImpl: async () => {
      n += 1;
      return fakeResponse(404, "no es json");
    },
  });
  const res = await get("static-forever", "/x");
  assert.equal(res.status, 404);
  assert.equal(res.body, null);
  assert.equal(res.note, "respuesta no JSON");
  assert.equal(n, 1);
});

test("createClient agota reintentos ante error de red", async () => {
  let n = 0;
  const get = createClient({
    host: "https://example.test",
    region: "us",
    token: "t",
    maxRetries: 2,
    sleep: noSleep,
    fetchImpl: async () => {
      n += 1;
      throw new Error("caído");
    },
  });
  const res = await get("static-forever", "/x");
  assert.equal(res.status, 0);
  assert.match(res.note, /caído/);
  assert.equal(n, 3);
});
