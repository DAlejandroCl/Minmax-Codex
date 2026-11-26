import {
  COSMETIC_SLOTS,
  ENCHANTABLE_SLOTS,
  EQUIPMENT_SLOTS,
  STAT_KEYS,
  type CharacterSnapshot,
  type EquipmentSlot,
  type EquippedItem,
  type StatKey,
  type Stats,
} from "./schemas.js";

export type GearIssue =
  | { readonly kind: "missing-enchant"; readonly slot: EquipmentSlot }
  | { readonly kind: "empty-socket"; readonly slot: EquipmentSlot; readonly count: number }
  | { readonly kind: "empty-slot"; readonly slot: EquipmentSlot };

export interface GearSummary {
  /** Nivel de objeto medio de los slots ocupados; null si no hay equipo. */
  readonly averageItemLevel: number | null;
  readonly totals: Readonly<Record<StatKey, number>>;
  readonly issues: readonly GearIssue[];
}

/** Slots que se espera tener ocupados (el resto: ranged, trinket2, offhand dependen de la clase/build). */
const REQUIRED_SLOTS: readonly EquipmentSlot[] = EQUIPMENT_SLOTS.filter(
  (s) => !["offhand", "ranged", "trinket2", ...COSMETIC_SLOTS].includes(s),
);

export function addStats(a: Stats, b: Stats): Stats {
  const out: Partial<Record<StatKey, number>> = { ...a };
  for (const key of STAT_KEYS) {
    const v = b[key];
    if (v !== undefined) out[key] = (out[key] ?? 0) + v;
  }
  return out;
}

export function bySlot(
  character: Pick<CharacterSnapshot, "equipment">,
): ReadonlyMap<EquipmentSlot, EquippedItem> {
  return new Map(character.equipment.map((e) => [e.slot, e]));
}

/** Resume el equipo: ilvl medio, estadísticas totales y carencias (hueco, encantamiento, gemas). */
export function summarizeGear(character: Pick<CharacterSnapshot, "equipment">): GearSummary {
  const slots = bySlot(character);
  const totals = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
  const issues: GearIssue[] = [];
  let levelSum = 0;
  let counted = 0;

  for (const slot of EQUIPMENT_SLOTS) {
    const item = slots.get(slot);
    if (!item) {
      if (REQUIRED_SLOTS.includes(slot)) issues.push({ kind: "empty-slot", slot });
      continue;
    }
    if (COSMETIC_SLOTS.includes(slot)) continue;
    levelSum += item.itemLevel;
    counted += 1;
    for (const key of STAT_KEYS) totals[key] += item.stats[key] ?? 0;
    if (ENCHANTABLE_SLOTS.includes(slot) && item.enchant === undefined)
      issues.push({ kind: "missing-enchant", slot });
    if (item.gems < item.sockets)
      issues.push({ kind: "empty-socket", slot, count: item.sockets - item.gems });
  }

  return {
    averageItemLevel: counted === 0 ? null : Math.round((levelSum / counted) * 10) / 10,
    totals,
    issues,
  };
}
