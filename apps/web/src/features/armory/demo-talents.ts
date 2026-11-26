import { TalentTreeSchema, type TalentTree } from "@minmax-codex/shared";

type Spec = readonly [name: string, row: number, col: number, maxRank: number, requires?: string];

/** Construye un árbol desde una tabla compacta; el id es "<árbol>-<n>" y `requires` indexa esa tabla. */
function build(id: string, name: string, specs: readonly Spec[]): TalentTree {
  return TalentTreeSchema.parse({
    id,
    name,
    nodes: specs.map(([n, row, col, maxRank, requires]) => ({
      id: `${id}-${n}`,
      name: n,
      row,
      col,
      maxRank,
      ...(requires === undefined ? {} : { requires: `${id}-${requires}` }),
    })),
  });
}

/** Árboles de ejemplo con nombres inventados. Los reales llegarán de la API (ver docs/12). */
export const demoTrees: readonly TalentTree[] = [
  build("estudio", "Estudio", [
    ["Tinta fresca", 0, 0, 3],
    ["Pulso lento", 0, 1, 2],
    ["Margen amplio", 0, 2, 5],
    ["Letra firme", 1, 0, 3],
    ["Índice vivo", 1, 1, 1],
    ["Glosa", 1, 3, 2],
    ["Nota al pie", 2, 1, 3, "Índice vivo"],
    ["Cita exacta", 2, 2, 2],
    ["Archivo vivo", 3, 0, 1],
    ["Sello", 3, 3, 3],
    ["Biblioteca", 4, 1, 5, "Nota al pie"],
    ["Opus", 5, 1, 1, "Biblioteca"],
  ]),
  build("brasas", "Brasas", [
    ["Chispa", 0, 0, 5],
    ["Yesca", 0, 2, 3],
    ["Ceniza fértil", 1, 1, 2],
    ["Llama baja", 1, 2, 3],
    ["Fuelle", 2, 0, 2],
    ["Horno", 2, 2, 1],
    ["Fragua", 3, 1, 3, "Ceniza fértil"],
    ["Calor blanco", 3, 2, 2],
    ["Tizón", 4, 0, 3],
    ["Hoguera", 4, 3, 1],
    ["Pira", 5, 2, 5],
  ]),
  build("mareas", "Mareas", [
    ["Rocío", 0, 1, 3],
    ["Espuma", 0, 3, 2],
    ["Corriente", 1, 0, 3],
    ["Remanso", 1, 2, 1],
    ["Oleaje", 2, 1, 5],
    ["Bruma", 2, 3, 3],
    ["Reflujo", 3, 0, 2, "Corriente"],
    ["Marea alta", 3, 2, 1],
    ["Abismo", 4, 1, 3],
    ["Arrecife", 4, 3, 2],
    ["Tormenta", 5, 0, 1, "Reflujo"],
  ]),
];

/** Asignación de ejemplo del personaje demo (nivel 40 → 31 puntos; gasta 16). */
export const demoAllocation: Readonly<Record<string, number>> = {
  "estudio-Tinta fresca": 3,
  "estudio-Pulso lento": 2,
  "estudio-Letra firme": 3,
  "estudio-Índice vivo": 1,
  "estudio-Glosa": 2,
  "estudio-Nota al pie": 3,
  "estudio-Cita exacta": 2,
};
