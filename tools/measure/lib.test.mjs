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
