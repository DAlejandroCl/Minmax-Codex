import {
  summarizeGear,
  bySlot,
  EQUIPMENT_SLOTS,
  STAT_KEYS,
  type EquippedItem,
  type GearIssue,
} from "@minmax-codex/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageSwitcher, useLocale } from "../../components/LanguageSwitcher";
import { demoCharacter } from "./demo-character";

const QUALITY_CLASS = {
  poor: "text-q-poor",
  common: "text-q-common",
  uncommon: "text-q-uncommon",
  rare: "text-q-rare",
  epic: "text-q-epic",
  legendary: "text-q-legendary",
} as const;

function SlotCard({ slot, item }: { slot: string; item: EquippedItem | undefined }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const slotLabel = t(`armory.slots.${slot}`);
  if (!item) {
    return (
      <li className="panel flex min-w-0 flex-col gap-1 border-dashed p-3">
        <span className="text-sm text-muted">{slotLabel}</span>
        <span className="text-muted">{t("armory.empty")}</span>
      </li>
    );
  }
  const name = locale === "es" && item.name.es ? item.name.es : item.name.en;
  return (
    <li className="panel flex min-w-0 flex-col gap-1 p-3">
      <span className="text-sm text-muted">{slotLabel}</span>
      <span className={`break-words font-semibold ${QUALITY_CLASS[item.quality]}`}>
        {name}
        <span className="sr-only"> ({t(`armory.quality.${item.quality}`)})</span>
      </span>
      <span className="text-sm">{t("armory.ilvl", { level: item.itemLevel })}</span>
      <span className="text-sm text-muted">
        {item.enchant ? t("armory.enchant", { text: item.enchant }) : t("armory.noEnchant")}
      </span>
      {item.sockets > 0 && (
        <span className="text-sm text-muted">
          {t("armory.sockets", { filled: item.gems, total: item.sockets })}
        </span>
      )}
    </li>
  );
}

export default function Armory() {
  const { t } = useTranslation();
  const c = demoCharacter;
  const slots = bySlot(c);
  const summary = summarizeGear(c);
  const locale = useLocale();

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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="armory-equipment" className="min-w-0">
          <h2 id="armory-equipment" className="mb-3 text-xl font-bold">
            {t("armory.equipment")}
          </h2>
          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
            {EQUIPMENT_SLOTS.map((slot) => (
              <SlotCard key={slot} slot={slot} item={slots.get(slot)} />
            ))}
          </ul>
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
