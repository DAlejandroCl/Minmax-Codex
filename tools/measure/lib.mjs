/** Funciones puras para analizar las mediciones in-game de SP-4. */

export const COLORS = ["orange", "yellow", "green", "grey"];

/** Parsea un CSV simple (sin comillas); ignora líneas vacías y comentarios (#). */
export function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
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
    const color = r.color.toLowerCase();
    if (!COLORS.includes(color)) throw new Error(`Color desconocido: ${r.color}`);
    const key = `${r.profession}|${r.recipe}`;
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
