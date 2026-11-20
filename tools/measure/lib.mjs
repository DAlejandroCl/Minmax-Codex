/** Funciones puras para analizar las mediciones in-game de SP-4. */

export const COLORS = ["orange", "yellow", "green", "grey"];

/** Divide una línea CSV respetando comillas dobles ("a,b" y "" como comilla escapada). */
export function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Escapa una celda para CSV. */
export function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers, rows) {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n";
}

/** Parsea un CSV (con comillas); ignora líneas vacías y comentarios (#). */
export function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line, i) => {
    const cells = splitCsvLine(line);
    if (cells.length !== header.length) {
      throw new Error(`Línea ${i + 2}: se esperaban ${header.length} columnas y hay ${cells.length}`);
    }
    return Object.fromEntries(header.map((h, j) => [h, cells[j]]));
  });
}

/** Intervalo de Wilson al 95 % para una proporción. */
export function wilson(successes, n, z = 1.96) {
  if (n === 0) return { p: NaN, low: NaN, high: NaN };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

/** Tramo de habilidad de `size` puntos: 1–75, 76–150… */
export function skillBand(skill, size = 75) {
  const start = Math.floor((skill - 1) / size) * size + 1;
  return `${start}-${start + size - 1}`;
}

/**
 * Agrupa filas de crafteos (`color`, `skill_start`, `crafts`, `skill_ups`)
 * por color y tramo, y calcula p̂, su intervalo y los crafteos esperados por punto.
 */
export function summarizeCrafts(rows, bandSize = 75) {
  const cells = new Map();
  for (const r of rows) {
    if (r.crafts === "" || r.color === "") continue; // fila pendiente de medir
    const color = r.color.toLowerCase();
    if (!COLORS.includes(color)) throw new Error(`Color desconocido: ${r.color}`);
    const crafts = Number(r.crafts);
    const ups = Number(r.skill_ups);
    const skill = Number(r.skill_start);
    if (!Number.isFinite(crafts) || !Number.isFinite(ups) || !Number.isFinite(skill)) {
      throw new Error(`Fila con valores no numéricos: ${JSON.stringify(r)}`);
    }
    if (ups > crafts) throw new Error(`skill_ups (${ups}) mayor que crafts (${crafts}): ${r.recipe}`);
    const key = `${color}|${skillBand(skill, bandSize)}`;
    const cell = cells.get(key) ?? { color, band: skillBand(skill, bandSize), crafts: 0, ups: 0 };
    cell.crafts += crafts;
    cell.ups += ups;
    cells.set(key, cell);
  }
  return [...cells.values()]
    .map((c) => {
      const w = wilson(c.ups, c.crafts);
      return {
        ...c,
        p: w.p,
        low: w.low,
        high: w.high,
        halfWidth: (w.high - w.low) / 2,
        craftsPerPoint: c.ups > 0 ? c.crafts / c.ups : Infinity,
      };
    })
    .sort((a, b) => COLORS.indexOf(a.color) - COLORS.indexOf(b.color) || a.band.localeCompare(b.band, "en", { numeric: true }));
}

/** Tamaño de muestra para un semiancho `e` con proporción esperada `p`. */
export function sampleSize(e, p = 0.5, z = 1.96) {
  return Math.ceil((z * z * p * (1 - p)) / (e * e));
}

/**
 * A partir de observaciones (`recipe`, `skill`, `color`, `req_skill`) estima, por receta,
 * el intervalo en que ocurre cada cambio de color y su distancia a `req_skill`.
 */
export function colorTransitions(rows) {
  const byRecipe = new Map();
  for (const r of rows) {
    if (r.color === "" || r.skill === "") continue; // fila pendiente de medir
    const color = r.color.toLowerCase();
    if (!COLORS.includes(color)) throw new Error(`Color desconocido: ${r.color}`);
    // Varias recetas comparten nombre (p. ej. variantes de Season of Discovery): la clave es el id.
    const key = `${r.profession}|${r.recipe_id || r.recipe}`;
    const list = byRecipe.get(key) ?? { profession: r.profession, recipe: r.recipe, req: r.req_skill === "" ? null : Number(r.req_skill), obs: [] };
    list.obs.push({ skill: Number(r.skill), color });
    byRecipe.set(key, list);
  }
  const out = [];
  for (const rec of byRecipe.values()) {
    rec.obs.sort((a, b) => a.skill - b.skill);
    const transitions = {};
    for (let i = 1; i < rec.obs.length; i++) {
      const prev = rec.obs[i - 1];
      const cur = rec.obs[i];
      if (COLORS.indexOf(cur.color) < COLORS.indexOf(prev.color)) {
        throw new Error(`Color retrocede en ${rec.recipe}: ${prev.color} (${prev.skill}) → ${cur.color} (${cur.skill})`);
      }
      if (cur.color !== prev.color) {
        transitions[cur.color] = { low: prev.skill + 1, high: cur.skill };
      }
    }
    out.push({
      profession: rec.profession,
      recipe: rec.recipe,
      req: rec.req,
      transitions,
      offsets: Object.fromEntries(
        Object.entries(transitions).map(([color, t]) => [
          color,
          rec.req == null ? null : { low: t.low - rec.req, high: t.high - rec.req },
        ]),
      ),
    });
  }
  return out;
}

/** Nombre en texto aunque la API devuelva un objeto por idioma. */
export function nameOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.en_US ?? Object.values(value).find((v) => typeof v === "string") ?? "";
  return "";
}

/** Cantidad fabricada: número, `{ value }` o `{ minimum, maximum }` (rango «a-b»). */
export function quantityOf(q) {
  if (q == null) return "";
  if (typeof q === "number") return q;
  if (Number.isFinite(q.value)) return q.value;
  if (Number.isFinite(q.minimum) && Number.isFinite(q.maximum)) {
    return q.minimum === q.maximum ? q.minimum : `${q.minimum}-${q.maximum}`;
  }
  return "";
}

export const RECIPE_HEADERS = [
  "profession", "recipe_id", "recipe", "tier", "category", "crafted_item_id", "crafted_quantity",
  "reagent_count", "min_skill", "pattern_item_id", "pattern_name", "reputation", "binding",
];

/**
 * Construye los datasets CSV a partir del catálogo guardado por la sonda.
 * `professions`: [{ name, tiers: [{ name, categories: [{ name, recipes: [{ id, name }] }] }] }]
 * `recipes`: Map id → cuerpo de /recipe/{id} · `requirements`: Map recipeId → { minSkill, patternItemId, patternName, reputation, binding }
 * `patterns`: [{ id, name, skill? }] (patrones de profesión, para vendors.csv)
 */
export const EXCLUDED_CATEGORIES = ["SEASON OF DISCOVERY"];

export function buildDatasets({ professions, recipes, requirements, patterns = [], excludeCategories = EXCLUDED_CATEGORIES }) {
  const excludedSet = new Set(excludeCategories.map((c) => c.toLowerCase()));
  const excluded = [];
  const catalog = [];
  for (const p of professions) {
    const seen = new Set();
    for (const t of p.tiers ?? []) {
      for (const c of t.categories ?? []) {
        for (const r of c.recipes ?? []) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          const body = recipes.get(r.id);
          const req = requirements.get(r.id);
          const row = {
            profession: p.name,
            recipe_id: r.id,
            recipe: nameOf(body?.name ?? r.name),
            tier: nameOf(t.name),
            category: nameOf(c.name),
            crafted_item_id: body?.crafted_item?.id ?? "",
            crafted_quantity: quantityOf(body?.crafted_quantity),
            reagent_count: body ? (body.reagents ?? []).length : "",
            min_skill: req?.minSkill ?? "",
            pattern_item_id: req?.patternItemId ?? "",
            pattern_name: req?.patternName ?? "",
            reputation: req?.reputation ?? "",
            binding: req?.binding ?? "",
          };
          (excludedSet.has(row.category.toLowerCase()) ? excluded : catalog).push(row);
        }
      }
    }
  }
  catalog.sort((a, b) => a.profession.localeCompare(b.profession) || a.recipe.localeCompare(b.recipe) || a.recipe_id - b.recipe_id);
  // Un patrón se descarta solo si todas las recetas que lo usan están excluidas.
  const keptPatterns = new Set(catalog.map((r) => r.pattern_item_id).filter((x) => x !== ""));
  const droppedPatterns = new Set(excluded.map((r) => r.pattern_item_id).filter((x) => x !== "" && !keptPatterns.has(x)));
  const base = (r) => ({ profession: r.profession, recipe_id: r.recipe_id, recipe: r.recipe });
  return {
    recipes: catalog,
    crafts: catalog.map((r) => ({ date: "", ...base(r), skill_start: "", color: "", crafts: "", skill_ups: "" })),
    colors: catalog.map((r) => ({ date: "", ...base(r), req_skill: r.min_skill, skill: "", color: "" })),
    trainers: catalog
      .filter((r) => r.pattern_item_id === "")
      .map((r) => ({ date: "", ...base(r), trainer: "", zone: "", req_skill: "", cost_copper: "" }))
      .map(({ profession, recipe_id, recipe, date, trainer, zone, req_skill, cost_copper }) => ({
        date, profession, trainer, zone, recipe_id, recipe, req_skill, cost_copper,
      })),
    excluded,
    vendors: patterns
      .filter((p) => !droppedPatterns.has(p.id))
      .map((p) => ({ date: "", vendor: "", zone: "", pattern: nameOf(p.name), cost_copper: "" }))
      .sort((a, b) => a.pattern.localeCompare(b.pattern)),
  };
}

/**
 * Elige recetas para M1 (umbrales de color) repartidas por todo el rango de habilidad mínima de una profesión.
 * Divide el rango en `count` tramos y toma, por tramo, la receta con menos reactivos que no exija reputación.
 * `minReq`/`maxReq` limitan el rango (la ventana solo muestra recetas aprendidas o enseñables).
 * `rows`: filas de recipes.csv.
 */
export function selectM1(rows, { profession, count = 15, minReq = 0, maxReq = Infinity }) {
  const pool = rows
    .filter((r) => r.profession.toLowerCase() === profession.toLowerCase() && r.min_skill !== "")
    .map((r) => ({ ...r, req: Number(r.min_skill), reagents: Number(r.reagent_count) || 0 }))
    .filter((r) => r.req >= minReq && r.req <= maxReq);
  if (pool.length === 0) return [];
  const lo = Math.min(...pool.map((r) => r.req));
  const hi = Math.max(...pool.map((r) => r.req));
  const width = (hi - lo + 1) / count;
  const bins = new Map();
  for (const r of pool) {
    const bin = Math.min(count - 1, Math.floor((r.req - lo) / width));
    const best = bins.get(bin);
    const rank = (x) => [x.reputation !== "" ? 1 : 0, x.reagents, x.req];
    const better = (a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] < rb[i];
      return false;
    };
    if (!best || better(r, best)) bins.set(bin, r);
  }
  return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}

const COLOR_CODES = { o: "orange", y: "yellow", g: "green", x: "grey" };

/**
 * Expande una captura rápida de M1: una habilidad y una lista de códigos de color en el orden de la hoja
 * (`o` naranja, `y` amarillo, `g` verde, `x` gris, `-` no visible/no aprendida).
 */
export function expandCheckpoint(sheetRows, { skill, codes, date = "" }) {
  const list = codes.split(",").map((c) => c.trim().toLowerCase());
  if (list.length !== sheetRows.length) {
    throw new Error(`La hoja tiene ${sheetRows.length} recetas y diste ${list.length} colores`);
  }
  const out = [];
  list.forEach((code, i) => {
    if (code === "-" || code === "") return;
    const color = COLOR_CODES[code];
    if (!color) throw new Error(`Código de color desconocido «${code}» (usa o, y, g, x o -)`);
    const r = sheetRows[i];
    out.push({ date, profession: r.profession, recipe_id: r.recipe_id, recipe: r.recipe, req_skill: r.req_skill, skill: String(skill), color });
  });
  return out;
}

/**
 * Probabilidad de subir un punto a la habilidad `s` con una receta de umbrales amarillo `yellow` y gris `grey`
 * (naranja = habilidad < yellow → 1; gris → 0; entre ambos: (gris − s)/(gris − amarillo)). Verde no cambia la fórmula.
 */
export function skillUpChance(s, { yellow, grey }) {
  if (s < yellow) return 1;
  if (s >= grey) return 0;
  return (grey - s) / (grey - yellow);
}

/** Crafteos esperados para ir de `from` a `to` (puntos s = from … to−1): Σ 1/p(s). Infinity si algún p es 0. */
export function expectedCrafts(from, to, thresholds) {
  let total = 0;
  for (let s = from; s < to; s++) total += 1 / skillUpChance(s, thresholds);
  return total;
}
