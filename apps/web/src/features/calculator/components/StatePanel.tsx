import type { ReactNode } from "react";

interface Props {
  readonly tone: "info" | "warning" | "error";
  readonly title: string;
  readonly children: ReactNode;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

const BORDER = {
  info: "border-l-gold",
  warning: "border-l-diff-yellow",
  error: "border-l-danger",
} as const;

/** Estado vacío, aviso o error: explica qué pasa y, si se puede, ofrece la acción para salir de él. */
export function StatePanel({ tone, title, children, action }: Props) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`panel flex flex-col gap-2 border-l-4 p-4 ${BORDER[tone]}`}
    >
      <p className="text-lg font-bold [font-family:var(--font-display)]">{title}</p>
      <div className="text-sm text-muted">{children}</div>
      {action && (
        <button type="button" className="btn btn-primary self-start" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
