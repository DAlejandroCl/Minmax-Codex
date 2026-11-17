/**
 * Funciones puras y cliente HTTP de la sonda de la API de Battle.net (sin efectos de disco).
 * Se separan de probe.mjs para poder probarlas sin red.
 */
import { setTimeout as defaultSleep } from "node:timers/promises";

/** Parsea `modo --clave=valor --bandera`. Ignora el `--` literal que inserta pnpm. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) flags[arg.slice(2)] = "true";
      else flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

export function toNumber(value, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** `static-forever` + `us` → `static-forever-us`; no duplica la región si ya está. */
export function qualifyNamespace(namespace, region) {
  return namespace.endsWith(`-${region}`) ? namespace : `${namespace}-${region}`;
}

/**
 * Cuenta cuántos objetos contienen cada ruta de claves (hasta `depth` niveles).
 * Los arrays se recorren elemento a elemento y se marcan con `[]`.
 */
export function countKeys(objects, { depth = 1 } = {}) {
  const counts = new Map();
  const visit = (value, prefix, level) => {
    if (Array.isArray(value)) {
      for (const el of value) visit(el, `${prefix}[]`, level);
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      counts.set(path, (counts.get(path) ?? 0) + 1);
      if (level < depth) visit(child, path, level + 1);
    }
  };
  for (const obj of objects) visit(obj, "", 1);
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

export function tierRefs(profession) {
  return (profession?.skill_tiers ?? []).map((t) => ({ id: t.id, name: t.name }));
}

export function recipeRefs(tier) {
  return (tier?.categories ?? []).flatMap((category) =>
    (category.recipes ?? []).map((r) => ({ id: r.id, name: r.name, category: category.name })),
  );
}

/** IDs de ítems que aparecen en una receta, separados por rol. */
export function recipeItemIds(recipe) {
  const reagents = (recipe?.reagents ?? []).map((r) => r.reagent?.id).filter(Number.isInteger);
  const crafted = [recipe?.crafted_item?.id].filter(Number.isInteger);
  return { reagents, crafted };
}

function numericFields(entry) {
  const out = [];
  const visit = (value, prefix, level) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === "number") out.push([path, child]);
      else if (level < 2) visit(child, path, level + 1);
    }
  };
  visit(entry, "", 1);
  return out;
}

/** Describe la forma de una respuesta de casa de subastas (estructura desconocida a priori). */
export function summarizeAuctionPayload(body) {
  const topLevelKeys = Object.keys(body ?? {});
  const arrayKey = topLevelKeys.find((k) => Array.isArray(body[k]));
  const entries = arrayKey ? body[arrayKey] : [];
  const ranges = {};
  const itemIds = new Set();
  for (const entry of entries) {
    for (const [path, value] of numericFields(entry)) {
      const r = (ranges[path] ??= { min: value, max: value, count: 0 });
      if (value < r.min) r.min = value;
      if (value > r.max) r.max = value;
      r.count += 1;
    }
    const id = entry?.item?.id;
    if (Number.isInteger(id)) itemIds.add(id);
  }
  return {
    topLevelKeys,
    arrayKey: arrayKey ?? null,
    count: entries.length,
    distinctItems: itemIds.size,
    entryKeys: countKeys(entries, { depth: 2 }),
    numericRanges: ranges,
    sample: entries.slice(0, 3),
  };
}

/**
 * Cuántos de los ítems de recetas (`ids.reagents`, `ids.crafted`) tienen al menos una
 * publicación en una respuesta de subasta.
 */
export function itemCoverage(body, ids) {
  const arrayKey = Object.keys(body ?? {}).find((k) => Array.isArray(body[k]));
  const listed = new Set();
  for (const entry of arrayKey ? body[arrayKey] : []) {
    const id = entry?.item?.id;
    if (Number.isInteger(id)) listed.add(id);
  }
  const part = (list = []) => {
    const withListing = list.filter((id) => listed.has(id)).length;
    return {
      total: list.length,
      withListing,
      pct: list.length ? Math.round((withListing / list.length) * 1000) / 10 : 0,
    };
  };
  return { reagents: part(ids?.reagents), crafted: part(ids?.crafted) };
}

export async function fetchToken({ tokenUrl, id, secret, fetchImpl = fetch }) {
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetchImpl(tokenUrl, {
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
  if (!json.access_token) throw new Error("Token: respuesta sin access_token");
  return json.access_token;
}

const HEADERS_OF_INTEREST = [
  "last-modified",
  "date",
  "cache-control",
  "content-length",
  "content-encoding",
  "etag",
];

/**
 * Cliente secuencial con pausa entre llamadas, reintento ante 429 (respeta Retry-After) y
 * reintento ante errores de red. Devuelve siempre `{ status, body, bytes, headers, note }`.
 */
export function createClient({
  host,
  region,
  token,
  delayMs = 200,
  maxRetries = 3,
  fetchImpl = fetch,
  sleep = defaultSleep,
}) {
  return async function get(namespace, path) {
    const url = new URL(host + path);
    url.searchParams.set("namespace", qualifyNamespace(namespace, region));
    url.searchParams.set("locale", "en_US");
    for (let attempt = 0; ; attempt += 1) {
      await sleep(delayMs);
      try {
        const res = await fetchImpl(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 429 && attempt < maxRetries) {
          await sleep((Number(res.headers.get("retry-after")) || 5) * 1000);
          continue;
        }
        const text = await res.text();
        let body = null;
        let note = "";
        try {
          body = JSON.parse(text);
        } catch {
          note = "respuesta no JSON";
        }
        const headers = {};
        for (const name of HEADERS_OF_INTEREST) {
          const value = res.headers.get(name);
          if (value) headers[name] = value;
        }
        return { status: res.status, body, bytes: text.length, headers, note };
      } catch (err) {
        if (attempt < maxRetries) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        return {
          status: 0,
          body: null,
          bytes: 0,
          headers: {},
          note: `error de red: ${err.message}`,
        };
      }
    }
  };
}
