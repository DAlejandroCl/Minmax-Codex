import { difficultyOf } from "../model";
import type { Difficulty } from "../model";
import { percent } from "../format";

const TONE: Record<Difficulty, string> = {
  orange: "text-diff-orange",
  yellow: "text-diff-yellow",
  green: "text-diff-green",
  grey: "text-diff-grey",
};

/** Probabilidad de subir de nivel con el color de dificultad del juego; el porcentaje evita depender solo del color. */
export function DifficultyChip({
  label,
  chance,
}: {
  readonly label: string;
  readonly chance: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-semibold tabular-nums ${TONE[difficultyOf(chance)]}`}
      >
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-current" />
        {percent(chance)}
      </span>
    </span>
  );
}
