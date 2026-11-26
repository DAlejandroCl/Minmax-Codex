import { describe, expect, it } from "vitest";
import { summarizeGear } from "./armory.js";
import { CharacterSnapshotSchema, EquippedItemSchema, type EquippedItem } from "./schemas.js";

const item = (over: Partial<EquippedItem> & Pick<EquippedItem, "slot">): EquippedItem =>
  EquippedItemSchema.parse({
    itemId: 1000,
    name: { en: "Objeto de prueba" },
    quality: "rare",
    itemLevel: 50,
    stats: {},
    ...over,
  });

describe("summarizeGear", () => {
  it("sin equipo: ilvl nulo y todos los huecos obligatorios señalados", () => {
    const s = summarizeGear({ equipment: [] });
    expect(s.averageItemLevel).toBeNull();
    expect(s.issues.every((i) => i.kind === "empty-slot")).toBe(true);
    expect(s.issues.some((i) => i.kind === "empty-slot" && i.slot === "offhand")).toBe(false);
  });

  it("suma estadísticas y calcula el ilvl medio", () => {
    const s = summarizeGear({
      equipment: [
        item({ slot: "head", itemLevel: 60, stats: { stamina: 10, armor: 100 }, enchant: "x" }),
        item({ slot: "neck", itemLevel: 51, stats: { stamina: 5 } }),
      ],
    });
    expect(s.averageItemLevel).toBe(55.5);
    expect(s.totals.stamina).toBe(15);
    expect(s.totals.armor).toBe(100);
    expect(s.totals.strength).toBe(0);
  });

  it("señala encantamiento ausente solo donde se puede encantar, y gemas vacías", () => {
    const s = summarizeGear({
      equipment: [
        item({ slot: "neck" }),
        item({ slot: "chest", sockets: 2, gems: 1 }),
        item({ slot: "legs", enchant: "ok" }),
      ],
    });
    expect(s.issues).toContainEqual({ kind: "missing-enchant", slot: "chest" });
    expect(s.issues).not.toContainEqual({ kind: "missing-enchant", slot: "neck" });
    expect(s.issues).not.toContainEqual({ kind: "missing-enchant", slot: "legs" });
    expect(s.issues).toContainEqual({ kind: "empty-socket", slot: "chest", count: 1 });
  });
});

describe("CharacterSnapshotSchema", () => {
  const base = {
    name: "Diego",
    surname: "Ladino",
    classId: "mage",
    level: 40,
    takenAt: "2026-11-25T12:00:00Z",
    equipment: [],
    professions: [],
  };
  it("acepta un personaje válido", () => {
    expect(CharacterSnapshotSchema.safeParse(base).success).toBe(true);
  });
  it.each([
    ["sin apellido", { surname: " " }],
    ["clase desconocida", { classId: "monk" }],
    ["nivel fuera de rango", { level: 61 }],
    ["fecha inválida", { takenAt: "ayer" }],
    ["slot repetido", { equipment: [item({ slot: "head" }), item({ slot: "head", itemId: 2 })] }],
    [
      "skill sobre el máximo",
      { professions: [{ professionId: 1, name: { en: "x" }, skill: 301, max: 300 }] },
    ],
  ])("rechaza %s", (_label, patch) => {
    expect(CharacterSnapshotSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
});
