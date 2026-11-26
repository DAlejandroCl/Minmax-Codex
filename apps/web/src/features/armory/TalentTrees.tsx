import {
  decrease,
  increase,
  pointsAtLevel,
  rankOf,
  spentInTree,
  spentTotal,
  whyCannotDecrease,
  whyCannotIncrease,
  type BlockReason,
  type TalentAllocation,
  type TalentNode,
  type TalentTree,
} from "@minmax-codex/shared";
import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  readonly trees: readonly TalentTree[];
  readonly level: number;
  /** Asignación aplicada al personaje (la que viene del snapshot). */
  readonly applied: TalentAllocation;
}

type NodeState = "maxed" | "available" | "locked";

const STATE_CLASS: Record<NodeState, string> = {
  maxed: "border-gold bg-raised text-gold",
  available: "border-gold/70 bg-panel text-text",
  locked: "border-line bg-bg text-muted",
};

function TreeView({
  tree,
  draft,
  left,
  onChange,
  onBlocked,
}: {
  tree: TalentTree;
  draft: TalentAllocation;
  left: number;
  onChange: (next: TalentAllocation) => void;
  onBlocked: (reason: BlockReason) => void;
}) {
  const { t } = useTranslation();
  const rows = Math.max(...tree.nodes.map((n) => n.row)) + 1;
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));

  const add = (n: TalentNode) => {
    const why = whyCannotIncrease(tree, draft, n.id, left);
    if (why) onBlocked(why);
    else onChange(increase(tree, draft, n.id, left));
  };
  const remove = (n: TalentNode) => {
    const why = whyCannotDecrease(tree, draft, n.id);
    if (why) onBlocked(why);
    else onChange(decrease(tree, draft, n.id));
  };

  const stateOf = (n: TalentNode): NodeState => {
    if (rankOf(draft, n.id) >= n.maxRank) return "maxed";
    return whyCannotIncrease(tree, draft, n.id, 1) === null ? "available" : "locked";
  };

  return (
    <section aria-label={tree.name} className="panel min-w-0 p-3">
      <h3 className="mb-3 flex items-baseline justify-between gap-2 font-bold">
        <span>{tree.name}</span>
        <span className="text-sm font-normal text-muted">{spentInTree(tree, draft)}</span>
      </h3>
      <div
        className="relative grid justify-center gap-x-3 gap-y-3"
        style={{
          gridTemplateColumns: "repeat(4, 3rem)",
          gridTemplateRows: `repeat(${rows}, 3rem)`,
        }}
      >
        {tree.nodes.map((n) => {
          const req = n.requires ? byId.get(n.requires) : undefined;
          if (!req || req.col !== n.col) return null;
          const met = rankOf(draft, req.id) >= req.maxRank;
          return (
            <span
              key={`arrow-${n.id}`}
              aria-hidden="true"
              className={`z-0 w-1 justify-self-center ${met ? "bg-gold" : "bg-line-strong"}`}
              style={{ gridColumn: n.col + 1, gridRow: `${req.row + 1} / ${n.row + 1}` }}
            />
          );
        })}
        {tree.nodes.map((n) => {
          const rank = rankOf(draft, n.id);
          const state = stateOf(n);
          const req = n.requires ? byId.get(n.requires) : undefined;
          const label =
            t("talents.node", { name: n.name, rank, max: n.maxRank }) +
            `, ${t(`talents.state.${state}`)}` +
            (req ? `. ${t("talents.requires", { name: req.name })}` : "");
          return (
            <button
              key={n.id}
              type="button"
              aria-label={label}
              title={n.name}
              style={{ gridColumn: n.col + 1, gridRow: n.row + 1 }}
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded border-2 text-xs font-bold ${STATE_CLASS[state]}`}
              onClick={() => add(n)}
              onContextMenu={(e: MouseEvent) => {
                e.preventDefault();
                remove(n);
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (["Backspace", "Delete", "-"].includes(e.key)) {
                  e.preventDefault();
                  remove(n);
                }
              }}
            >
              <span aria-hidden="true">{n.name.slice(0, 2)}</span>
              <span
                aria-hidden="true"
                className="absolute -bottom-2 -right-2 rounded bg-bg px-1 text-[0.7rem] tabular-nums text-gold"
              >
                {rank}/{n.maxRank}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TalentTrees({ trees, level, applied }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TalentAllocation>(applied);
  const [saved, setSaved] = useState<TalentAllocation>(applied);
  const [message, setMessage] = useState("");
  const hintId = useId();

  const total = pointsAtLevel(level);
  const left = total - spentTotal(trees, draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const change = (next: TalentAllocation) => {
    setDraft(next);
    setMessage("");
  };

  return (
    <div className="flex flex-col gap-4" aria-describedby={hintId}>
      <p role="note" className="panel p-3 text-sm text-muted">
        {t("talents.demoNotice")}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("talents.tablist")} className="flex gap-2">
          <button type="button" role="tab" aria-selected="true" className="btn btn-primary">
            {t("talents.primary")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            aria-disabled="true"
            className="btn opacity-60"
          >
            {t("talents.secondaryLocked")}
          </button>
        </div>
        <p aria-live="polite">
          {t("talents.unspent")}: <strong className="text-gold tabular-nums">{left}</strong>
        </p>
      </div>
      <p id={hintId} className="text-sm text-muted">
        {t("talents.hint")}
      </p>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        {trees.map((tree) => (
          <TreeView
            key={tree.id}
            tree={tree}
            draft={draft}
            left={left}
            onChange={change}
            onBlocked={(reason) => setMessage(t(`talents.blocked.${reason}`))}
          />
        ))}
      </div>
      <p role="status" className="min-h-6 text-sm">
        {message}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!dirty}
          onClick={() => {
            setSaved(draft);
            setMessage(t("talents.applied"));
          }}
        >
          {t("talents.apply")}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!dirty}
          onClick={() => {
            setDraft(saved);
            setMessage("");
          }}
        >
          {t("talents.reset")}
        </button>
      </div>
    </div>
  );
}
