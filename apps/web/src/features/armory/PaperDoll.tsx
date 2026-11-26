import { type EquipmentSlot, type EquippedItem, type ItemQuality } from "@minmax-codex/shared";
import { useTranslation } from "react-i18next";

const BORDER: Record<ItemQuality, string> = {
  poor: "border-q-poor",
  common: "border-q-common",
  uncommon: "border-q-uncommon",
  rare: "border-q-rare",
  epic: "border-q-epic",
  legendary: "border-q-legendary",
};
const TEXT: Record<ItemQuality, string> = {
  poor: "text-q-poor",
  common: "text-q-common",
  uncommon: "text-q-uncommon",
  rare: "text-q-rare",
  epic: "text-q-epic",
  legendary: "text-q-legendary",
};

export const LEFT_SLOTS: readonly EquipmentSlot[] = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "shirt",
  "tabard",
  "wrist",
];
export const RIGHT_SLOTS: readonly EquipmentSlot[] = [
  "hands",
  "waist",
  "legs",
  "feet",
  "finger1",
  "finger2",
  "trinket1",
  "trinket2",
];
export const WEAPON_SLOTS: readonly EquipmentSlot[] = ["mainhand", "offhand", "ranged"];

interface Props {
  readonly items: ReadonlyMap<EquipmentSlot, EquippedItem>;
  readonly selected: EquipmentSlot | null;
  readonly onSelect: (slot: EquipmentSlot) => void;
  readonly figure: string;
  readonly itemName: (item: EquippedItem) => string;
}

function Slot({
  slot,
  item,
  side,
  selected,
  onSelect,
  itemName,
}: {
  slot: EquipmentSlot;
  item: EquippedItem | undefined;
  side: "left" | "right" | "bottom";
  selected: boolean;
  onSelect: () => void;
  itemName: (item: EquippedItem) => string;
}) {
  const { t } = useTranslation();
  const slotLabel = t(`armory.slots.${slot}`);
  const label = item
    ? `${slotLabel}: ${itemName(item)}, ${t(`armory.quality.${item.quality}`)}, ${t("armory.ilvl", { level: item.itemLevel })}`
    : `${slotLabel}: ${t("armory.empty")}`;
  const box = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={item ? itemName(item) : slotLabel}
      onClick={onSelect}
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded border-2 bg-bg text-sm font-bold aria-pressed:ring-2 aria-pressed:ring-gold ${
        item
          ? `${BORDER[item.quality]} ${TEXT[item.quality]}`
          : "border-dashed border-line text-muted"
      }`}
    >
      <span aria-hidden="true">{item ? itemName(item).slice(0, 2) : slotLabel.slice(0, 2)}</span>
    </button>
  );
  const ilvl = item ? (
    <span aria-hidden="true" className={`w-8 text-sm font-bold tabular-nums ${TEXT[item.quality]}`}>
      {item.itemLevel}
    </span>
  ) : (
    <span aria-hidden="true" className="w-8" />
  );
  if (side === "bottom")
    return (
      <div className="flex flex-col items-center gap-1">
        {box}
        {item ? (
          <span
            aria-hidden="true"
            className={`text-sm font-bold tabular-nums ${TEXT[item.quality]}`}
          >
            {item.itemLevel}
          </span>
        ) : null}
      </div>
    );
  return (
    <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
      {box}
      {ilvl}
    </div>
  );
}

/** Muñeco de equipo: columna izquierda, columna derecha y armas debajo, como la ventana de personaje del juego. */
export function PaperDoll({ items, selected, onSelect, figure, itemName }: Props) {
  const { t } = useTranslation();
  const slotsOf = (list: readonly EquipmentSlot[], side: "left" | "right") =>
    list.map((slot) => (
      <Slot
        key={slot}
        slot={slot}
        item={items.get(slot)}
        side={side}
        selected={selected === slot}
        onSelect={() => onSelect(slot)}
        itemName={itemName}
      />
    ));
  return (
    <div className="panel flex flex-col items-center gap-4 p-4">
      <div className="grid w-full max-w-xl grid-cols-[auto_1fr_auto] gap-3">
        <div className="flex flex-col gap-2">{slotsOf(LEFT_SLOTS, "left")}</div>
        <div
          role="img"
          aria-label={figure}
          className="flex min-h-64 items-center justify-center rounded border border-line bg-bg/60 p-2 text-center text-sm text-muted"
        >
          {figure}
        </div>
        <div className="flex flex-col gap-2">{slotsOf(RIGHT_SLOTS, "right")}</div>
      </div>
      <div role="group" aria-label={t("armory.bottomRow")} className="flex justify-center gap-4">
        {WEAPON_SLOTS.map((slot) => (
          <Slot
            key={slot}
            slot={slot}
            item={items.get(slot)}
            side="bottom"
            selected={selected === slot}
            onSelect={() => onSelect(slot)}
            itemName={itemName}
          />
        ))}
      </div>
    </div>
  );
}
