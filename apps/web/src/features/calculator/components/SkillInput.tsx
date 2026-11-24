import { useState } from "react";
import { SKILL_MAX, SKILL_MIN } from "../demo-data";

interface Props {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
  readonly invalid: boolean;
  readonly describedBy?: string;
}

/**
 * Campo numérico con borrador de texto: se puede borrar y reescribir sin que el valor salte,
 * solo se confirman números válidos, y al salir del campo se muestra el valor normalizado.
 */
export function SkillInput({ id, label, value, onCommit, invalid, describedBy }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={SKILL_MIN}
        max={SKILL_MAX}
        value={draft ?? String(value)}
        aria-invalid={invalid}
        {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
        className="field w-28"
        onChange={(e) => {
          setDraft(e.target.value);
          if (Number.isFinite(e.target.valueAsNumber)) onCommit(e.target.valueAsNumber);
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}
