import type { PlanStep } from "@minmax-codex/optimizer";

/** Barra de la ruta completa: un segmento por receta, proporcional a los puntos que aporta. Es decorativa. */
export function RouteBar({ steps }: { readonly steps: readonly PlanStep[] }) {
  const first = steps[0];
  const last = steps.at(-1);
  if (!first || !last) return null;
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-sm">
        {steps.map((step, i) => (
          <div
            key={`${step.recipeId}-${i}`}
            className={`route-segment min-w-1 ${i % 2 === 0 ? "bg-gold" : "bg-line-strong"}`}
            style={{ flexGrow: Math.max(1, step.toSkill - step.fromSkill), flexBasis: 0 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-sm tabular-nums text-muted">
        <span>{first.fromSkill}</span>
        <span>{last.toSkill}</span>
      </div>
    </div>
  );
}
