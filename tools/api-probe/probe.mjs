#!/usr/bin/env node
/**
 * Sonda exploratoria de la API de Battle.net para WoW Forever (spikes SP-1 y SP-3).
 *
 * Qué hace: obtiene un token (client credentials), prueba una lista corta de endpoints
 * de los namespaces de Forever y guarda las respuestas en tools/api-probe/out/<fecha>/.
 * Nunca imprime ni guarda el token ni el secreto.
 *
 * Uso (desde la raíz del repo):
 *   cp .env.example .env     # y completa BNET_CLIENT_ID / BNET_CLIENT_SECRET
 *   pnpm --filter @wow-forever/api-probe probe
 *   pnpm --filter @wow-forever/api-probe probe -- --max-recipes=10
 *   pnpm --filter @wow-forever/api-probe probe -- --ns=dynamic-forever --path=/data/wow/ruleset/index
 *
 * Términos de la API de Blizzard: pocas llamadas, secuenciales, sin scraping. Borra la
 * carpeta out/ cuando termines (los términos limitan la retención de datos de la API).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    }),
);

const { BNET_CLIENT_ID, BNET_CLIENT_SECRET } = process.env;
const region = process.env.BNET_REGION ?? "us";
const maxRecipes = Number(args["max-recipes"] ?? 5);
const DELAY_MS = 200;

if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) {
  console.error("Faltan BNET_CLIENT_ID / BNET_CLIENT_SECRET (ver .env.example).");
  process.exit(1);
}

const host = `https://${region}.api.blizzard.com`;
const outDir = join(import.meta.dirname, "out", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(outDir, { recursive: true });

async function getToken() {
  const basic = Buffer.from(`${BNET_CLIENT_ID}:${BNET_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Token: HTTP ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

const token = await getToken();
const results = [];

async function probe(label, namespace, path, { save = true } = {}) {
  const url = new URL(host + path);
  url.searchParams.set("namespace", `${namespace}-${region}`);
  url.searchParams.set("locale", "en_US");
  await sleep(DELAY_MS);
  let status = 0;
  let body = null;
  let note = "";
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      note = "respuesta no JSON";
    }
    if (body && save) {
      const file = `${label.replace(/[^a-z0-9._-]+/gi, "_")}.json`;
      const payload = JSON.stringify(body, null, 2);
      await writeFile(
        join(outDir, file),
        payload.length > 2_000_000 ? payload.slice(0, 2_000_000) : payload,
      );
      if (payload.length > 2_000_000) note = "guardado truncado a 2 MB";
    }
  } catch (err) {
    note = `error de red: ${err.message}`;
  }
  const keys = body && typeof body === "object" ? Object.keys(body).slice(0, 12) : [];
  results.push({ label, namespace: `${namespace}-${region}`, path, status, keys, note });
  console.log(`${String(status).padEnd(4)} ${namespace}  ${path}  ${keys.join(",")} ${note}`);
  return status === 200 ? body : null;
}

if (args.path) {
  await probe("custom", args.ns ?? "static-forever", args.path);
} else {
  // 1) Datos estáticos
  const professions = await probe(
    "static-profession-index",
    "static-forever",
    "/data/wow/profession/index",
  );
  await probe("static-item-class-index", "static-forever", "/data/wow/item-class/index");
  await probe("static-playable-class-index", "static-forever", "/data/wow/playable-class/index");
  await probe("static-playable-race-index", "static-forever", "/data/wow/playable-race/index");

  // 2) Recorrer una profesión hasta recetas (SP-1: ¿hay reactivos, umbrales de color, fuentes?)
  const first = professions?.professions?.[0];
  if (first) {
    const prof = await probe(
      `static-profession-${first.id}`,
      "static-forever",
      `/data/wow/profession/${first.id}`,
    );
    const tier = prof?.skill_tiers?.[0];
    if (tier) {
      const tierBody = await probe(
        `static-skill-tier-${tier.id}`,
        "static-forever",
        `/data/wow/profession/${first.id}/skill-tier/${tier.id}`,
      );
      const recipes = (tierBody?.categories ?? [])
        .flatMap((c) => c.recipes ?? [])
        .slice(0, maxRecipes);
      for (const r of recipes) {
        await probe(`static-recipe-${r.id}`, "static-forever", `/data/wow/recipe/${r.id}`);
      }
    }
  }

  // 3) Cobertura de ítems (informes comunitarios: ~43 % de ítems de subasta dan 404 en static-forever).
  await probe("static-item-720", "static-forever", "/data/wow/item/720");

  // 4) Rulesets y subasta (SP-3). Rutas según informes comunitarios del 2026-11-05/07;
  //    la ruta del índice de casas REQUIERE la barra final. No se descargan las casas completas
  //    (hasta ~10 MB cada una): solo el índice.
  await probe("dynamic-ruleset-index", "dynamic-forever", "/data/wow/ruleset/index");
  await probe("dynamic-ruleset-2", "dynamic-forever", "/data/wow/ruleset/2");
  await probe(
    "dynamic-ruleset-2-auction-houses",
    "dynamic-forever",
    "/data/wow/ruleset/2/auctions/",
  );
}

await writeFile(join(outDir, "_summary.json"), JSON.stringify({ region, results }, null, 2));
console.log(`\nResultados en ${outDir}\nRecuerda borrar la carpeta out/ al terminar.`);
