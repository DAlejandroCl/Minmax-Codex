/**
 * Analiza las mediciones in-game de SP-4.
 *
 *   pnpm --filter @minmax-codex/measure analyze crafts  data/crafts.csv [--band=75]
 *   pnpm --filter @minmax-codex/measure analyze colors  data/colors.csv
 *
 * Plantillas en templates/. Los datos reales van en data/ (ignorado por git).
 */
import { readFileSync } from "node:fs";
import { parseCsv, summarizeCrafts, colorTransitions } from "./lib.mjs";

const [mode, file, ...flags] = process.argv.slice(2).filter((a) => a !== "--");
if (!["crafts", "colors"].includes(mode) || !file) {
  console.error("Uso: analyze <crafts|colors> <archivo.csv> [--band=75]");
  process.exit(1);
}
const band = Number(flags.find((f) => f.startsWith("--band="))?.split("=")[1] ?? 75);
const rows = parseCsv(readFileSync(file, "utf8"));
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : "—");

if (mode === "crafts") {
  console.log("color   tramo     crafteos  subidas  p̂     IC95 %          ±     crafteos/punto");
  for (const c of summarizeCrafts(rows, band)) {
    console.log(
      `${c.color.padEnd(7)} ${c.band.padEnd(9)} ${String(c.crafts).padStart(8)} ${String(c.ups).padStart(8)}  ${fmt(c.p)}  [${fmt(c.low)}, ${fmt(c.high)}]  ${fmt(c.halfWidth)}  ${fmt(c.craftsPerPoint)}`,
    );
  }
  console.log("\nObjetivo: ± ≤ 0,15 por celda (≈ 43 crafteos) o ± ≤ 0,10 (≈ 97).");
} else {
  for (const r of colorTransitions(rows)) {
    console.log(`${r.profession} · ${r.recipe} (req ${r.req ?? "?"})`);
    for (const [color, t] of Object.entries(r.transitions)) {
      const o = r.offsets[color];
      console.log(
        `  → ${color}: habilidad ${t.low}–${t.high}${o ? `  (req + ${o.low}…${o.high})` : ""}`,
      );
    }
  }
}
