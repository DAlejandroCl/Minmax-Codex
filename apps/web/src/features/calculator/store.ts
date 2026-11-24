import { create } from "zustand";
import { SKILL_MAX, SKILL_MIN } from "./demo-data";
import { defaultPrices } from "./model";
import type { CalculatorInputs } from "./model";

interface Actions {
  setStartSkill(value: number): void;
  setTargetSkill(value: number): void;
  setTrainerOnly(value: boolean): void;
  setPrice(itemId: number, copper: number): void;
  setOwned(itemId: number, quantity: number): void;
  reset(): void;
}

export const initialInputs = (): CalculatorInputs => ({
  startSkill: 148,
  targetSkill: 300,
  trainerOnly: false,
  prices: defaultPrices(),
  owned: {},
});

const clampSkill = (value: number): number =>
  Number.isFinite(value) ? Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.round(value))) : SKILL_MIN;
const nonNegativeInt = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export const useCalculator = create<CalculatorInputs & Actions>()((set) => ({
  ...initialInputs(),
  setStartSkill: (value) => set({ startSkill: clampSkill(value) }),
  setTargetSkill: (value) => set({ targetSkill: clampSkill(value) }),
  setTrainerOnly: (value) => set({ trainerOnly: value }),
  setPrice: (itemId, copper) =>
    set((s) => ({ prices: { ...s.prices, [itemId]: nonNegativeInt(copper) } })),
  setOwned: (itemId, quantity) =>
    set((s) => ({ owned: { ...s.owned, [itemId]: nonNegativeInt(quantity) } })),
  reset: () => set(initialInputs()),
}));
