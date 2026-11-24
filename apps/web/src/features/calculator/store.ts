import { create } from "zustand";
import { DEMO_ITEMS, SKILL_MAX, SKILL_MIN } from "./demo-data";
import { defaultPrices } from "./model";
import type { CalculatorInputs } from "./model";
import type { PriceMeta } from "./prices";

const DAY_MS = 86_400_000;

interface Actions {
  setStartSkill(value: number): void;
  setTargetSkill(value: number): void;
  setTrainerOnly(value: boolean): void;
  setPrice(itemId: number, copper: number): void;
  /** Vuelve al precio observado de origen, con su antigüedad. */
  restorePrice(itemId: number): void;
  setOwned(itemId: number, quantity: number): void;
  reset(): void;
}

interface State extends CalculatorInputs {
  /** Edad y origen de cada precio (no influye en el cálculo, solo en los avisos). */
  readonly priceMeta: Readonly<Record<number, PriceMeta>>;
}

export const initialInputs = (): CalculatorInputs => ({
  startSkill: 148,
  targetSkill: 300,
  trainerOnly: false,
  prices: defaultPrices(),
  owned: {},
});

const metaFor = (item: (typeof DEMO_ITEMS)[number], now: number): PriceMeta => ({
  observedAt: item.observedDaysAgo === undefined ? null : now - item.observedDaysAgo * DAY_MS,
  overridden: false,
});

export const initialMeta = (now: number = Date.now()): Record<number, PriceMeta> =>
  Object.fromEntries(DEMO_ITEMS.map((item) => [item.id, metaFor(item, now)]));

const clampSkill = (value: number): number =>
  Number.isFinite(value) ? Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.round(value))) : SKILL_MIN;
const nonNegativeInt = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export const useCalculator = create<State & Actions>()((set) => ({
  ...initialInputs(),
  priceMeta: initialMeta(),
  setStartSkill: (value) => set({ startSkill: clampSkill(value) }),
  setTargetSkill: (value) => set({ targetSkill: clampSkill(value) }),
  setTrainerOnly: (value) => set({ trainerOnly: value }),
  setPrice: (itemId, copper) =>
    set((s) => ({
      prices: { ...s.prices, [itemId]: nonNegativeInt(copper) },
      priceMeta: { ...s.priceMeta, [itemId]: { observedAt: Date.now(), overridden: true } },
    })),
  restorePrice: (itemId) =>
    set((s) => {
      const item = DEMO_ITEMS.find((i) => i.id === itemId);
      if (!item) return s;
      return {
        prices: { ...s.prices, [itemId]: item.defaultPrice },
        priceMeta: { ...s.priceMeta, [itemId]: metaFor(item, Date.now()) },
      };
    }),
  setOwned: (itemId, quantity) =>
    set((s) => ({ owned: { ...s.owned, [itemId]: nonNegativeInt(quantity) } })),
  reset: () => set({ ...initialInputs(), priceMeta: initialMeta() }),
}));
