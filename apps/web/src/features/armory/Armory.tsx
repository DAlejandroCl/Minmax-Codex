import {
  summarizeGear,
  bySlot,
  STAT_KEYS,
  type EquipmentSlot,
  type EquippedItem,
  type GearIssue,
} from "@minmax-codex/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageSwitcher, useLocale } from "../../components/LanguageSwitcher";
import { demoCharacter } from "./demo-character";
import { demoAllocation, demoTrees } from "./demo-talents";
import { PaperDoll } from "./PaperDoll";
import { TalentTrees } from "./TalentTrees";

const QUALITY_CLASS = {
  poor: "text-q-poor",
  common: "text-q-common",
  uncommon: "text-q-uncommon",
  rare: "text-q-rare",
  epic: "text-q-epic",
  legendary: "text-q-legendary",
} as const;

function Detail({
  slot,
  item,
  name,
}: {
  slot: EquipmentSlot;
  item: EquippedItem | undefined;
  name: string;
}) {
  const { t } = useTranslation();
  const slotLabel = t(`armory.slots.${slot}`);
  return (
    <section
      aria-label={t("armory.selected", { slot: slotLabel })}
      className="panel flex flex-col gap-1 p-4"
    >
      <h3 className="text-sm text-muted">{slotLabel}</h3>
      {item ? (
        <>
          <p className={`font-semibold ${QUALITY_CLASS[item.quality]}`}>{name}</p>
          <p className="text-sm">
            {t(`armory.quality.${item.quality}`)} · {t("armory.ilvl", { level: item.itemLevel })}
          </p>
          <p className="text-sm text-muted">
            {item.enchant ? t("armory.enchant", { text: item.enchant }) : t("armory.noEnchant")}
          </p>
          {item.sockets > 0 && (
            <p className="text-sm text-muted">
              {t("armory.gemsLabel")}:{" "}
              {t("armory.sockets", { filled: item.gems, total: item.sockets })}
            </p>
          )}
          <dl className="mt-1 grid grid-cols-2 gap-x-4 text-sm" aria-label={t("armory.statsLabel")}>
            {STAT_KEYS.filter((k) => (item.stats[k] ?? 0) > 0).map((k) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted">{t(`armory.stats.${k}`)}</dt>
                <dd className="tabular-nums">{item.stats[k]}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-muted">{t("armory.empty")}</p>
      )}
    </section>
  );
}

export default function Armory() {
  const { t } = useTranslation();
  const c = demoCharacter;
  const slots = bySlot(c);
  const summary = summarizeGear(c);
  const locale = useLocale();
  const [tab, setTab] = useState<"gear" | "talents">("gear");
  const [selected, setSelected] = useState<EquipmentSlot | null>(null);
  const itemName = (i: EquippedItem) => (locale === "es" && i.name.es ? i.name.es : i.name.en);

  const issueText = (i: GearIssue): string => {
    const slot = t(`armory.slots.${i.slot}`);
    return i.kind === "empty-socket"
      ? t("armory.issue.empty-socket", { slot, count: i.count })
      : t(`armory.issue.${i.kind}`, { slot });
  };

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex max-w-5xl flex-col gap-6 p-4 outline-none sm:p-6"
    >
      <title>{t("armory.pageTitle")}</title>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/">Minmax Codex</Link>
          <h1 className="text-3xl font-bold text-gold">{t("armory.title")}</h1>
        </div>
        <LanguageSwitcher />
      </header>
      <p role="note" className="panel p-3 text-sm text-muted">
        {t("armory.demoNotice")}
      </p>

      <section aria-labelledby="armory-summary" className="panel flex flex-col gap-3 p-4">
        <h2 id="armory-summary" className="text-xl font-bold">
          {c.name} {c.surname}
        </h2>
        <p>{t("armory.level", { level: c.level, class: t(`armory.classes.${c.classId}`) })}</p>
        <p>
          {t("armory.avgIlvl")}: <strong>{summary.averageItemLevel ?? t("armory.noGear")}</strong>
        </p>
        <h3 className="font-bold">{t("armory.totals")}</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {STAT_KEYS.filter((k) => summary.totals[k] > 0).map((k) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-muted">{t(`armory.stats.${k}`)}</dt>
              <dd className="tabular-nums">{summary.totals[k]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div role="tablist" aria-label={t("armory.tabs")} className="flex gap-2">
        {(["gear", "talents"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className="btn aria-selected:border-gold aria-selected:bg-gold aria-selected:text-gold-ink"
          >
            {id === "gear" ? t("armory.tabGear") : t("armory.tabTalents")}
          </button>
        ))}
      </div>

      {tab === "talents" ? (
        <div role="tabpanel" id="panel-talents" aria-labelledby="tab-talents">
          <TalentTrees trees={demoTrees} level={c.level} applied={demoAllocation} />
        </div>
      ) : null}

      <div
        role="tabpanel"
        id="panel-gear"
        aria-labelledby="tab-gear"
        hidden={tab !== "gear"}
        className="grid min-w-0 gap-6 lg:grid-cols-[1fr_20rem]"
      >
        <section aria-labelledby="armory-equipment" className="flex min-w-0 flex-col gap-4">
          <h2 id="armory-equipment" className="text-xl font-bold">
            {t("armory.equipment")}
          </h2>
          <PaperDoll
            items={slots}
            selected={selected}
            onSelect={setSelected}
            figure={`${c.name} ${c.surname} · ${t("armory.level", { level: c.level, class: t(`armory.classes.${c.classId}`) })}`}
            itemName={itemName}
          />
          {selected ? (
            <Detail
              slot={selected}
              item={slots.get(selected)}
              name={slots.get(selected) ? itemName(slots.get(selected) as EquippedItem) : ""}
            />
          ) : (
            <p className="text-muted">{t("armory.pickSlot")}</p>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="armory-issues" className="panel p-4">
            <h2 id="armory-issues" className="mb-2 text-xl font-bold">
              {t("armory.issuesTitle")}
            </h2>
            {summary.issues.length === 0 ? (
              <p>{t("armory.noIssues")}</p>
            ) : (
              <ul className="flex flex-col gap-1 pl-5">
                {summary.issues.map((i) => (
                  <li key={`${i.kind}-${i.slot}`}>{issueText(i)}</li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="armory-professions" className="panel p-4">
            <h2 id="armory-professions" className="mb-2 text-xl font-bold">
              {t("armory.professions")}
            </h2>
            <ul className="flex list-none flex-col gap-1 p-0">
              {c.professions.map((p) => (
                <li key={p.professionId} className="flex justify-between gap-2">
                  <span>{locale === "es" && p.name.es ? p.name.es : p.name.en}</span>
                  <span className="tabular-nums">
                    {t("armory.skill", { skill: p.skill, max: p.max })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
