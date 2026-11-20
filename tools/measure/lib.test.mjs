import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, wilson, skillBand, summarizeCrafts, sampleSize, colorTransitions } from "./lib.mjs";

test("parseCsv ignora comentarios y líneas vacías", () => {
  const rows = parseCsv("# c\na,b\n\n1,2\n3,4\n");
  assert.deepEqual(rows, [{ a: "1", b: "2" }, { a: "3", b: "4" }]);
});

test("parseCsv falla con columnas incorrectas", () => {
  assert.throws(() => parseCsv("a,b\n1\n"), /columnas/);
});

test("wilson: 50/100 da ≈ [0,404; 0,596]", () => {
  const w = wilson(50, 100);
  assert.equal(w.p, 0.5);
  assert.ok(Math.abs(w.low - 0.404) < 0.002);
  assert.ok(Math.abs(w.high - 0.596) < 0.002);
});

test("wilson: n=0 devuelve NaN", () => {
  assert.ok(Number.isNaN(wilson(0, 0).p));
});

test("skillBand agrupa de 75 en 75", () => {
  assert.equal(skillBand(1), "1-75");
  assert.equal(skillBand(75), "1-75");
  assert.equal(skillBand(76), "76-150");
});

test("sampleSize: ±0,10 → 97 y ±0,15 → 43", () => {
  assert.equal(sampleSize(0.1), 97);
  assert.equal(sampleSize(0.15), 43);
});

test("summarizeCrafts suma por color y tramo", () => {
  const rows = [
    { recipe: "A", color: "yellow", skill_start: "10", crafts: "20", skill_ups: "10" },
    { recipe: "B", color: "yellow", skill_start: "30", crafts: "20", skill_ups: "5" },
    { recipe: "C", color: "green", skill_start: "100", crafts: "10", skill_ups: "1" },
  ];
  const s = summarizeCrafts(rows);
  assert.equal(s.length, 2);
  assert.equal(s[0].color, "yellow");
  assert.equal(s[0].crafts, 40);
  assert.equal(s[0].ups, 15);
  assert.equal(s[0].craftsPerPoint, 40 / 15);
});

test("summarizeCrafts rechaza subidas > crafteos y colores desconocidos", () => {
  assert.throws(() => summarizeCrafts([{ recipe: "A", color: "yellow", skill_start: "1", crafts: "1", skill_ups: "2" }]), /mayor/);
  assert.throws(() => summarizeCrafts([{ recipe: "A", color: "blue", skill_start: "1", crafts: "1", skill_ups: "0" }]), /desconocido/);
});

test("colorTransitions estima intervalos y offsets respecto al requisito", () => {
  const rows = [
    { profession: "Tailoring", recipe: "R", req_skill: "65", skill: "65", color: "orange" },
    { profession: "Tailoring", recipe: "R", req_skill: "65", skill: "75", color: "orange" },
    { profession: "Tailoring", recipe: "R", req_skill: "65", skill: "85", color: "yellow" },
    { profession: "Tailoring", recipe: "R", req_skill: "65", skill: "105", color: "green" },
  ];
  const [r] = colorTransitions(rows);
  assert.deepEqual(r.transitions.yellow, { low: 76, high: 85 });
  assert.deepEqual(r.transitions.green, { low: 86, high: 105 });
  assert.deepEqual(r.offsets.yellow, { low: 11, high: 20 });
});

test("colorTransitions detecta retrocesos de color", () => {
  const rows = [
    { profession: "P", recipe: "R", req_skill: "", skill: "10", color: "green" },
    { profession: "P", recipe: "R", req_skill: "", skill: "20", color: "yellow" },
  ];
  assert.throws(() => colorTransitions(rows), /retrocede/);
});

import { splitCsvLine, toCsv, nameOf, buildDatasets } from "./lib.mjs";

test("CSV: ida y vuelta con comas y comillas", () => {
  const csv = toCsv(["a", "b"], [{ a: 'Elixir, Greater "X"', b: 2 }]);
  const [row] = parseCsv(csv);
  assert.equal(row.a, 'Elixir, Greater "X"');
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
});

test("filas pendientes (vacías) se omiten en el análisis", () => {
  assert.deepEqual(summarizeCrafts([{ recipe: "A", color: "", skill_start: "", crafts: "", skill_ups: "" }]), []);
  assert.deepEqual(colorTransitions([{ profession: "P", recipe: "A", req_skill: "5", skill: "", color: "" }]), []);
});

test("nameOf acepta texto u objeto por idioma", () => {
  assert.equal(nameOf("X"), "X");
  assert.equal(nameOf({ en_US: "X", es_MX: "Y" }), "X");
  assert.equal(nameOf(undefined), "");
});

test("buildDatasets: catálogo por profesión con requisitos y trainers sin patrón", () => {
  const professions = [
    { name: "Tailoring", tiers: [{ name: "T", categories: [{ name: "Cat", recipes: [{ id: 2, name: "B, Greater" }, { id: 1, name: "A" }] }] }] },
    { name: "Cooking", tiers: [{ name: "T", categories: [{ name: "Cat", recipes: [{ id: 2, name: "B, Greater" }] }] }] },
  ];
  const recipes = new Map([[1, { crafted_item: { id: 10 }, crafted_quantity: 2, reagents: [{}, {}] }]]);
  const requirements = new Map([[2, { minSkill: 65, patternItemId: 99, patternName: "Pattern: B", reputation: null, binding: null }]]);
  const d = buildDatasets({ professions, recipes, requirements, patterns: [{ id: 99, name: "Pattern: B" }] });
  assert.equal(d.recipes.length, 3);
  assert.ok(d.colors.every((r) => "recipe_id" in r)); // B aparece en dos profesiones
  const a = d.recipes.find((r) => r.recipe === "A");
  assert.equal(a.crafted_item_id, 10);
  assert.equal(a.reagent_count, 2);
  assert.equal(d.colors.find((r) => r.recipe === "B, Greater" && r.profession === "Tailoring").req_skill, 65);
  assert.deepEqual(d.trainers.map((r) => r.recipe), ["A"]); // solo la receta sin patrón
  assert.equal(d.vendors.length, 1);
});

import { quantityOf } from "./lib.mjs";

test("quantityOf maneja número, value y rango", () => {
  assert.equal(quantityOf(2), 2);
  assert.equal(quantityOf({ value: 3 }), 3);
  assert.equal(quantityOf({ minimum: 1, maximum: 3 }), "1-3");
  assert.equal(quantityOf({ minimum: 2, maximum: 2 }), 2);
  assert.equal(quantityOf(undefined), "");
});

test("colorTransitions distingue recetas con el mismo nombre por recipe_id", () => {
  const rows = [
    { profession: "P", recipe_id: "1", recipe: "X", req_skill: "10", skill: "10", color: "orange" },
    { profession: "P", recipe_id: "2", recipe: "X", req_skill: "50", skill: "10", color: "grey" },
    { profession: "P", recipe_id: "1", recipe: "X", req_skill: "10", skill: "30", color: "yellow" },
  ];
  assert.equal(colorTransitions(rows).length, 2);
});

test("buildDatasets excluye la categoría SoD y sus patrones exclusivos", () => {
  const professions = [
    { name: "Alchemy", tiers: [{ name: "T", categories: [
      { name: "Elixirs", recipes: [{ id: 1, name: "Lesser Arcane Elixir" }] },
      { name: "SEASON OF DISCOVERY", recipes: [{ id: 2, name: "Lesser Arcane Elixir" }, { id: 3, name: "Solo SoD" }] },
    ] }] },
  ];
  const requirements = new Map([
    [1, { minSkill: 120, patternItemId: 10, patternName: "Recipe: A" }],
    [2, { minSkill: 190, patternItemId: 11, patternName: "Recipe: A SoD" }],
    [3, { minSkill: 200, patternItemId: 10, patternName: "Recipe: A" }],
  ]);
  const patterns = [{ id: 10, name: "Recipe: A" }, { id: 11, name: "Recipe: A SoD" }];
  const d = buildDatasets({ professions, recipes: new Map(), requirements, patterns });
  assert.deepEqual(d.recipes.map((r) => r.recipe_id), [1]);
  assert.deepEqual(d.excluded.map((r) => r.recipe_id).sort(), [2, 3]);
  assert.deepEqual(d.vendors.map((v) => v.pattern), ["Recipe: A"]); // el patrón 11 era solo SoD
  const all = buildDatasets({ professions, recipes: new Map(), requirements, patterns, excludeCategories: [] });
  assert.equal(all.recipes.length, 3);
});

import { selectM1 } from "./lib.mjs";

test("selectM1 reparte por tramos y prefiere pocos reactivos sin reputación", () => {
  const mk = (id, req, reagents, reputation = "") => ({ profession: "Tailoring", recipe_id: String(id), recipe: `R${id}`, min_skill: String(req), reagent_count: String(reagents), reputation });
  const rows = [mk(1, 1, 3), mk(2, 5, 1), mk(3, 150, 2, "Friendly"), mk(4, 152, 5), mk(5, 300, 4), { ...mk(6, "", 1), min_skill: "" }];
  const out = selectM1(rows, { profession: "tailoring", count: 3 });
  assert.deepEqual(out.map((r) => r.recipe_id), ["2", "4", "5"]);
  assert.deepEqual(selectM1(rows, { profession: "Cooking" }), []);
});

test("selectM1 respeta minReq y maxReq", () => {
  const mk = (id, req) => ({ profession: "P", recipe_id: String(id), recipe: `R${id}`, min_skill: String(req), reagent_count: "1", reputation: "" });
  const rows = [mk(1, 10), mk(2, 100), mk(3, 200)];
  assert.deepEqual(selectM1(rows, { profession: "P", count: 5, maxReq: 150 }).map((r) => r.recipe_id), ["1", "2"]);
  assert.deepEqual(selectM1(rows, { profession: "P", count: 5, minReq: 150 }).map((r) => r.recipe_id), ["3"]);
});
